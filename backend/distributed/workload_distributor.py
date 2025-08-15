"""
Workload Distribution Engine
Manages distributed processing across multiple devices and nodes
"""

import asyncio
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from queue import PriorityQueue
import socket
import platform
import psutil
import GPUtil
import uuid


class DeviceStatus(Enum):
    """Device status states"""
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class JobPriority(Enum):
    """Job priority levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 5
    LOW = 8
    BATCH = 10


@dataclass
class DeviceCapabilities:
    """Device hardware and software capabilities"""
    device_id: str
    hostname: str
    ip_address: str
    
    # CPU Information
    cpu_count: int
    cpu_freq_mhz: float
    cpu_model: str
    cpu_benchmark_score: float
    
    # Memory Information
    memory_total_gb: float
    memory_available_gb: float
    
    # GPU Information
    gpu_count: int
    gpu_models: List[str]
    gpu_memory_gb: List[float]
    cuda_available: bool
    cuda_version: Optional[str]
    
    # Storage Information
    disk_total_gb: float
    disk_available_gb: float
    disk_read_speed_mbps: float
    disk_write_speed_mbps: float
    
    # Network Information
    network_bandwidth_mbps: float
    network_latency_ms: float
    
    # Software Capabilities
    os_type: str
    os_version: str
    python_version: str
    installed_frameworks: List[str]
    
    # Performance Metrics
    flops: float  # Floating point operations per second
    memory_bandwidth_gbps: float
    
    # Availability
    availability_hours: List[int]  # Hours when device is available
    reliability_score: float  # 0-1 score based on historical uptime


@dataclass
class DeviceState:
    """Current state of a device"""
    device_id: str
    status: DeviceStatus
    current_load: float  # 0-100%
    assigned_jobs: List[str]
    last_heartbeat: datetime
    total_jobs_completed: int
    total_jobs_failed: int
    uptime_seconds: float
    error_count: int
    
    # Resource utilization
    cpu_usage: float
    memory_usage: float
    gpu_usage: Optional[float]
    disk_usage: float
    network_usage: float
    
    # Current allocations
    allocated_cpu_cores: int
    allocated_memory_gb: float
    allocated_gpu_count: int


@dataclass
class JobRequirements:
    """Resource requirements for a job"""
    job_id: str
    job_type: str
    priority: JobPriority
    
    # Resource requirements
    min_cpu_cores: int
    min_memory_gb: float
    requires_gpu: bool
    min_gpu_memory_gb: float
    estimated_duration_seconds: float
    data_size_gb: float
    
    # Constraints
    max_devices: int  # Maximum number of devices to use
    preferred_devices: List[str]
    excluded_devices: List[str]
    deadline: Optional[datetime]
    
    # Dependencies
    depends_on: List[str]  # Job IDs this job depends on
    data_locality: Optional[str]  # Preferred data location


@dataclass
class JobAllocation:
    """Allocation of a job to devices"""
    job_id: str
    allocated_devices: List[str]
    allocation_strategy: str
    estimated_completion_time: datetime
    data_transfer_plan: Dict[str, List[str]]  # device -> data chunks
    checkpointing_enabled: bool
    checkpoint_frequency: int


class WorkloadDistributor:
    """
    Advanced workload distribution engine for managing distributed processing
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.devices: Dict[str, DeviceCapabilities] = {}
        self.device_states: Dict[str, DeviceState] = {}
        self.job_queue = PriorityQueue()
        self.running_jobs: Dict[str, JobAllocation] = {}
        self.completed_jobs: Set[str] = set()
        self.job_history: List[Dict] = []
        
        # Scheduling configuration
        self.scheduling_algorithm = config.get('scheduling_algorithm', 'weighted_round_robin')
        self.load_balance_threshold = config.get('load_balance_threshold', 0.8)
        self.oversubscription_ratio = config.get('oversubscription_ratio', 1.2)
        self.network_aware = config.get('network_aware_scheduling', True)
        self.power_aware = config.get('power_aware_scheduling', False)
        
        # Initialize device discovery
        self.device_discovery_interval = config.get('device_discovery_interval', 60)
        self.heartbeat_timeout = config.get('heartbeat_timeout', 30)
        
    async def initialize(self):
        """Initialize the workload distributor"""
        # Start device discovery
        asyncio.create_task(self._device_discovery_loop())
        
        # Start scheduler
        asyncio.create_task(self._scheduling_loop())
        
        # Start load balancer
        asyncio.create_task(self._load_balancing_loop())
        
        # Start health monitor
        asyncio.create_task(self._health_monitoring_loop())
        
        print("Workload distributor initialized")
    
    # Device Management
    async def register_device(self, device_info: Dict) -> bool:
        """Register a new device in the cluster"""
        try:
            # Create device capabilities
            capabilities = DeviceCapabilities(
                device_id=device_info.get('device_id', str(uuid.uuid4())),
                hostname=device_info['hostname'],
                ip_address=device_info['ip_address'],
                cpu_count=device_info['cpu_count'],
                cpu_freq_mhz=device_info['cpu_freq'],
                cpu_model=device_info['cpu_model'],
                cpu_benchmark_score=await self._benchmark_cpu(device_info),
                memory_total_gb=device_info['memory_total'],
                memory_available_gb=device_info['memory_available'],
                gpu_count=device_info.get('gpu_count', 0),
                gpu_models=device_info.get('gpu_models', []),
                gpu_memory_gb=device_info.get('gpu_memory', []),
                cuda_available=device_info.get('cuda_available', False),
                cuda_version=device_info.get('cuda_version'),
                disk_total_gb=device_info['disk_total'],
                disk_available_gb=device_info['disk_available'],
                disk_read_speed_mbps=device_info.get('disk_read_speed', 100),
                disk_write_speed_mbps=device_info.get('disk_write_speed', 100),
                network_bandwidth_mbps=device_info.get('network_bandwidth', 1000),
                network_latency_ms=await self._measure_network_latency(device_info['ip_address']),
                os_type=device_info['os_type'],
                os_version=device_info['os_version'],
                python_version=device_info['python_version'],
                installed_frameworks=device_info.get('frameworks', []),
                flops=self._calculate_flops(device_info),
                memory_bandwidth_gbps=device_info.get('memory_bandwidth', 50),
                availability_hours=device_info.get('availability_hours', list(range(24))),
                reliability_score=1.0  # Start with perfect score
            )
            
            # Create initial device state
            state = DeviceState(
                device_id=capabilities.device_id,
                status=DeviceStatus.ONLINE,
                current_load=0.0,
                assigned_jobs=[],
                last_heartbeat=datetime.utcnow(),
                total_jobs_completed=0,
                total_jobs_failed=0,
                uptime_seconds=0,
                error_count=0,
                cpu_usage=0.0,
                memory_usage=0.0,
                gpu_usage=0.0 if capabilities.gpu_count > 0 else None,
                disk_usage=0.0,
                network_usage=0.0,
                allocated_cpu_cores=0,
                allocated_memory_gb=0.0,
                allocated_gpu_count=0
            )
            
            # Store device information
            self.devices[capabilities.device_id] = capabilities
            self.device_states[capabilities.device_id] = state
            
            print(f"Device registered: {capabilities.device_id} ({capabilities.hostname})")
            return True
            
        except Exception as e:
            print(f"Failed to register device: {e}")
            return False
    
    async def update_device_state(self, device_id: str, state_update: Dict):
        """Update device state with latest metrics"""
        if device_id not in self.device_states:
            return
        
        state = self.device_states[device_id]
        state.last_heartbeat = datetime.utcnow()
        state.cpu_usage = state_update.get('cpu_usage', state.cpu_usage)
        state.memory_usage = state_update.get('memory_usage', state.memory_usage)
        state.gpu_usage = state_update.get('gpu_usage', state.gpu_usage)
        state.disk_usage = state_update.get('disk_usage', state.disk_usage)
        state.network_usage = state_update.get('network_usage', state.network_usage)
        
        # Update load calculation
        state.current_load = self._calculate_device_load(state)
        
        # Update status based on load
        if state.current_load > 90:
            state.status = DeviceStatus.BUSY
        elif state.current_load < 10:
            state.status = DeviceStatus.IDLE
        else:
            state.status = DeviceStatus.ONLINE
    
    # Job Scheduling
    async def submit_job(self, job_requirements: JobRequirements) -> str:
        """Submit a job for distributed processing"""
        # Validate job requirements
        if not await self._validate_job_requirements(job_requirements):
            raise ValueError("Invalid job requirements")
        
        # Check if resources are available
        if not await self._check_resource_availability(job_requirements):
            # Queue the job
            self.job_queue.put((job_requirements.priority.value, job_requirements))
            return job_requirements.job_id
        
        # Allocate resources immediately
        allocation = await self._allocate_resources(job_requirements)
        if allocation:
            self.running_jobs[job_requirements.job_id] = allocation
            await self._start_job_execution(job_requirements, allocation)
        else:
            # Queue if allocation fails
            self.job_queue.put((job_requirements.priority.value, job_requirements))
        
        return job_requirements.job_id
    
    async def _allocate_resources(self, job_req: JobRequirements) -> Optional[JobAllocation]:
        """Allocate resources for a job"""
        # Select allocation strategy
        if self.scheduling_algorithm == 'first_fit':
            devices = await self._first_fit_allocation(job_req)
        elif self.scheduling_algorithm == 'best_fit':
            devices = await self._best_fit_allocation(job_req)
        elif self.scheduling_algorithm == 'weighted_round_robin':
            devices = await self._weighted_round_robin_allocation(job_req)
        elif self.scheduling_algorithm == 'locality_aware':
            devices = await self._locality_aware_allocation(job_req)
        else:
            devices = await self._default_allocation(job_req)
        
        if not devices:
            return None
        
        # Create allocation
        allocation = JobAllocation(
            job_id=job_req.job_id,
            allocated_devices=devices,
            allocation_strategy=self.scheduling_algorithm,
            estimated_completion_time=self._estimate_completion_time(job_req, devices),
            data_transfer_plan=await self._create_data_transfer_plan(job_req, devices),
            checkpointing_enabled=job_req.estimated_duration_seconds > 3600,  # Enable for long jobs
            checkpoint_frequency=300  # Every 5 minutes
        )
        
        # Update device states
        for device_id in devices:
            state = self.device_states[device_id]
            state.assigned_jobs.append(job_req.job_id)
            state.allocated_cpu_cores += job_req.min_cpu_cores // len(devices)
            state.allocated_memory_gb += job_req.min_memory_gb / len(devices)
            if job_req.requires_gpu:
                state.allocated_gpu_count += 1
        
        return allocation
    
    async def _first_fit_allocation(self, job_req: JobRequirements) -> List[str]:
        """First-fit allocation strategy"""
        allocated_devices = []
        required_resources = {
            'cpu': job_req.min_cpu_cores,
            'memory': job_req.min_memory_gb,
            'gpu': 1 if job_req.requires_gpu else 0
        }
        
        for device_id, capabilities in self.devices.items():
            state = self.device_states[device_id]
            
            # Skip if device is not available
            if state.status not in [DeviceStatus.ONLINE, DeviceStatus.IDLE]:
                continue
            
            # Skip excluded devices
            if device_id in job_req.excluded_devices:
                continue
            
            # Check if device has enough resources
            available_cpu = capabilities.cpu_count - state.allocated_cpu_cores
            available_memory = capabilities.memory_available_gb - state.allocated_memory_gb
            available_gpu = capabilities.gpu_count - state.allocated_gpu_count
            
            if (available_cpu >= required_resources['cpu'] and
                available_memory >= required_resources['memory'] and
                (not job_req.requires_gpu or available_gpu >= required_resources['gpu'])):
                
                allocated_devices.append(device_id)
                
                # Update remaining requirements
                required_resources['cpu'] = 0
                required_resources['memory'] = 0
                required_resources['gpu'] = 0
                
                break
        
        return allocated_devices if required_resources['cpu'] <= 0 else []
    
    async def _best_fit_allocation(self, job_req: JobRequirements) -> List[str]:
        """Best-fit allocation strategy - minimize resource waste"""
        candidates = []
        
        for device_id, capabilities in self.devices.items():
            state = self.device_states[device_id]
            
            # Skip if device is not suitable
            if not await self._is_device_suitable(device_id, job_req):
                continue
            
            # Calculate fit score (lower is better)
            available_cpu = capabilities.cpu_count - state.allocated_cpu_cores
            available_memory = capabilities.memory_available_gb - state.allocated_memory_gb
            
            cpu_waste = available_cpu - job_req.min_cpu_cores
            memory_waste = available_memory - job_req.min_memory_gb
            
            if cpu_waste >= 0 and memory_waste >= 0:
                fit_score = cpu_waste + memory_waste
                candidates.append((fit_score, device_id))
        
        # Sort by fit score and select best
        candidates.sort(key=lambda x: x[0])
        
        if candidates:
            return [candidates[0][1]]
        
        return []
    
    async def _weighted_round_robin_allocation(self, job_req: JobRequirements) -> List[str]:
        """Weighted round-robin allocation based on device capabilities"""
        eligible_devices = []
        
        for device_id, capabilities in self.devices.items():
            if await self._is_device_suitable(device_id, job_req):
                # Calculate weight based on capabilities
                weight = self._calculate_device_weight(capabilities)
                eligible_devices.append((weight, device_id))
        
        if not eligible_devices:
            return []
        
        # Sort by weight and current load
        eligible_devices.sort(key=lambda x: (
            -x[0],  # Higher weight first
            self.device_states[x[1]].current_load  # Lower load first
        ))
        
        # Select devices based on requirements
        selected = []
        remaining_cpu = job_req.min_cpu_cores
        remaining_memory = job_req.min_memory_gb
        
        for weight, device_id in eligible_devices:
            selected.append(device_id)
            capabilities = self.devices[device_id]
            
            remaining_cpu -= capabilities.cpu_count
            remaining_memory -= capabilities.memory_available_gb
            
            if remaining_cpu <= 0 and remaining_memory <= 0:
                break
            
            if len(selected) >= job_req.max_devices:
                break
        
        return selected
    
    async def _locality_aware_allocation(self, job_req: JobRequirements) -> List[str]:
        """Allocate based on data locality to minimize data transfer"""
        if not job_req.data_locality:
            return await self._weighted_round_robin_allocation(job_req)
        
        # Find devices close to data
        devices_by_distance = []
        
        for device_id, capabilities in self.devices.items():
            if await self._is_device_suitable(device_id, job_req):
                # Calculate network distance to data
                distance = await self._calculate_network_distance(
                    device_id, 
                    job_req.data_locality
                )
                devices_by_distance.append((distance, device_id))
        
        # Sort by distance
        devices_by_distance.sort(key=lambda x: x[0])
        
        # Select closest devices
        selected = []
        for distance, device_id in devices_by_distance:
            selected.append(device_id)
            if len(selected) >= job_req.max_devices:
                break
        
        return selected
    
    async def _default_allocation(self, job_req: JobRequirements) -> List[str]:
        """Default allocation strategy"""
        return await self._weighted_round_robin_allocation(job_req)
    
    # Resource Management
    async def _is_device_suitable(self, device_id: str, job_req: JobRequirements) -> bool:
        """Check if device is suitable for job"""
        if device_id not in self.devices:
            return False
        
        capabilities = self.devices[device_id]
        state = self.device_states[device_id]
        
        # Check status
        if state.status not in [DeviceStatus.ONLINE, DeviceStatus.IDLE]:
            return False
        
        # Check exclusions
        if device_id in job_req.excluded_devices:
            return False
        
        # Check preferences
        if job_req.preferred_devices and device_id not in job_req.preferred_devices:
            return False
        
        # Check available resources
        available_cpu = capabilities.cpu_count - state.allocated_cpu_cores
        available_memory = capabilities.memory_available_gb - state.allocated_memory_gb
        available_gpu = capabilities.gpu_count - state.allocated_gpu_count
        
        if available_cpu < job_req.min_cpu_cores / job_req.max_devices:
            return False
        
        if available_memory < job_req.min_memory_gb / job_req.max_devices:
            return False
        
        if job_req.requires_gpu and available_gpu < 1:
            return False
        
        return True
    
    def _calculate_device_weight(self, capabilities: DeviceCapabilities) -> float:
        """Calculate device weight for scheduling"""
        # Weighted sum of capabilities
        cpu_weight = capabilities.cpu_count * capabilities.cpu_freq_mhz / 1000
        memory_weight = capabilities.memory_total_gb
        gpu_weight = capabilities.gpu_count * 10 if capabilities.gpu_count > 0 else 0
        network_weight = capabilities.network_bandwidth_mbps / 1000
        reliability_weight = capabilities.reliability_score * 10
        
        total_weight = (
            cpu_weight * 0.3 +
            memory_weight * 0.2 +
            gpu_weight * 0.2 +
            network_weight * 0.1 +
            reliability_weight * 0.2
        )
        
        return total_weight
    
    def _calculate_device_load(self, state: DeviceState) -> float:
        """Calculate overall device load"""
        # Weighted average of resource utilization
        cpu_weight = 0.4
        memory_weight = 0.3
        gpu_weight = 0.2 if state.gpu_usage is not None else 0
        network_weight = 0.1
        
        load = (
            state.cpu_usage * cpu_weight +
            state.memory_usage * memory_weight +
            (state.gpu_usage or 0) * gpu_weight +
            state.network_usage * network_weight
        )
        
        return min(100, load)
    
    # Job Execution
    async def _start_job_execution(self, job_req: JobRequirements, allocation: JobAllocation):
        """Start executing a job on allocated devices"""
        print(f"Starting job {job_req.job_id} on devices: {allocation.allocated_devices}")
        
        # Create execution tasks for each device
        tasks = []
        for device_id in allocation.allocated_devices:
            task = asyncio.create_task(
                self._execute_on_device(job_req, device_id, allocation)
            )
            tasks.append(task)
        
        # Monitor execution
        asyncio.create_task(self._monitor_job_execution(job_req.job_id, tasks))
    
    async def _execute_on_device(self, job_req: JobRequirements, 
                                device_id: str, allocation: JobAllocation):
        """Execute job on a specific device"""
        # This would communicate with the actual device agent
        # For now, simulate execution
        await asyncio.sleep(job_req.estimated_duration_seconds)
        
        # Update device state
        state = self.device_states[device_id]
        state.assigned_jobs.remove(job_req.job_id)
        state.allocated_cpu_cores -= job_req.min_cpu_cores // len(allocation.allocated_devices)
        state.allocated_memory_gb -= job_req.min_memory_gb / len(allocation.allocated_devices)
        if job_req.requires_gpu:
            state.allocated_gpu_count -= 1
        
        state.total_jobs_completed += 1
    
    async def _monitor_job_execution(self, job_id: str, tasks: List[asyncio.Task]):
        """Monitor job execution across devices"""
        try:
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check for failures
            failures = [r for r in results if isinstance(r, Exception)]
            
            if failures:
                print(f"Job {job_id} failed with {len(failures)} errors")
                await self._handle_job_failure(job_id, failures)
            else:
                print(f"Job {job_id} completed successfully")
                await self._handle_job_completion(job_id)
                
        except Exception as e:
            print(f"Error monitoring job {job_id}: {e}")
            await self._handle_job_failure(job_id, [e])
    
    async def _handle_job_completion(self, job_id: str):
        """Handle successful job completion"""
        if job_id in self.running_jobs:
            allocation = self.running_jobs[job_id]
            
            # Update statistics
            for device_id in allocation.allocated_devices:
                if device_id in self.device_states:
                    self.device_states[device_id].total_jobs_completed += 1
            
            # Move to completed
            self.completed_jobs.add(job_id)
            del self.running_jobs[job_id]
            
            # Record in history
            self.job_history.append({
                'job_id': job_id,
                'status': 'completed',
                'completion_time': datetime.utcnow().isoformat(),
                'devices': allocation.allocated_devices
            })
    
    async def _handle_job_failure(self, job_id: str, errors: List[Exception]):
        """Handle job failure"""
        if job_id in self.running_jobs:
            allocation = self.running_jobs[job_id]
            
            # Update statistics
            for device_id in allocation.allocated_devices:
                if device_id in self.device_states:
                    self.device_states[device_id].total_jobs_failed += 1
                    self.device_states[device_id].error_count += 1
            
            # Record failure
            self.job_history.append({
                'job_id': job_id,
                'status': 'failed',
                'failure_time': datetime.utcnow().isoformat(),
                'errors': [str(e) for e in errors],
                'devices': allocation.allocated_devices
            })
            
            # Attempt retry or reallocation
            # This would implement retry logic
            del self.running_jobs[job_id]
    
    # Load Balancing
    async def rebalance_load(self):
        """Rebalance load across devices"""
        print("Rebalancing workload...")
        
        # Calculate average load
        total_load = sum(state.current_load for state in self.device_states.values())
        avg_load = total_load / len(self.device_states) if self.device_states else 0
        
        # Identify overloaded and underloaded devices
        overloaded = []
        underloaded = []
        
        for device_id, state in self.device_states.items():
            if state.current_load > avg_load * 1.2:
                overloaded.append(device_id)
            elif state.current_load < avg_load * 0.8:
                underloaded.append(device_id)
        
        # Migrate jobs from overloaded to underloaded devices
        for over_device in overloaded:
            if not underloaded:
                break
            
            # Select jobs to migrate
            jobs_to_migrate = self._select_jobs_for_migration(over_device)
            
            for job_id in jobs_to_migrate:
                # Find suitable underloaded device
                target_device = underloaded[0]
                
                # Migrate job
                await self._migrate_job(job_id, over_device, target_device)
                
                # Update load estimates
                self.device_states[over_device].current_load -= 10
                self.device_states[target_device].current_load += 10
                
                # Remove target from underloaded if now balanced
                if self.device_states[target_device].current_load >= avg_load:
                    underloaded.remove(target_device)
    
    def _select_jobs_for_migration(self, device_id: str) -> List[str]:
        """Select jobs suitable for migration"""
        state = self.device_states[device_id]
        
        # For now, select up to 2 jobs
        # In practice, would consider job characteristics
        return state.assigned_jobs[:2]
    
    async def _migrate_job(self, job_id: str, source_device: str, target_device: str):
        """Migrate a job from one device to another"""
        print(f"Migrating job {job_id} from {source_device} to {target_device}")
        
        # This would involve:
        # 1. Checkpoint job on source
        # 2. Transfer checkpoint to target
        # 3. Resume job on target
        # 4. Update allocation records
        
        # For now, just update tracking
        if job_id in self.device_states[source_device].assigned_jobs:
            self.device_states[source_device].assigned_jobs.remove(job_id)
            self.device_states[target_device].assigned_jobs.append(job_id)
    
    # Optimization
    def _estimate_completion_time(self, job_req: JobRequirements, 
                                 devices: List[str]) -> datetime:
        """Estimate job completion time"""
        if not devices:
            return datetime.utcnow() + timedelta(hours=24)
        
        # Calculate total computing power
        total_flops = sum(
            self.devices[d].flops for d in devices
        )
        
        # Estimate based on job complexity and resources
        # This is simplified - real estimation would be more complex
        base_time = job_req.estimated_duration_seconds
        
        # Adjust for parallelization efficiency
        parallel_efficiency = 0.8 if len(devices) > 1 else 1.0
        adjusted_time = base_time / (len(devices) * parallel_efficiency)
        
        # Add data transfer overhead
        transfer_overhead = job_req.data_size_gb * 10  # 10 seconds per GB
        
        total_seconds = adjusted_time + transfer_overhead
        
        return datetime.utcnow() + timedelta(seconds=total_seconds)
    
    async def _create_data_transfer_plan(self, job_req: JobRequirements, 
                                        devices: List[str]) -> Dict[str, List[str]]:
        """Create optimal data transfer plan"""
        plan = {}
        
        # Simple sharding strategy
        data_chunks = self._shard_data(job_req.data_size_gb, len(devices))
        
        for i, device_id in enumerate(devices):
            plan[device_id] = [f"chunk_{i}"]
        
        return plan
    
    def _shard_data(self, total_size_gb: float, num_shards: int) -> List[float]:
        """Shard data into chunks"""
        chunk_size = total_size_gb / num_shards
        return [chunk_size] * num_shards
    
    # Monitoring
    async def _device_discovery_loop(self):
        """Continuously discover new devices"""
        while True:
            await asyncio.sleep(self.device_discovery_interval)
            # This would implement actual device discovery
            # For now, just log
            print(f"Device discovery: {len(self.devices)} devices online")
    
    async def _scheduling_loop(self):
        """Main scheduling loop"""
        while True:
            await asyncio.sleep(1)
            
            # Process job queue
            if not self.job_queue.empty():
                priority, job_req = self.job_queue.get()
                
                # Try to allocate resources
                allocation = await self._allocate_resources(job_req)
                if allocation:
                    self.running_jobs[job_req.job_id] = allocation
                    await self._start_job_execution(job_req, allocation)
                else:
                    # Put back in queue
                    self.job_queue.put((priority, job_req))
    
    async def _load_balancing_loop(self):
        """Periodic load balancing"""
        while True:
            await asyncio.sleep(30)  # Every 30 seconds
            
            # Check if rebalancing needed
            loads = [state.current_load for state in self.device_states.values()]
            if loads:
                std_dev = np.std(loads)
                if std_dev > 20:  # High load imbalance
                    await self.rebalance_load()
    
    async def _health_monitoring_loop(self):
        """Monitor device health"""
        while True:
            await asyncio.sleep(5)
            
            current_time = datetime.utcnow()
            
            for device_id, state in self.device_states.items():
                # Check heartbeat
                time_since_heartbeat = (current_time - state.last_heartbeat).total_seconds()
                
                if time_since_heartbeat > self.heartbeat_timeout:
                    if state.status != DeviceStatus.OFFLINE:
                        print(f"Device {device_id} is offline")
                        state.status = DeviceStatus.OFFLINE
                        
                        # Handle jobs on offline device
                        await self._handle_device_failure(device_id)
    
    async def _handle_device_failure(self, device_id: str):
        """Handle device failure"""
        state = self.device_states[device_id]
        
        # Reschedule jobs from failed device
        for job_id in state.assigned_jobs:
            print(f"Rescheduling job {job_id} from failed device {device_id}")
            # This would implement job recovery
    
    # Utility Methods
    async def _benchmark_cpu(self, device_info: Dict) -> float:
        """Benchmark CPU performance"""
        # Simplified benchmark - would run actual tests
        return device_info['cpu_count'] * device_info['cpu_freq'] / 1000
    
    async def _measure_network_latency(self, ip_address: str) -> float:
        """Measure network latency to device"""
        # Simplified - would actually ping
        return np.random.uniform(0.1, 10.0)
    
    async def _calculate_network_distance(self, device_id: str, data_location: str) -> float:
        """Calculate network distance between device and data"""
        # Simplified - would use actual network topology
        return np.random.uniform(1, 100)
    
    def _calculate_flops(self, device_info: Dict) -> float:
        """Calculate FLOPS for device"""
        # Simplified calculation
        cpu_flops = device_info['cpu_count'] * device_info['cpu_freq'] * 1e6 * 4  # 4 ops per cycle
        gpu_flops = 0
        
        if device_info.get('gpu_count', 0) > 0:
            # Rough estimate for GPU
            gpu_flops = device_info['gpu_count'] * 10e12  # 10 TFLOPS per GPU
        
        return cpu_flops + gpu_flops
    
    async def _validate_job_requirements(self, job_req: JobRequirements) -> bool:
        """Validate job requirements"""
        # Check if requirements are feasible
        total_cpu = sum(d.cpu_count for d in self.devices.values())
        total_memory = sum(d.memory_total_gb for d in self.devices.values())
        total_gpu = sum(d.gpu_count for d in self.devices.values())
        
        if job_req.min_cpu_cores > total_cpu:
            return False
        
        if job_req.min_memory_gb > total_memory:
            return False
        
        if job_req.requires_gpu and total_gpu == 0:
            return False
        
        return True
    
    async def _check_resource_availability(self, job_req: JobRequirements) -> bool:
        """Check if resources are available for job"""
        available_cpu = 0
        available_memory = 0
        available_gpu = 0
        
        for device_id, capabilities in self.devices.items():
            state = self.device_states[device_id]
            
            if state.status in [DeviceStatus.ONLINE, DeviceStatus.IDLE]:
                available_cpu += capabilities.cpu_count - state.allocated_cpu_cores
                available_memory += capabilities.memory_available_gb - state.allocated_memory_gb
                available_gpu += capabilities.gpu_count - state.allocated_gpu_count
        
        return (available_cpu >= job_req.min_cpu_cores and
                available_memory >= job_req.min_memory_gb and
                (not job_req.requires_gpu or available_gpu > 0))
    
    # Status and Metrics
    def get_cluster_status(self) -> Dict:
        """Get current cluster status"""
        return {
            'total_devices': len(self.devices),
            'online_devices': sum(1 for s in self.device_states.values() 
                                if s.status != DeviceStatus.OFFLINE),
            'total_cpu_cores': sum(d.cpu_count for d in self.devices.values()),
            'total_memory_gb': sum(d.memory_total_gb for d in self.devices.values()),
            'total_gpu_count': sum(d.gpu_count for d in self.devices.values()),
            'running_jobs': len(self.running_jobs),
            'queued_jobs': self.job_queue.qsize(),
            'completed_jobs': len(self.completed_jobs),
            'average_load': np.mean([s.current_load for s in self.device_states.values()])
                           if self.device_states else 0
        }
    
    def get_device_metrics(self, device_id: str) -> Optional[Dict]:
        """Get metrics for specific device"""
        if device_id not in self.devices:
            return None
        
        capabilities = self.devices[device_id]
        state = self.device_states[device_id]
        
        return {
            'device_id': device_id,
            'hostname': capabilities.hostname,
            'status': state.status.value,
            'current_load': state.current_load,
            'cpu_usage': state.cpu_usage,
            'memory_usage': state.memory_usage,
            'gpu_usage': state.gpu_usage,
            'assigned_jobs': state.assigned_jobs,
            'jobs_completed': state.total_jobs_completed,
            'jobs_failed': state.total_jobs_failed,
            'uptime': state.uptime_seconds,
            'reliability_score': capabilities.reliability_score
        }