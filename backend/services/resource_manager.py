"""
Resource Manager Service for ADA Platform
Handles compute resource allocation, job scheduling, and resource isolation
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import docker
import psutil
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.compute import ComputeInstance, ResourceAllocation, ResourceQuota, ResourceUsageLog
from models.job import ModelJob
from models.user import User
from models.team import Team
from core.database import get_db

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    QUEUED = "queued"
    ALLOCATING = "allocating"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ResourceType(Enum):
    CPU = "cpu"
    GPU = "gpu"
    MEMORY = "memory"
    STORAGE = "storage"


@dataclass
class ResourceRequirements:
    cpu_cores: int
    memory_gb: int
    gpu_count: int = 0
    gpu_type: Optional[str] = None
    storage_gb: int = 10
    max_duration_hours: int = 24
    priority: int = 1
    preemptible: bool = True
    isolation_level: str = "standard"


@dataclass
class AllocationResult:
    success: bool
    allocation_id: Optional[str] = None
    instance_id: Optional[str] = None
    container_id: Optional[str] = None
    estimated_cost: Optional[int] = None
    error_message: Optional[str] = None


class ResourceManager:
    """Manages compute resources, job scheduling, and resource isolation"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.docker_client = docker.from_env()
        self.job_queue = asyncio.Queue()
        self.active_allocations = {}
        self.monitoring_tasks = {}
        self._initialize_resource_pools()
    
    def _initialize_resource_pools(self):
        """Initialize available compute instances and resource pools"""
        with self.db_session_factory() as db:
            # Check if we have compute instances, if not, create default ones
            instances = db.query(ComputeInstance).all()
            if not instances:
                self._create_default_instances(db)
    
    def _create_default_instances(self, db: Session):
        """Create default compute instances for local development"""
        # Get system resources
        cpu_count = psutil.cpu_count()
        memory_gb = round(psutil.virtual_memory().total / (1024**3))
        
        # Create basic CPU instance
        cpu_instance = ComputeInstance(
            name="Local CPU Instance",
            instance_type="cpu-optimized",
            cpu_cores=max(2, cpu_count // 2),
            memory_gb=max(4, memory_gb // 2),
            gpu_count=0,
            storage_gb=100,
            hourly_cost_tokens=100,
            status="available",
            region="local",
            docker_image="ada/ml-runtime:latest",
            environment_config={"type": "cpu", "isolation": "container"}
        )
        
        # Create GPU instance if available
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu_instance = ComputeInstance(
                    name="Local GPU Instance",
                    instance_type="gpu-small",
                    cpu_cores=max(4, cpu_count // 2),
                    memory_gb=max(8, memory_gb // 2),
                    gpu_count=len(gpus),
                    gpu_type=gpus[0].name if gpus else "Unknown",
                    storage_gb=200,
                    hourly_cost_tokens=500,
                    status="available",
                    region="local",
                    docker_image="ada/ml-runtime:gpu",
                    environment_config={"type": "gpu", "isolation": "container"}
                )
                db.add(gpu_instance)
        except ImportError:
            logger.info("GPU support not available")
        
        db.add(cpu_instance)
        db.commit()
        logger.info("Created default compute instances")
    
    async def submit_job(self, job_config: Dict[str, Any], user_id: int, team_id: Optional[str] = None) -> Dict[str, Any]:
        """Submit a job for resource allocation and execution"""
        try:
            # Validate user permissions and limits
            validation_result = await self._validate_job_submission(user_id, job_config, team_id)
            if not validation_result["valid"]:
                return {"success": False, "error": validation_result["error"]}
            
            # Parse resource requirements
            requirements = self._parse_resource_requirements(job_config)
            
            # Create job record
            with self.db_session_factory() as db:
                job = ModelJob(
                    user_id=user_id,
                    team_id=team_id,
                    model_id=job_config.get("model_id"),
                    job_type=job_config.get("job_type", "training"),
                    parameters=job_config,
                    resource_requirements=requirements.__dict__,
                    priority=requirements.priority,
                    status=JobStatus.QUEUED.value,
                    estimated_token_cost=self._estimate_job_cost(requirements),
                    isolation_level=requirements.isolation_level
                )
                db.add(job)
                db.commit()
                job_id = job.id
            
            # Queue for resource allocation
            await self.job_queue.put({
                "job_id": job_id,
                "requirements": requirements,
                "user_id": user_id,
                "team_id": team_id
            })
            
            logger.info(f"Job {job_id} submitted successfully")
            return {"success": True, "job_id": job_id}
            
        except Exception as e:
            logger.error(f"Failed to submit job: {e}")
            return {"success": False, "error": str(e)}
    
    async def allocate_resources(self, job_id: int, requirements: ResourceRequirements) -> AllocationResult:
        """Allocate compute resources for a specific job"""
        try:
            with self.db_session_factory() as db:
                # Find suitable instance
                suitable_instance = self._find_suitable_instance(db, requirements)
                if not suitable_instance:
                    return AllocationResult(
                        success=False,
                        error_message="No suitable compute instance available"
                    )
                
                # Create resource allocation
                allocation = ResourceAllocation(
                    job_id=job_id,
                    instance_id=suitable_instance.id,
                    user_id=requirements.user_id if hasattr(requirements, 'user_id') else None,
                    allocated_cpu=requirements.cpu_cores,
                    allocated_memory_gb=requirements.memory_gb,
                    allocated_gpu_count=requirements.gpu_count,
                    allocated_storage_gb=requirements.storage_gb,
                    estimated_cost_tokens=self._estimate_job_cost(requirements),
                    status="allocated"
                )
                
                db.add(allocation)
                
                # Update instance status
                suitable_instance.status = "busy"
                
                db.commit()
                allocation_id = allocation.id
            
            # Start isolated execution environment
            container_result = await self._start_job_container(allocation_id, requirements)
            if not container_result["success"]:
                # Rollback allocation
                await self._release_allocation(allocation_id)
                return AllocationResult(
                    success=False,
                    error_message=f"Failed to start container: {container_result['error']}"
                )
            
            # Update allocation with container info
            with self.db_session_factory() as db:
                allocation = db.query(ResourceAllocation).filter(
                    ResourceAllocation.id == allocation_id
                ).first()
                allocation.container_id = container_result["container_id"]
                allocation.started_at = datetime.utcnow()
                allocation.status = "running"
                db.commit()
            
            # Start resource monitoring
            self.monitoring_tasks[allocation_id] = asyncio.create_task(
                self._monitor_job_resources(allocation_id)
            )
            
            logger.info(f"Resources allocated successfully for job {job_id}")
            return AllocationResult(
                success=True,
                allocation_id=allocation_id,
                instance_id=suitable_instance.id,
                container_id=container_result["container_id"],
                estimated_cost=self._estimate_job_cost(requirements)
            )
            
        except Exception as e:
            logger.error(f"Failed to allocate resources: {e}")
            return AllocationResult(success=False, error_message=str(e))
    
    def _find_suitable_instance(self, db: Session, requirements: ResourceRequirements) -> Optional[ComputeInstance]:
        """Find a compute instance that meets the job requirements"""
        query = db.query(ComputeInstance).filter(
            ComputeInstance.status == "available",
            ComputeInstance.cpu_cores >= requirements.cpu_cores,
            ComputeInstance.memory_gb >= requirements.memory_gb,
            ComputeInstance.storage_gb >= requirements.storage_gb
        )
        
        # Filter by GPU requirements
        if requirements.gpu_count > 0:
            query = query.filter(ComputeInstance.gpu_count >= requirements.gpu_count)
            if requirements.gpu_type:
                query = query.filter(ComputeInstance.gpu_type == requirements.gpu_type)
        
        # Order by cost efficiency (prefer cheaper instances first)
        query = query.order_by(ComputeInstance.hourly_cost_tokens.asc())
        
        return query.first()
    
    async def _start_job_container(self, allocation_id: str, requirements: ResourceRequirements) -> Dict[str, Any]:
        """Start an isolated Docker container for job execution"""
        try:
            # Get allocation details
            with self.db_session_factory() as db:
                allocation = db.query(ResourceAllocation).filter(
                    ResourceAllocation.id == allocation_id
                ).first()
                instance = db.query(ComputeInstance).filter(
                    ComputeInstance.id == allocation.instance_id
                ).first()
            
            # Configure container resources
            container_config = {
                "image": instance.docker_image or "ada/ml-runtime:latest",
                "name": f"ada-job-{allocation.job_id}-{uuid.uuid4().hex[:8]}",
                "detach": True,
                "remove": False,  # Keep for monitoring
                "mem_limit": f"{requirements.memory_gb}g",
                "cpu_quota": int(requirements.cpu_cores * 100000),  # CPU quota in microseconds
                "cpu_period": 100000,
                "network_mode": "bridge" if requirements.isolation_level == "standard" else "none",
                "environment": {
                    "ADA_JOB_ID": str(allocation.job_id),
                    "ADA_ALLOCATION_ID": str(allocation_id),
                    "ADA_USER_ID": str(allocation.user_id),
                    "ADA_ISOLATION_LEVEL": requirements.isolation_level
                },
                "volumes": {
                    f"/ada/jobs/{allocation.job_id}": {
                        "bind": "/workspace",
                        "mode": "rw"
                    }
                }
            }
            
            # Add GPU support if required
            if requirements.gpu_count > 0:
                container_config["device_requests"] = [
                    docker.types.DeviceRequest(count=requirements.gpu_count, capabilities=[["gpu"]])
                ]
            
            # Start container
            container = self.docker_client.containers.run(**container_config)
            
            logger.info(f"Started container {container.id} for allocation {allocation_id}")
            return {"success": True, "container_id": container.id}
            
        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            return {"success": False, "error": str(e)}
    
    async def _monitor_job_resources(self, allocation_id: str):
        """Monitor resource usage for a running job"""
        try:
            while allocation_id in self.monitoring_tasks:
                with self.db_session_factory() as db:
                    allocation = db.query(ResourceAllocation).filter(
                        ResourceAllocation.id == allocation_id
                    ).first()
                    
                    if not allocation or allocation.status not in ["running"]:
                        break
                    
                    # Get container stats
                    try:
                        container = self.docker_client.containers.get(allocation.container_id)
                        stats = container.stats(stream=False)
                        
                        # Calculate usage percentages
                        cpu_usage = self._calculate_cpu_usage(stats)
                        memory_usage = self._calculate_memory_usage(stats)
                        
                        # Log usage
                        usage_log = ResourceUsageLog(
                            allocation_id=allocation_id,
                            user_id=allocation.user_id,
                            instance_id=allocation.instance_id,
                            cpu_usage_percent=cpu_usage,
                            memory_usage_percent=memory_usage,
                            tokens_consumed_this_period=self._calculate_token_consumption(allocation, stats)
                        )
                        db.add(usage_log)
                        
                        # Update peak usage
                        allocation.peak_cpu_usage = max(allocation.peak_cpu_usage or 0, cpu_usage)
                        allocation.peak_memory_usage = max(allocation.peak_memory_usage or 0, memory_usage)
                        
                        db.commit()
                        
                    except docker.errors.NotFound:
                        logger.warning(f"Container not found for allocation {allocation_id}")
                        break
                
                # Wait before next monitoring cycle
                await asyncio.sleep(60)  # Monitor every minute
                
        except Exception as e:
            logger.error(f"Error monitoring resources for allocation {allocation_id}: {e}")
    
    async def _release_allocation(self, allocation_id: str):
        """Release allocated resources and clean up"""
        try:
            with self.db_session_factory() as db:
                allocation = db.query(ResourceAllocation).filter(
                    ResourceAllocation.id == allocation_id
                ).first()
                
                if allocation:
                    # Stop and remove container
                    if allocation.container_id:
                        try:
                            container = self.docker_client.containers.get(allocation.container_id)
                            container.stop(timeout=30)
                            container.remove()
                        except docker.errors.NotFound:
                            logger.warning(f"Container {allocation.container_id} not found")
                    
                    # Update allocation status
                    allocation.released_at = datetime.utcnow()
                    allocation.status = "completed"
                    
                    # Free up the instance
                    instance = db.query(ComputeInstance).filter(
                        ComputeInstance.id == allocation.instance_id
                    ).first()
                    if instance:
                        instance.status = "available"
                    
                    db.commit()
            
            # Stop monitoring
            if allocation_id in self.monitoring_tasks:
                self.monitoring_tasks[allocation_id].cancel()
                del self.monitoring_tasks[allocation_id]
            
            logger.info(f"Released allocation {allocation_id}")
            
        except Exception as e:
            logger.error(f"Failed to release allocation {allocation_id}: {e}")
    
    async def _validate_job_submission(self, user_id: int, job_config: Dict, team_id: Optional[str]) -> Dict[str, Any]:
        """Validate if user can submit this job based on quotas and permissions"""
        try:
            with self.db_session_factory() as db:
                # Check user quotas
                user_quota = db.query(ResourceQuota).filter(
                    ResourceQuota.entity_type == "user",
                    ResourceQuota.entity_id == str(user_id)
                ).first()
                
                # Check team quotas if applicable
                team_quota = None
                if team_id:
                    team_quota = db.query(ResourceQuota).filter(
                        ResourceQuota.entity_type == "team",
                        ResourceQuota.entity_id == team_id
                    ).first()
                
                # Check current usage
                active_jobs = db.query(ModelJob).filter(
                    ModelJob.user_id == user_id,
                    ModelJob.status.in_(["queued", "running"])
                ).count()
                
                # Apply quotas
                max_concurrent = user_quota.max_concurrent_jobs if user_quota else 5
                if team_quota and team_quota.max_concurrent_jobs < max_concurrent:
                    max_concurrent = team_quota.max_concurrent_jobs
                
                if active_jobs >= max_concurrent:
                    return {
                        "valid": False,
                        "error": f"Maximum concurrent jobs limit reached ({max_concurrent})"
                    }
                
                return {"valid": True}
                
        except Exception as e:
            logger.error(f"Error validating job submission: {e}")
            return {"valid": False, "error": "Validation failed"}
    
    def _parse_resource_requirements(self, job_config: Dict) -> ResourceRequirements:
        """Parse job configuration into resource requirements"""
        requirements = job_config.get("resource_requirements", {})
        
        return ResourceRequirements(
            cpu_cores=requirements.get("cpu_cores", 2),
            memory_gb=requirements.get("memory_gb", 4),
            gpu_count=requirements.get("gpu_count", 0),
            gpu_type=requirements.get("gpu_type"),
            storage_gb=requirements.get("storage_gb", 10),
            max_duration_hours=requirements.get("max_duration_hours", 24),
            priority=job_config.get("priority", 1),
            preemptible=requirements.get("preemptible", True),
            isolation_level=requirements.get("isolation_level", "standard")
        )
    
    def _estimate_job_cost(self, requirements: ResourceRequirements) -> int:
        """Estimate token cost for job based on resource requirements"""
        base_cost = 100  # Base cost per hour
        cpu_cost = requirements.cpu_cores * 50
        memory_cost = requirements.memory_gb * 20
        gpu_cost = requirements.gpu_count * 500
        storage_cost = requirements.storage_gb * 5
        
        hourly_cost = base_cost + cpu_cost + memory_cost + gpu_cost + storage_cost
        return int(hourly_cost * requirements.max_duration_hours)
    
    def _calculate_cpu_usage(self, stats: Dict) -> float:
        """Calculate CPU usage percentage from container stats"""
        try:
            cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - \
                       stats["precpu_stats"]["cpu_usage"]["total_usage"]
            system_delta = stats["cpu_stats"]["system_cpu_usage"] - \
                          stats["precpu_stats"]["system_cpu_usage"]
            
            if system_delta > 0:
                return (cpu_delta / system_delta) * len(stats["cpu_stats"]["cpu_usage"]["percpu_usage"])
            return 0.0
        except (KeyError, ZeroDivisionError):
            return 0.0
    
    def _calculate_memory_usage(self, stats: Dict) -> float:
        """Calculate memory usage percentage from container stats"""
        try:
            used_memory = stats["memory_stats"]["usage"]
            max_memory = stats["memory_stats"]["limit"]
            return (used_memory / max_memory) * 100 if max_memory > 0 else 0.0
        except (KeyError, ZeroDivisionError):
            return 0.0
    
    def _calculate_token_consumption(self, allocation: ResourceAllocation, stats: Dict) -> int:
        """Calculate tokens consumed in this monitoring period"""
        try:
            # Get instance hourly cost
            with self.db_session_factory() as db:
                instance = db.query(ComputeInstance).filter(
                    ComputeInstance.id == allocation.instance_id
                ).first()
                
                if instance:
                    # Calculate cost for 1 minute (monitoring period)
                    return int(instance.hourly_cost_tokens / 60)
            return 0
        except Exception:
            return 0
    
    async def get_job_status(self, job_id: int, user_id: int) -> Dict[str, Any]:
        """Get current status and details of a job"""
        try:
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(
                    ModelJob.id == job_id,
                    ModelJob.user_id == user_id
                ).first()
                
                if not job:
                    return {"success": False, "error": "Job not found"}
                
                # Get allocation details if exists
                allocation = db.query(ResourceAllocation).filter(
                    ResourceAllocation.job_id == job_id
                ).first()
                
                result = {
                    "success": True,
                    "job_id": job.id,
                    "status": job.status,
                    "progress": job.progress,
                    "created_at": job.created_at,
                    "started_at": job.started_at,
                    "completed_at": job.completed_at
                }
                
                if allocation:
                    result["allocation"] = {
                        "instance_id": allocation.instance_id,
                        "container_id": allocation.container_id,
                        "cpu_cores": allocation.allocated_cpu,
                        "memory_gb": allocation.allocated_memory_gb,
                        "gpu_count": allocation.allocated_gpu_count,
                        "estimated_cost": allocation.estimated_cost_tokens,
                        "actual_cost": allocation.actual_cost_tokens
                    }
                
                return result
                
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            return {"success": False, "error": str(e)}
    
    async def cancel_job(self, job_id: int, user_id: int) -> Dict[str, Any]:
        """Cancel a running job and release its resources"""
        try:
            with self.db_session_factory() as db:
                job = db.query(ModelJob).filter(
                    ModelJob.id == job_id,
                    ModelJob.user_id == user_id
                ).first()
                
                if not job:
                    return {"success": False, "error": "Job not found"}
                
                if job.status in ["completed", "failed", "cancelled"]:
                    return {"success": False, "error": "Job already finished"}
                
                # Update job status
                job.status = JobStatus.CANCELLED.value
                job.completed_at = datetime.utcnow()
                
                # Find and release allocation
                allocation = db.query(ResourceAllocation).filter(
                    ResourceAllocation.job_id == job_id
                ).first()
                
                if allocation:
                    await self._release_allocation(allocation.id)
                
                db.commit()
                
                logger.info(f"Cancelled job {job_id}")
                return {"success": True}
                
        except Exception as e:
            logger.error(f"Error cancelling job: {e}")
            return {"success": False, "error": str(e)}