"""
Job Queue Manager
Manages job queuing, scheduling, and lifecycle
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import redis
from redis import asyncio as aioredis
import pickle
from collections import defaultdict
import heapq
import logging

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    """Job status states"""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"
    SCHEDULED = "scheduled"
    TIMEOUT = "timeout"


class JobPriority(Enum):
    """Job priority levels"""
    CRITICAL = 0
    HIGH = 1
    NORMAL = 5
    LOW = 8
    BACKGROUND = 10


@dataclass
class JobDefinition:
    """Job definition with all metadata"""
    job_id: str
    job_type: str
    payload: Dict[str, Any]
    priority: JobPriority = JobPriority.NORMAL
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    
    # Execution control
    max_retries: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 3600  # seconds
    
    # Dependencies
    depends_on: List[str] = field(default_factory=list)
    
    # Resource requirements
    requires_gpu: bool = False
    required_memory_gb: float = 1.0
    required_cpu_cores: int = 1
    
    # Metadata
    created_by: str = "system"
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class JobResult:
    """Job execution result"""
    job_id: str
    status: JobStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_time: Optional[float] = None
    attempts: int = 0
    worker_id: Optional[str] = None
    logs: List[str] = field(default_factory=list)


class JobQueueManager:
    """
    Advanced job queue management system with Redis backend
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Queue names
        self.queues = {
            JobPriority.CRITICAL: "queue:critical",
            JobPriority.HIGH: "queue:high",
            JobPriority.NORMAL: "queue:normal",
            JobPriority.LOW: "queue:low",
            JobPriority.BACKGROUND: "queue:background"
        }
        
        # Job handlers
        self.job_handlers: Dict[str, Callable] = {}
        
        # Local cache
        self.job_cache: Dict[str, JobDefinition] = {}
        self.result_cache: Dict[str, JobResult] = {}
        
        # Scheduled jobs (priority queue)
        self.scheduled_jobs: List[Tuple[datetime, str]] = []
        
        # Statistics
        self.stats = defaultdict(int)
        
    async def initialize(self):
        """Initialize job queue manager"""
        # Connect to Redis
        redis_url = self.config.get('redis_url', 'redis://localhost:6379')
        self.redis_client = await aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=False
        )
        
        # Start background tasks
        asyncio.create_task(self._scheduler_loop())
        asyncio.create_task(self._timeout_checker_loop())
        asyncio.create_task(self._cleanup_loop())
        
        logger.info("Job queue manager initialized")
    
    # Job Submission
    async def submit_job(self, job_def: JobDefinition) -> str:
        """Submit a job to the queue"""
        try:
            # Generate job ID if not provided
            if not job_def.job_id:
                job_def.job_id = str(uuid.uuid4())
            
            # Validate job
            if not await self._validate_job(job_def):
                raise ValueError("Invalid job definition")
            
            # Check dependencies
            if job_def.depends_on:
                unmet_deps = await self._check_dependencies(job_def.depends_on)
                if unmet_deps:
                    logger.info(f"Job {job_def.job_id} waiting for dependencies: {unmet_deps}")
                    await self._store_pending_job(job_def)
                    return job_def.job_id
            
            # Schedule or queue immediately
            if job_def.scheduled_at and job_def.scheduled_at > datetime.utcnow():
                await self._schedule_job(job_def)
                logger.info(f"Job {job_def.job_id} scheduled for {job_def.scheduled_at}")
            else:
                await self._enqueue_job(job_def)
                logger.info(f"Job {job_def.job_id} queued with priority {job_def.priority.name}")
            
            # Update statistics
            self.stats['jobs_submitted'] += 1
            
            return job_def.job_id
            
        except Exception as e:
            logger.error(f"Failed to submit job: {e}")
            raise
    
    async def _validate_job(self, job_def: JobDefinition) -> bool:
        """Validate job definition"""
        # Check required fields
        if not job_def.job_type:
            return False
        
        # Check if handler exists
        if job_def.job_type not in self.job_handlers:
            logger.warning(f"No handler registered for job type: {job_def.job_type}")
            return False
        
        # Validate deadline
        if job_def.deadline and job_def.deadline <= datetime.utcnow():
            return False
        
        return True
    
    async def _check_dependencies(self, dependency_ids: List[str]) -> List[str]:
        """Check which dependencies are not met"""
        unmet = []
        
        for dep_id in dependency_ids:
            status = await self.get_job_status(dep_id)
            if status != JobStatus.COMPLETED:
                unmet.append(dep_id)
        
        return unmet
    
    async def _store_pending_job(self, job_def: JobDefinition):
        """Store job waiting for dependencies"""
        key = f"job:pending:{job_def.job_id}"
        value = pickle.dumps(job_def)
        await self.redis_client.set(key, value)
        
        # Add to dependency tracking
        for dep_id in job_def.depends_on:
            dep_key = f"job:dependents:{dep_id}"
            await self.redis_client.sadd(dep_key, job_def.job_id)
    
    async def _schedule_job(self, job_def: JobDefinition):
        """Schedule job for future execution"""
        # Store job definition
        key = f"job:scheduled:{job_def.job_id}"
        value = pickle.dumps(job_def)
        await self.redis_client.set(key, value)
        
        # Add to scheduled set with timestamp score
        score = job_def.scheduled_at.timestamp()
        await self.redis_client.zadd("scheduled_jobs", {job_def.job_id: score})
        
        # Update job status
        await self._update_job_status(job_def.job_id, JobStatus.SCHEDULED)
    
    async def _enqueue_job(self, job_def: JobDefinition):
        """Add job to appropriate priority queue"""
        # Store job definition
        key = f"job:definition:{job_def.job_id}"
        value = pickle.dumps(job_def)
        await self.redis_client.set(key, value)
        
        # Add to queue
        queue_name = self.queues[job_def.priority]
        await self.redis_client.lpush(queue_name, job_def.job_id)
        
        # Update job status
        await self._update_job_status(job_def.job_id, JobStatus.QUEUED)
        
        # Cache locally
        self.job_cache[job_def.job_id] = job_def
    
    # Job Retrieval (for workers)
    async def get_next_job(self, worker_id: str, 
                          capabilities: Optional[Dict] = None) -> Optional[JobDefinition]:
        """Get next job for worker based on priority and capabilities"""
        # Check queues in priority order
        for priority in JobPriority:
            queue_name = self.queues[priority]
            
            # Try to get job from queue
            job_id = await self.redis_client.rpop(queue_name)
            if job_id:
                job_id = job_id.decode('utf-8') if isinstance(job_id, bytes) else job_id
                
                # Load job definition
                job_def = await self._load_job_definition(job_id)
                if not job_def:
                    continue
                
                # Check if worker can handle this job
                if not await self._can_worker_handle_job(worker_id, job_def, capabilities):
                    # Put back in queue
                    await self.redis_client.lpush(queue_name, job_id)
                    continue
                
                # Assign job to worker
                await self._assign_job_to_worker(job_id, worker_id)
                
                return job_def
        
        return None
    
    async def _load_job_definition(self, job_id: str) -> Optional[JobDefinition]:
        """Load job definition from Redis"""
        # Check cache first
        if job_id in self.job_cache:
            return self.job_cache[job_id]
        
        # Load from Redis
        key = f"job:definition:{job_id}"
        value = await self.redis_client.get(key)
        
        if value:
            job_def = pickle.loads(value)
            self.job_cache[job_id] = job_def
            return job_def
        
        return None
    
    async def _can_worker_handle_job(self, worker_id: str, job_def: JobDefinition,
                                    capabilities: Optional[Dict]) -> bool:
        """Check if worker can handle job requirements"""
        if not capabilities:
            return True
        
        # Check GPU requirement
        if job_def.requires_gpu and not capabilities.get('has_gpu', False):
            return False
        
        # Check memory requirement
        if job_def.required_memory_gb > capabilities.get('available_memory_gb', 0):
            return False
        
        # Check CPU requirement
        if job_def.required_cpu_cores > capabilities.get('available_cpu_cores', 0):
            return False
        
        return True
    
    async def _assign_job_to_worker(self, job_id: str, worker_id: str):
        """Assign job to worker"""
        # Update job status
        await self._update_job_status(job_id, JobStatus.RUNNING)
        
        # Record assignment
        key = f"job:assignment:{job_id}"
        value = {
            'worker_id': worker_id,
            'started_at': datetime.utcnow().isoformat()
        }
        await self.redis_client.set(key, json.dumps(value))
        
        # Set timeout
        timeout_key = f"job:timeout:{job_id}"
        job_def = await self._load_job_definition(job_id)
        if job_def:
            timeout_timestamp = datetime.utcnow() + timedelta(seconds=job_def.timeout)
            await self.redis_client.set(
                timeout_key,
                timeout_timestamp.timestamp(),
                ex=job_def.timeout
            )
    
    # Job Completion
    async def complete_job(self, job_id: str, result: Any, worker_id: str):
        """Mark job as completed"""
        # Create result
        job_result = JobResult(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result=result,
            completed_at=datetime.utcnow(),
            worker_id=worker_id
        )
        
        # Calculate execution time
        assignment = await self._get_job_assignment(job_id)
        if assignment:
            started_at = datetime.fromisoformat(assignment['started_at'])
            job_result.started_at = started_at
            job_result.execution_time = (job_result.completed_at - started_at).total_seconds()
        
        # Store result
        await self._store_job_result(job_result)
        
        # Update status
        await self._update_job_status(job_id, JobStatus.COMPLETED)
        
        # Trigger dependent jobs
        await self._trigger_dependent_jobs(job_id)
        
        # Update statistics
        self.stats['jobs_completed'] += 1
        
        # Cleanup
        await self._cleanup_job(job_id)
        
        logger.info(f"Job {job_id} completed successfully")
    
    async def fail_job(self, job_id: str, error: str, worker_id: Optional[str] = None):
        """Mark job as failed"""
        # Load job definition
        job_def = await self._load_job_definition(job_id)
        if not job_def:
            return
        
        # Get current attempt count
        attempts_key = f"job:attempts:{job_id}"
        attempts = await self.redis_client.incr(attempts_key)
        
        # Check if should retry
        if attempts < job_def.max_retries:
            # Schedule retry
            retry_at = datetime.utcnow() + timedelta(seconds=job_def.retry_delay * attempts)
            job_def.scheduled_at = retry_at
            
            await self._schedule_job(job_def)
            await self._update_job_status(job_id, JobStatus.RETRYING)
            
            logger.info(f"Job {job_id} scheduled for retry (attempt {attempts + 1}/{job_def.max_retries})")
        else:
            # Mark as failed
            job_result = JobResult(
                job_id=job_id,
                status=JobStatus.FAILED,
                error=error,
                completed_at=datetime.utcnow(),
                worker_id=worker_id,
                attempts=attempts
            )
            
            await self._store_job_result(job_result)
            await self._update_job_status(job_id, JobStatus.FAILED)
            
            # Update statistics
            self.stats['jobs_failed'] += 1
            
            logger.error(f"Job {job_id} failed after {attempts} attempts: {error}")
    
    async def _trigger_dependent_jobs(self, completed_job_id: str):
        """Trigger jobs that depend on completed job"""
        dep_key = f"job:dependents:{completed_job_id}"
        dependent_ids = await self.redis_client.smembers(dep_key)
        
        for dep_id in dependent_ids:
            dep_id = dep_id.decode('utf-8') if isinstance(dep_id, bytes) else dep_id
            
            # Load pending job
            pending_key = f"job:pending:{dep_id}"
            value = await self.redis_client.get(pending_key)
            
            if value:
                job_def = pickle.loads(value)
                
                # Check if all dependencies are met
                unmet_deps = await self._check_dependencies(job_def.depends_on)
                
                if not unmet_deps:
                    # All dependencies met, queue the job
                    await self._enqueue_job(job_def)
                    await self.redis_client.delete(pending_key)
                    
                    logger.info(f"Dependent job {dep_id} queued after {completed_job_id} completed")
    
    # Job Status and Results
    async def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get current job status"""
        key = f"job:status:{job_id}"
        status = await self.redis_client.get(key)
        
        if status:
            status = status.decode('utf-8') if isinstance(status, bytes) else status
            return JobStatus(status)
        
        return None
    
    async def get_job_result(self, job_id: str) -> Optional[JobResult]:
        """Get job execution result"""
        # Check cache first
        if job_id in self.result_cache:
            return self.result_cache[job_id]
        
        # Load from Redis
        key = f"job:result:{job_id}"
        value = await self.redis_client.get(key)
        
        if value:
            result = pickle.loads(value)
            self.result_cache[job_id] = result
            return result
        
        return None
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or running job"""
        status = await self.get_job_status(job_id)
        
        if status in [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.SCHEDULED]:
            # Remove from queue
            for queue_name in self.queues.values():
                await self.redis_client.lrem(queue_name, 0, job_id)
            
            # Remove from scheduled
            await self.redis_client.zrem("scheduled_jobs", job_id)
            
            # Update status
            await self._update_job_status(job_id, JobStatus.CANCELLED)
            
            logger.info(f"Job {job_id} cancelled")
            return True
        
        elif status == JobStatus.RUNNING:
            # Send cancellation signal to worker
            cancel_key = f"job:cancel:{job_id}"
            await self.redis_client.set(cancel_key, "1", ex=3600)
            
            logger.info(f"Cancellation requested for running job {job_id}")
            return True
        
        return False
    
    # Job Handlers
    def register_handler(self, job_type: str, handler: Callable):
        """Register a handler for a job type"""
        self.job_handlers[job_type] = handler
        logger.info(f"Handler registered for job type: {job_type}")
    
    async def execute_job(self, job_def: JobDefinition) -> Any:
        """Execute a job using registered handler"""
        handler = self.job_handlers.get(job_def.job_type)
        
        if not handler:
            raise ValueError(f"No handler for job type: {job_def.job_type}")
        
        # Execute handler
        if asyncio.iscoroutinefunction(handler):
            result = await handler(job_def.payload)
        else:
            result = handler(job_def.payload)
        
        return result
    
    # Background Tasks
    async def _scheduler_loop(self):
        """Process scheduled jobs"""
        while True:
            try:
                await asyncio.sleep(1)
                
                # Get jobs ready to run
                now = datetime.utcnow().timestamp()
                ready_jobs = await self.redis_client.zrangebyscore(
                    "scheduled_jobs", 0, now
                )
                
                for job_id in ready_jobs:
                    job_id = job_id.decode('utf-8') if isinstance(job_id, bytes) else job_id
                    
                    # Load job definition
                    key = f"job:scheduled:{job_id}"
                    value = await self.redis_client.get(key)
                    
                    if value:
                        job_def = pickle.loads(value)
                        
                        # Queue the job
                        await self._enqueue_job(job_def)
                        
                        # Remove from scheduled
                        await self.redis_client.zrem("scheduled_jobs", job_id)
                        await self.redis_client.delete(key)
                        
                        logger.info(f"Scheduled job {job_id} moved to queue")
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
    
    async def _timeout_checker_loop(self):
        """Check for timed out jobs"""
        while True:
            try:
                await asyncio.sleep(10)
                
                # Get all timeout keys
                pattern = "job:timeout:*"
                cursor = b'0'
                
                while cursor:
                    cursor, keys = await self.redis_client.scan(
                        cursor, match=pattern, count=100
                    )
                    
                    for key in keys:
                        key = key.decode('utf-8') if isinstance(key, bytes) else key
                        job_id = key.split(':')[-1]
                        
                        # Check if job is still running
                        status = await self.get_job_status(job_id)
                        if status == JobStatus.RUNNING:
                            # Check timeout
                            timeout_value = await self.redis_client.get(key)
                            if timeout_value:
                                timeout_timestamp = float(timeout_value)
                                if datetime.utcnow().timestamp() > timeout_timestamp:
                                    # Job timed out
                                    await self.fail_job(job_id, "Job execution timeout")
                                    await self._update_job_status(job_id, JobStatus.TIMEOUT)
                                    
                                    logger.warning(f"Job {job_id} timed out")
                
            except Exception as e:
                logger.error(f"Timeout checker error: {e}")
    
    async def _cleanup_loop(self):
        """Clean up old job data"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run hourly
                
                # Clean up completed jobs older than retention period
                retention_days = self.config.get('job_retention_days', 7)
                cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
                
                # This would need to be implemented based on your retention policy
                logger.info("Running job cleanup")
                
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
    
    # Helper Methods
    async def _update_job_status(self, job_id: str, status: JobStatus):
        """Update job status"""
        key = f"job:status:{job_id}"
        await self.redis_client.set(key, status.value)
        
        # Publish status change event
        event = {
            'job_id': job_id,
            'status': status.value,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.redis_client.publish(f"job:status:{job_id}", json.dumps(event))
    
    async def _store_job_result(self, result: JobResult):
        """Store job result"""
        key = f"job:result:{result.job_id}"
        value = pickle.dumps(result)
        await self.redis_client.set(key, value)
        
        # Cache locally
        self.result_cache[result.job_id] = result
    
    async def _get_job_assignment(self, job_id: str) -> Optional[Dict]:
        """Get job assignment info"""
        key = f"job:assignment:{job_id}"
        value = await self.redis_client.get(key)
        
        if value:
            return json.loads(value)
        
        return None
    
    async def _cleanup_job(self, job_id: str):
        """Clean up job-related data"""
        # Remove from caches
        self.job_cache.pop(job_id, None)
        
        # Remove temporary keys
        keys_to_delete = [
            f"job:assignment:{job_id}",
            f"job:timeout:{job_id}",
            f"job:cancel:{job_id}",
            f"job:attempts:{job_id}"
        ]
        
        for key in keys_to_delete:
            await self.redis_client.delete(key)
    
    # Statistics and Monitoring
    async def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        stats = {
            'queues': {},
            'total_pending': 0,
            'total_running': 0,
            'total_completed': self.stats['jobs_completed'],
            'total_failed': self.stats['jobs_failed']
        }
        
        # Get queue lengths
        for priority, queue_name in self.queues.items():
            length = await self.redis_client.llen(queue_name)
            stats['queues'][priority.name] = length
            stats['total_pending'] += length
        
        # Get scheduled jobs count
        scheduled_count = await self.redis_client.zcard("scheduled_jobs")
        stats['scheduled'] = scheduled_count
        
        return stats
    
    async def get_worker_stats(self) -> Dict:
        """Get worker statistics"""
        # This would track active workers and their current jobs
        # Implementation depends on worker registration system
        return {
            'active_workers': 0,
            'idle_workers': 0,
            'worker_details': []
        }
    
    async def shutdown(self):
        """Gracefully shutdown the queue manager"""
        logger.info("Shutting down job queue manager")
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        # Clear caches
        self.job_cache.clear()
        self.result_cache.clear()