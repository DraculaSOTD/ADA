"""
WebSocket Service for Real-time Training Updates
Manages WebSocket connections and broadcasts training progress
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Any, Optional
import json
import asyncio
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class MessageType(Enum):
    CONNECTION = "connection"
    TRAINING_PROGRESS = "training_progress"
    TRAINING_COMPLETE = "training_complete"
    TRAINING_FAILED = "training_failed"
    MODEL_UPDATE = "model_update"
    VALIDATION_PROGRESS = "validation_progress"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"

@dataclass
class WSMessage:
    type: MessageType
    data: Dict[str, Any]
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
    
    def to_json(self) -> str:
        return json.dumps({
            'type': self.type.value,
            'data': self.data,
            'timestamp': self.timestamp
        })

class ConnectionManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Store job subscriptions (job_id -> set of user_ids)
        self.job_subscriptions: Dict[str, Set[int]] = {}
        # Store user -> jobs mapping for cleanup
        self.user_jobs: Dict[int, Set[str]] = {}
        # Background tasks for each connection
        self.background_tasks: Dict[WebSocket, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Add to active connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Send connection confirmation
        await self.send_personal_message(
            WSMessage(
                type=MessageType.CONNECTION,
                data={"status": "connected", "user_id": user_id}
            ),
            websocket
        )
        
        # Start ping/pong to keep connection alive
        self.background_tasks[websocket] = asyncio.create_task(
            self._keepalive(websocket, user_id)
        )
        
        logger.info(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # Clean up if no more connections for this user
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Clean up job subscriptions
                if user_id in self.user_jobs:
                    for job_id in self.user_jobs[user_id]:
                        if job_id in self.job_subscriptions:
                            self.job_subscriptions[job_id].discard(user_id)
                            if not self.job_subscriptions[job_id]:
                                del self.job_subscriptions[job_id]
                    del self.user_jobs[user_id]
        
        # Cancel background task
        if websocket in self.background_tasks:
            self.background_tasks[websocket].cancel()
            del self.background_tasks[websocket]
        
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def subscribe_to_job(self, user_id: int, job_id: str) -> None:
        """Subscribe a user to training job updates"""
        if job_id not in self.job_subscriptions:
            self.job_subscriptions[job_id] = set()
        self.job_subscriptions[job_id].add(user_id)
        
        if user_id not in self.user_jobs:
            self.user_jobs[user_id] = set()
        self.user_jobs[user_id].add(job_id)
        
        logger.info(f"User {user_id} subscribed to job {job_id}")
    
    async def unsubscribe_from_job(self, user_id: int, job_id: str) -> None:
        """Unsubscribe a user from training job updates"""
        if job_id in self.job_subscriptions:
            self.job_subscriptions[job_id].discard(user_id)
            if not self.job_subscriptions[job_id]:
                del self.job_subscriptions[job_id]
        
        if user_id in self.user_jobs:
            self.user_jobs[user_id].discard(job_id)
        
        logger.info(f"User {user_id} unsubscribed from job {job_id}")
    
    async def send_personal_message(self, message: WSMessage, websocket: WebSocket) -> None:
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message.to_json())
        except Exception as e:
            logger.error(f"Error sending message to websocket: {e}")
    
    async def send_user_message(self, message: WSMessage, user_id: int) -> None:
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected_sockets = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message.to_json())
                except:
                    disconnected_sockets.append(connection)
            
            # Clean up disconnected sockets
            for socket in disconnected_sockets:
                self.disconnect(socket, user_id)
    
    async def broadcast_job_update(self, job_id: str, message: WSMessage) -> None:
        """Broadcast a message to all users subscribed to a job"""
        if job_id in self.job_subscriptions:
            for user_id in self.job_subscriptions[job_id]:
                await self.send_user_message(message, user_id)
    
    async def broadcast_to_all(self, message: WSMessage) -> None:
        """Broadcast a message to all connected users"""
        for user_id in list(self.active_connections.keys()):
            await self.send_user_message(message, user_id)
    
    async def send_training_progress(self, job_id: str, progress_data: Dict[str, Any]) -> None:
        """Send training progress update to subscribed users"""
        message = WSMessage(
            type=MessageType.TRAINING_PROGRESS,
            data={
                "job_id": job_id,
                **progress_data
            }
        )
        await self.broadcast_job_update(job_id, message)
    
    async def send_training_complete(self, job_id: str, result_data: Dict[str, Any]) -> None:
        """Send training completion notification"""
        message = WSMessage(
            type=MessageType.TRAINING_COMPLETE,
            data={
                "job_id": job_id,
                **result_data
            }
        )
        await self.broadcast_job_update(job_id, message)
    
    async def send_training_failed(self, job_id: str, error_data: Dict[str, Any]) -> None:
        """Send training failure notification"""
        message = WSMessage(
            type=MessageType.TRAINING_FAILED,
            data={
                "job_id": job_id,
                **error_data
            }
        )
        await self.broadcast_job_update(job_id, message)
    
    async def send_validation_progress(self, user_id: int, progress_data: Dict[str, Any]) -> None:
        """Send data validation progress update"""
        message = WSMessage(
            type=MessageType.VALIDATION_PROGRESS,
            data=progress_data
        )
        await self.send_user_message(message, user_id)
    
    async def _keepalive(self, websocket: WebSocket, user_id: int) -> None:
        """Send periodic ping messages to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # Ping every 30 seconds
                await self.send_personal_message(
                    WSMessage(type=MessageType.PING, data={}),
                    websocket
                )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Keepalive error for user {user_id}: {e}")
            self.disconnect(websocket, user_id)
    
    async def handle_message(self, websocket: WebSocket, user_id: int, message: str) -> None:
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'subscribe':
                job_id = data.get('job_id')
                if job_id:
                    await self.subscribe_to_job(user_id, job_id)
                    await self.send_personal_message(
                        WSMessage(
                            type=MessageType.CONNECTION,
                            data={"status": "subscribed", "job_id": job_id}
                        ),
                        websocket
                    )
            
            elif message_type == 'unsubscribe':
                job_id = data.get('job_id')
                if job_id:
                    await self.unsubscribe_from_job(user_id, job_id)
                    await self.send_personal_message(
                        WSMessage(
                            type=MessageType.CONNECTION,
                            data={"status": "unsubscribed", "job_id": job_id}
                        ),
                        websocket
                    )
            
            elif message_type == 'pong':
                # Client responded to ping
                pass
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from user {user_id}: {message}")
        except Exception as e:
            logger.error(f"Error handling message from user {user_id}: {e}")

# Global connection manager instance
manager = ConnectionManager()

# WebSocket endpoint handler
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """Main WebSocket endpoint handler"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_message(websocket, user_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)

# Integration with training pipeline
class WebSocketProgressReporter:
    """Reporter that sends training progress via WebSocket"""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
    
    async def report_progress(self, percentage: float, status: str, message: str, metrics: Dict[str, Any] = None):
        """Report training progress via WebSocket"""
        await manager.send_training_progress(self.job_id, {
            "progress_percentage": percentage,
            "status": status,
            "message": message,
            "metrics": metrics or {}
        })
    
    async def report_complete(self, result_data: Dict[str, Any]):
        """Report training completion"""
        await manager.send_training_complete(self.job_id, result_data)
    
    async def report_failure(self, error_message: str):
        """Report training failure"""
        await manager.send_training_failed(self.job_id, {
            "error_message": error_message
        })

def get_ws_reporter(job_id: str) -> WebSocketProgressReporter:
    """Get a WebSocket progress reporter for a training job"""
    return WebSocketProgressReporter(job_id)