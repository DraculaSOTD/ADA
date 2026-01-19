"""
Startup script for initializing background services
Handles data lifecycle management and workspace cleanup
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from services.data_lifecycle_service import get_lifecycle_manager
from services.workspace_manager import get_workspace_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackgroundServiceManager:
    """Manages background services for the application"""
    
    def __init__(self):
        self.lifecycle_manager = None
        self.workspace_manager = None
        self.cleanup_task = None
        self.expiry_check_task = None
        
    async def start_services(self):
        """Start all background services"""
        try:
            logger.info("Starting background services...")
            
            # Initialize managers
            self.lifecycle_manager = get_lifecycle_manager()
            self.workspace_manager = get_workspace_manager()
            
            # Start data lifecycle cleanup service
            self.cleanup_task = asyncio.create_task(
                self.lifecycle_manager.start_background_cleanup()
            )
            logger.info("Data lifecycle cleanup service started")
            
            # Start expiry check service (runs every 30 minutes)
            self.expiry_check_task = asyncio.create_task(
                self._run_expiry_checks()
            )
            logger.info("Data expiry notification service started")
            
            # Force cleanup orphaned workspaces on startup
            cleanup_result = self.workspace_manager.force_cleanup_orphaned_workspaces()
            logger.info(f"Orphaned workspace cleanup: {cleanup_result}")
            
            logger.info("All background services started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start background services: {e}")
            raise
    
    async def _run_expiry_checks(self):
        """Periodically check for expiring data and send notifications"""
        while True:
            try:
                await self.lifecycle_manager.check_expiring_data()
                await asyncio.sleep(1800)  # Check every 30 minutes
            except Exception as e:
                logger.error(f"Error in expiry check service: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def stop_services(self):
        """Stop all background services gracefully"""
        try:
            logger.info("Stopping background services...")
            
            # Cancel background tasks
            if self.cleanup_task:
                self.cleanup_task.cancel()
                try:
                    await self.cleanup_task
                except asyncio.CancelledError:
                    pass
            
            if self.expiry_check_task:
                self.expiry_check_task.cancel()
                try:
                    await self.expiry_check_task
                except asyncio.CancelledError:
                    pass
            
            logger.info("All background services stopped")
            
        except Exception as e:
            logger.error(f"Error stopping background services: {e}")


# Global service manager instance
service_manager = BackgroundServiceManager()


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator:
    """
    Lifespan context manager for FastAPI application
    Starts services on startup, stops them on shutdown
    """
    # Startup
    await service_manager.start_services()
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    await service_manager.stop_services()
    logger.info("Application shutdown complete")


# Standalone runner for testing
async def main():
    """Run services standalone for testing"""
    logger.info("Starting background services in standalone mode...")
    
    try:
        manager = BackgroundServiceManager()
        await manager.start_services()
        
        # Keep running until interrupted
        while True:
            await asyncio.sleep(60)
            logger.info("Background services running...")
            
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
        await manager.stop_services()
    except Exception as e:
        logger.error(f"Service error: {e}")


if __name__ == "__main__":
    # Run standalone for testing
    asyncio.run(main())