"""
Job Executor
Worker process for executing queued jobs
"""

import asyncio
import signal
import sys
import traceback
from datetime import datetime
from typing import Dict, Optional, Any, List
import logging
import psutil
import GPUtil
import platform
import socket
from dataclasses import dataclass
import uuid

from .job_queue_manager import JobQueueManager, JobDefinition, JobStatus

logger = logging.getLogger(__name__)


@dataclass
class WorkerCapabilities:
    """Worker capabilities and resources"""
    worker_id: str
    hostname: str
    ip_address: str
    has_gpu: bool
    gpu_count: int
    gpu_memory_gb: float
    available_memory_gb: float
    available_cpu_cores: int
    max_concurrent_jobs: int
    supported_job_types: List[str]


class JobExecutor:
    """
    Job executor that pulls and executes jobs from the queue
    """
    
    def __init__(self, queue_manager: JobQueueManager, config: Dict):
        self.queue_manager = queue_manager
        self.config = config
        self.worker_id = config.get('worker_id', str(uuid.uuid4()))
        self.running = False
        self.current_jobs: Dict[str, asyncio.Task] = {}
        self.capabilities = self._detect_capabilities()
        self.shutdown_event = asyncio.Event()
        
        # Performance tracking
        self.jobs_processed = 0
        self.total_execution_time = 0
        self.start_time = datetime.utcnow()
        
    def _detect_capabilities(self) -> WorkerCapabilities:
        """Detect worker capabilities"""
        # Get system info
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        
        # Check GPU availability
        gpus = GPUtil.getGPUs()
        has_gpu = len(gpus) > 0
        gpu_count = len(gpus)
        gpu_memory_gb = sum(gpu.memoryTotal / 1024 for gpu in gpus) if gpus else 0
        
        # Get available resources
        memory = psutil.virtual_memory()
        available_memory_gb = memory.available / (1024 ** 3)
        available_cpu_cores = psutil.cpu_count()
        
        # Configuration
        max_concurrent = self.config.get('max_concurrent_jobs', 5)
        supported_types = self.config.get('supported_job_types', [])
        
        return WorkerCapabilities(
            worker_id=self.worker_id,
            hostname=hostname,
            ip_address=ip_address,
            has_gpu=has_gpu,
            gpu_count=gpu_count,
            gpu_memory_gb=gpu_memory_gb,
            available_memory_gb=available_memory_gb,
            available_cpu_cores=available_cpu_cores,
            max_concurrent_jobs=max_concurrent,
            supported_job_types=supported_types
        )
    
    async def start(self):
        """Start the job executor"""
        self.running = True
        logger.info(f"Starting job executor {self.worker_id}")
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        
        # Start worker tasks
        tasks = [
            asyncio.create_task(self._job_processing_loop()),
            asyncio.create_task(self._health_check_loop()),
            asyncio.create_task(self._resource_monitor_loop())
        ]
        
        # Wait for shutdown
        await self.shutdown_event.wait()
        
        # Cancel all tasks
        for task in tasks:
            task.cancel()
        
        # Wait for current jobs to complete
        await self._graceful_shutdown()
        
        logger.info(f"Job executor {self.worker_id} stopped")
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signal"""
        logger.info(f"Received signal {signum}, initiating shutdown")
        self.running = False
        self.shutdown_event.set()
    
    async def _graceful_shutdown(self):
        """Gracefully shutdown executor"""
        logger.info("Starting graceful shutdown")
        
        # Stop accepting new jobs
        self.running = False
        
        # Wait for current jobs to complete (with timeout)
        if self.current_jobs:
            logger.info(f"Waiting for {len(self.current_jobs)} jobs to complete")
            
            try:
                await asyncio.wait_for(
                    self._wait_for_jobs_completion(),
                    timeout=self.config.get('shutdown_timeout', 60)
                )
            except asyncio.TimeoutError:
                logger.warning("Shutdown timeout reached, cancelling remaining jobs")
                for job_id, task in self.current_jobs.items():
                    task.cancel()
                    await self.queue_manager.fail_job(
                        job_id,
                        "Worker shutdown",
                        self.worker_id
                    )
    
    async def _wait_for_jobs_completion(self):
        """Wait for all current jobs to complete"""
        while self.current_jobs:
            await asyncio.sleep(1)
    
    async def _job_processing_loop(self):
        """Main job processing loop"""
        while self.running:
            try:
                # Check if we can accept more jobs
                if len(self.current_jobs) >= self.capabilities.max_concurrent_jobs:
                    await asyncio.sleep(1)
                    continue
                
                # Get current resource availability
                current_capabilities = self._get_current_capabilities()
                
                # Get next job from queue
                job = await self.queue_manager.get_next_job(
                    self.worker_id,
                    current_capabilities
                )
                
                if job:
                    # Start job execution
                    task = asyncio.create_task(self._execute_job(job))
                    self.current_jobs[job.job_id] = task
                    
                    # Clean up completed tasks
                    completed = [
                        job_id for job_id, task in self.current_jobs.items()
                        if task.done()
                    ]
                    for job_id in completed:
                        del self.current_jobs[job_id]
                else:
                    # No jobs available, wait before checking again
                    await asyncio.sleep(
                        self.config.get('poll_interval', 5)
                    )
                    
            except Exception as e:
                logger.error(f"Error in job processing loop: {e}")
                await asyncio.sleep(5)
    
    def _get_current_capabilities(self) -> Dict:
        """Get current available resources"""
        memory = psutil.virtual_memory()
        
        # Adjust for currently running jobs
        used_memory = len(self.current_jobs) * 2  # Assume 2GB per job
        used_cores = len(self.current_jobs) * 2  # Assume 2 cores per job
        
        return {
            'has_gpu': self.capabilities.has_gpu,
            'available_memory_gb': max(0, memory.available / (1024 ** 3) - used_memory),
            'available_cpu_cores': max(0, self.capabilities.available_cpu_cores - used_cores)
        }
    
    async def _execute_job(self, job: JobDefinition):
        """Execute a single job"""
        start_time = datetime.utcnow()
        logger.info(f"Starting execution of job {job.job_id} (type: {job.job_type})")
        
        try:
            # Check for cancellation
            if await self._is_job_cancelled(job.job_id):
                logger.info(f"Job {job.job_id} was cancelled")
                return
            
            # Execute job based on type
            result = await self._dispatch_job(job)
            
            # Mark job as completed
            await self.queue_manager.complete_job(
                job.job_id,
                result,
                self.worker_id
            )
            
            # Update statistics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.jobs_processed += 1
            self.total_execution_time += execution_time
            
            logger.info(f"Job {job.job_id} completed in {execution_time:.2f} seconds")
            
        except asyncio.CancelledError:
            # Job was cancelled
            logger.info(f"Job {job.job_id} execution cancelled")
            raise
            
        except Exception as e:
            # Job failed
            error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            logger.error(f"Job {job.job_id} failed: {error_msg}")
            
            await self.queue_manager.fail_job(
                job.job_id,
                error_msg,
                self.worker_id
            )
        
        finally:
            # Remove from current jobs
            self.current_jobs.pop(job.job_id, None)
    
    async def _dispatch_job(self, job: JobDefinition) -> Any:
        """Dispatch job to appropriate handler"""
        # Try to use registered handler
        try:
            result = await self.queue_manager.execute_job(job)
            return result
        except ValueError:
            # No registered handler, use built-in handlers
            pass
        
        # Built-in job handlers
        if job.job_type == "data_processing":
            return await self._handle_data_processing(job)
        elif job.job_type == "model_training":
            return await self._handle_model_training(job)
        elif job.job_type == "batch_prediction":
            return await self._handle_batch_prediction(job)
        elif job.job_type == "data_export":
            return await self._handle_data_export(job)
        elif job.job_type == "report_generation":
            return await self._handle_report_generation(job)
        elif job.job_type == "cleanup":
            return await self._handle_cleanup(job)
        else:
            raise ValueError(f"Unknown job type: {job.job_type}")
    
    async def _handle_data_processing(self, job: JobDefinition) -> Dict:
        """Handle data processing job"""
        payload = job.payload
        
        # Simulate data processing
        dataset_id = payload.get('dataset_id')
        processing_type = payload.get('processing_type', 'clean')
        
        logger.info(f"Processing dataset {dataset_id} with type {processing_type}")
        
        # Simulate processing steps
        steps = ['load', 'validate', 'clean', 'transform', 'save']
        for step in steps:
            await asyncio.sleep(1)  # Simulate work
            logger.info(f"Dataset {dataset_id}: {step} completed")
            
            # Check for cancellation
            if await self._is_job_cancelled(job.job_id):
                raise asyncio.CancelledError()
        
        return {
            'dataset_id': dataset_id,
            'rows_processed': 10000,
            'processing_type': processing_type,
            'output_path': f"/data/processed/{dataset_id}.parquet"
        }
    
    async def _handle_model_training(self, job: JobDefinition) -> Dict:
        """Handle model training job"""
        payload = job.payload
        
        model_id = payload.get('model_id')
        dataset_id = payload.get('dataset_id')
        hyperparameters = payload.get('hyperparameters', {})
        
        logger.info(f"Training model {model_id} on dataset {dataset_id}")
        
        # Simulate training epochs
        epochs = hyperparameters.get('epochs', 10)
        for epoch in range(epochs):
            await asyncio.sleep(2)  # Simulate training time
            
            # Log progress
            logger.info(f"Model {model_id}: Epoch {epoch + 1}/{epochs}, loss: {0.5 - epoch * 0.05:.3f}")
            
            # Check for cancellation
            if await self._is_job_cancelled(job.job_id):
                raise asyncio.CancelledError()
        
        return {
            'model_id': model_id,
            'accuracy': 0.95,
            'loss': 0.05,
            'model_path': f"/models/{model_id}/model.pkl"
        }
    
    async def _handle_batch_prediction(self, job: JobDefinition) -> Dict:
        """Handle batch prediction job"""
        payload = job.payload
        
        model_id = payload.get('model_id')
        input_path = payload.get('input_path')
        output_path = payload.get('output_path')
        
        logger.info(f"Running batch prediction with model {model_id}")
        
        # Simulate prediction
        await asyncio.sleep(5)
        
        return {
            'model_id': model_id,
            'predictions_count': 5000,
            'output_path': output_path or f"/predictions/{job.job_id}.csv"
        }
    
    async def _handle_data_export(self, job: JobDefinition) -> Dict:
        """Handle data export job"""
        payload = job.payload
        
        source = payload.get('source')
        format = payload.get('format', 'csv')
        destination = payload.get('destination')
        
        logger.info(f"Exporting data from {source} to {format}")
        
        # Simulate export
        await asyncio.sleep(3)
        
        return {
            'source': source,
            'format': format,
            'rows_exported': 10000,
            'export_path': destination or f"/exports/{job.job_id}.{format}"
        }
    
    async def _handle_report_generation(self, job: JobDefinition) -> Dict:
        """Handle report generation job"""
        payload = job.payload
        
        report_type = payload.get('report_type')
        parameters = payload.get('parameters', {})
        
        logger.info(f"Generating {report_type} report")
        
        # Simulate report generation
        await asyncio.sleep(4)
        
        return {
            'report_type': report_type,
            'report_path': f"/reports/{job.job_id}.pdf",
            'pages': 10
        }
    
    async def _handle_cleanup(self, job: JobDefinition) -> Dict:
        """Handle cleanup job"""
        payload = job.payload
        
        cleanup_type = payload.get('cleanup_type', 'temp_files')
        older_than_days = payload.get('older_than_days', 7)
        
        logger.info(f"Running {cleanup_type} cleanup for items older than {older_than_days} days")
        
        # Simulate cleanup
        await asyncio.sleep(2)
        
        return {
            'cleanup_type': cleanup_type,
            'items_cleaned': 150,
            'space_freed_mb': 1024
        }
    
    async def _is_job_cancelled(self, job_id: str) -> bool:
        """Check if job has been cancelled"""
        # Check cancellation flag in Redis
        # This would need to be implemented in the queue manager
        return False
    
    async def _health_check_loop(self):
        """Periodic health check"""
        while self.running:
            try:
                await asyncio.sleep(30)
                
                # Report health status
                health = {
                    'worker_id': self.worker_id,
                    'status': 'healthy',
                    'current_jobs': len(self.current_jobs),
                    'jobs_processed': self.jobs_processed,
                    'uptime_seconds': (datetime.utcnow() - self.start_time).total_seconds(),
                    'cpu_usage': psutil.cpu_percent(),
                    'memory_usage': psutil.virtual_memory().percent
                }
                
                logger.debug(f"Health check: {health}")
                
                # This could be sent to a monitoring service
                
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    async def _resource_monitor_loop(self):
        """Monitor resource usage"""
        while self.running:
            try:
                await asyncio.sleep(10)
                
                # Check resource usage
                memory = psutil.virtual_memory()
                cpu_percent = psutil.cpu_percent(interval=1)
                
                # Log warnings if resources are low
                if memory.percent > 90:
                    logger.warning(f"High memory usage: {memory.percent}%")
                
                if cpu_percent > 90:
                    logger.warning(f"High CPU usage: {cpu_percent}%")
                
                # Check disk space
                disk = psutil.disk_usage('/')
                if disk.percent > 90:
                    logger.warning(f"Low disk space: {disk.percent}% used")
                
            except Exception as e:
                logger.error(f"Resource monitor error: {e}")
    
    def get_statistics(self) -> Dict:
        """Get executor statistics"""
        uptime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            'worker_id': self.worker_id,
            'uptime_seconds': uptime,
            'jobs_processed': self.jobs_processed,
            'current_jobs': len(self.current_jobs),
            'average_execution_time': (
                self.total_execution_time / self.jobs_processed
                if self.jobs_processed > 0 else 0
            ),
            'jobs_per_hour': (
                self.jobs_processed / (uptime / 3600)
                if uptime > 0 else 0
            ),
            'capabilities': {
                'max_concurrent': self.capabilities.max_concurrent_jobs,
                'has_gpu': self.capabilities.has_gpu,
                'supported_types': self.capabilities.supported_job_types
            }
        }


async def main():
    """Main entry point for job executor"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    config = {
        'worker_id': f"worker-{uuid.uuid4().hex[:8]}",
        'max_concurrent_jobs': 5,
        'poll_interval': 5,
        'shutdown_timeout': 60,
        'supported_job_types': [
            'data_processing',
            'model_training',
            'batch_prediction',
            'data_export',
            'report_generation',
            'cleanup'
        ]
    }
    
    # Initialize queue manager
    queue_config = {
        'redis_url': 'redis://localhost:6379'
    }
    queue_manager = JobQueueManager(queue_config)
    await queue_manager.initialize()
    
    # Create and start executor
    executor = JobExecutor(queue_manager, config)
    
    try:
        await executor.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    finally:
        # Print statistics
        stats = executor.get_statistics()
        logger.info(f"Executor statistics: {stats}")


if __name__ == "__main__":
    asyncio.run(main())