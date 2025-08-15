"""
WebSocket Manager
Real-time communication handler for the ADA platform
"""

import asyncio
import json
import logging
from typing import Dict, Set, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import uuid

from fastapi import WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WebSocket message types"""
    # Connection
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    
    # Authentication
    AUTH = "auth"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILED = "auth_failed"
    
    # Subscriptions
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    
    # Data updates
    MODEL_UPDATE = "model_update"
    TRAINING_PROGRESS = "training_progress"
    JOB_STATUS = "job_status"
    METRIC_UPDATE = "metric_update"
    LOG_ENTRY = "log_entry"
    
    # Notifications
    NOTIFICATION = "notification"
    ALERT = "alert"
    
    # Collaboration
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CHAT_MESSAGE = "chat_message"
    
    # Errors
    ERROR = "error"


class ChannelType(Enum):
    """Channel types for subscriptions"""
    GLOBAL = "global"
    USER = "user"
    MODEL = "model"
    JOB = "job"
    TRAINING = "training"
    METRICS = "metrics"
    LOGS = "logs"
    CHAT = "chat"
    NOTIFICATIONS = "notifications"


@dataclass
class WebSocketClient:
    """WebSocket client connection"""
    client_id: str
    websocket: WebSocket
    user_id: Optional[str] = None
    authenticated: bool = False
    subscriptions: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_ping: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Message:
    """WebSocket message"""
    type: MessageType
    channel: Optional[str] = None
    data: Optional[Any] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    sender_id: Optional[str] = None
    recipient_id: Optional[str] = None


class WebSocketManager:
    """
    Manages WebSocket connections and message routing
    """
    
    def __init__(self):
        self.clients: Dict[str, WebSocketClient] = {}
        self.channels: Dict[str, Set[str]] = {}  # channel -> client_ids
        self.user_clients: Dict[str, Set[str]] = {}  # user_id -> client_ids
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        
    async def initialize(self):
        """Initialize WebSocket manager"""
        self.running = True
        
        # Start background tasks
        asyncio.create_task(self._message_processor())
        asyncio.create_task(self._ping_clients())
        asyncio.create_task(self._cleanup_disconnected())
        
        logger.info("WebSocket manager initialized")
    
    async def connect(self, websocket: WebSocket) -> str:
        """Handle new WebSocket connection"""
        await websocket.accept()
        
        # Generate client ID
        client_id = str(uuid.uuid4())
        
        # Create client
        client = WebSocketClient(
            client_id=client_id,
            websocket=websocket
        )
        
        # Store client
        self.clients[client_id] = client
        
        # Send connection confirmation
        await self._send_to_client(
            client_id,
            Message(
                type=MessageType.CONNECT,
                data={"client_id": client_id}
            )
        )
        
        logger.info(f"Client connected: {client_id}")
        
        return client_id
    
    async def disconnect(self, client_id: str):
        """Handle WebSocket disconnection"""
        if client_id not in self.clients:
            return
        
        client = self.clients[client_id]
        
        # Remove from channels
        for channel in list(client.subscriptions):
            await self.unsubscribe(client_id, channel)
        
        # Remove from user clients
        if client.user_id and client.user_id in self.user_clients:
            self.user_clients[client.user_id].discard(client_id)
            if not self.user_clients[client.user_id]:
                del self.user_clients[client.user_id]
        
        # Notify others if in collaboration
        if "chat" in client.subscriptions:
            await self.broadcast_to_channel(
                "chat",
                Message(
                    type=MessageType.USER_LEFT,
                    channel="chat",
                    data={"user_id": client.user_id}
                ),
                exclude_client=client_id
            )
        
        # Remove client
        del self.clients[client_id]
        
        logger.info(f"Client disconnected: {client_id}")
    
    async def authenticate(self, client_id: str, token: str) -> bool:
        """Authenticate WebSocket client"""
        if client_id not in self.clients:
            return False
        
        client = self.clients[client_id]
        
        # Verify token (integrate with auth service)
        # For now, simulate authentication
        user_id = await self._verify_token(token)
        
        if user_id:
            client.authenticated = True
            client.user_id = user_id
            
            # Track user clients
            if user_id not in self.user_clients:
                self.user_clients[user_id] = set()
            self.user_clients[user_id].add(client_id)
            
            # Auto-subscribe to user channel
            await self.subscribe(client_id, f"user:{user_id}")
            
            # Send success message
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.AUTH_SUCCESS,
                    data={"user_id": user_id}
                )
            )
            
            logger.info(f"Client authenticated: {client_id} as user {user_id}")
            return True
        else:
            # Send failure message
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.AUTH_FAILED,
                    data={"error": "Invalid token"}
                )
            )
            
            return False
    
    async def subscribe(self, client_id: str, channel: str) -> bool:
        """Subscribe client to channel"""
        if client_id not in self.clients:
            return False
        
        client = self.clients[client_id]
        
        # Check authorization for channel
        if not await self._can_subscribe(client, channel):
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.ERROR,
                    data={"error": f"Not authorized for channel: {channel}"}
                )
            )
            return False
        
        # Add to channel
        if channel not in self.channels:
            self.channels[channel] = set()
        self.channels[channel].add(client_id)
        
        # Add to client subscriptions
        client.subscriptions.add(channel)
        
        logger.debug(f"Client {client_id} subscribed to {channel}")
        
        return True
    
    async def unsubscribe(self, client_id: str, channel: str) -> bool:
        """Unsubscribe client from channel"""
        if client_id not in self.clients:
            return False
        
        client = self.clients[client_id]
        
        # Remove from channel
        if channel in self.channels:
            self.channels[channel].discard(client_id)
            if not self.channels[channel]:
                del self.channels[channel]
        
        # Remove from client subscriptions
        client.subscriptions.discard(channel)
        
        logger.debug(f"Client {client_id} unsubscribed from {channel}")
        
        return True
    
    async def handle_message(self, client_id: str, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            msg_type = MessageType(data.get('type'))
            
            if msg_type == MessageType.PING:
                # Respond with pong
                await self._send_to_client(
                    client_id,
                    Message(type=MessageType.PONG)
                )
                
                # Update last ping
                if client_id in self.clients:
                    self.clients[client_id].last_ping = datetime.utcnow()
            
            elif msg_type == MessageType.AUTH:
                # Authenticate client
                token = data.get('token')
                await self.authenticate(client_id, token)
            
            elif msg_type == MessageType.SUBSCRIBE:
                # Subscribe to channel
                channel = data.get('channel')
                await self.subscribe(client_id, channel)
            
            elif msg_type == MessageType.UNSUBSCRIBE:
                # Unsubscribe from channel
                channel = data.get('channel')
                await self.unsubscribe(client_id, channel)
            
            elif msg_type == MessageType.CHAT_MESSAGE:
                # Handle chat message
                await self._handle_chat_message(client_id, data)
            
            else:
                # Queue for processing
                await self.message_queue.put({
                    'client_id': client_id,
                    'message': Message(
                        type=msg_type,
                        channel=data.get('channel'),
                        data=data.get('data'),
                        sender_id=client_id
                    )
                })
            
        except json.JSONDecodeError:
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.ERROR,
                    data={"error": "Invalid JSON"}
                )
            )
        except ValueError as e:
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.ERROR,
                    data={"error": str(e)}
                )
            )
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.ERROR,
                    data={"error": "Internal error"}
                )
            )
    
    async def broadcast_to_channel(self, channel: str, message: Message,
                                  exclude_client: Optional[str] = None):
        """Broadcast message to all clients in channel"""
        if channel not in self.channels:
            return
        
        tasks = []
        for client_id in self.channels[channel]:
            if client_id != exclude_client:
                tasks.append(self._send_to_client(client_id, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def send_to_user(self, user_id: str, message: Message):
        """Send message to all clients of a user"""
        if user_id not in self.user_clients:
            return
        
        tasks = []
        for client_id in self.user_clients[user_id]:
            tasks.append(self._send_to_client(client_id, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_to_client(self, client_id: str, message: Message) -> bool:
        """Send message to specific client"""
        if client_id not in self.clients:
            return False
        
        client = self.clients[client_id]
        
        try:
            message_data = {
                'type': message.type.value,
                'timestamp': message.timestamp.isoformat(),
            }
            
            if message.channel:
                message_data['channel'] = message.channel
            if message.data:
                message_data['data'] = message.data
            if message.sender_id:
                message_data['sender_id'] = message.sender_id
            
            await client.websocket.send_json(message_data)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to {client_id}: {e}")
            # Mark client for cleanup
            await self.disconnect(client_id)
            return False
    
    async def _handle_chat_message(self, client_id: str, data: Dict):
        """Handle chat message"""
        if client_id not in self.clients:
            return
        
        client = self.clients[client_id]
        
        if not client.authenticated:
            await self._send_to_client(
                client_id,
                Message(
                    type=MessageType.ERROR,
                    data={"error": "Not authenticated"}
                )
            )
            return
        
        # Broadcast to chat channel
        await self.broadcast_to_channel(
            "chat",
            Message(
                type=MessageType.CHAT_MESSAGE,
                channel="chat",
                data={
                    'user_id': client.user_id,
                    'message': data.get('message'),
                    'timestamp': datetime.utcnow().isoformat()
                },
                sender_id=client_id
            ),
            exclude_client=client_id
        )
    
    async def _can_subscribe(self, client: WebSocketClient, channel: str) -> bool:
        """Check if client can subscribe to channel"""
        # Public channels
        if channel in ['global', 'metrics', 'logs']:
            return True
        
        # User-specific channels
        if channel.startswith('user:'):
            user_id = channel.split(':')[1]
            return client.authenticated and client.user_id == user_id
        
        # Authenticated channels
        if channel in ['chat', 'notifications']:
            return client.authenticated
        
        # Model/job/training channels
        if channel.startswith(('model:', 'job:', 'training:')):
            # Check if user has access to resource
            # This would integrate with RBAC
            return client.authenticated
        
        return False
    
    async def _verify_token(self, token: str) -> Optional[str]:
        """Verify authentication token"""
        # This would integrate with auth service
        # For now, return mock user ID
        if token == "valid_token":
            return "user_123"
        return None
    
    async def _message_processor(self):
        """Process queued messages"""
        while self.running:
            try:
                # Get message from queue
                item = await asyncio.wait_for(
                    self.message_queue.get(),
                    timeout=1.0
                )
                
                client_id = item['client_id']
                message = item['message']
                
                # Process based on message type
                # This would handle business logic for different message types
                
                logger.debug(f"Processed message from {client_id}: {message.type}")
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Message processor error: {e}")
    
    async def _ping_clients(self):
        """Send periodic pings to clients"""
        while self.running:
            try:
                await asyncio.sleep(30)  # Ping every 30 seconds
                
                tasks = []
                for client_id in list(self.clients.keys()):
                    tasks.append(
                        self._send_to_client(
                            client_id,
                            Message(type=MessageType.PING)
                        )
                    )
                
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
            except Exception as e:
                logger.error(f"Ping error: {e}")
    
    async def _cleanup_disconnected(self):
        """Clean up disconnected clients"""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = datetime.utcnow()
                timeout_threshold = 90  # seconds
                
                for client_id in list(self.clients.keys()):
                    client = self.clients[client_id]
                    
                    # Check if client is responsive
                    time_since_ping = (current_time - client.last_ping).total_seconds()
                    
                    if time_since_ping > timeout_threshold:
                        logger.warning(f"Client {client_id} timed out")
                        await self.disconnect(client_id)
                
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
    
    # Event broadcasting methods
    async def broadcast_model_update(self, model_id: str, update_data: Dict):
        """Broadcast model update to subscribers"""
        await self.broadcast_to_channel(
            f"model:{model_id}",
            Message(
                type=MessageType.MODEL_UPDATE,
                channel=f"model:{model_id}",
                data=update_data
            )
        )
    
    async def broadcast_training_progress(self, training_id: str, progress_data: Dict):
        """Broadcast training progress"""
        await self.broadcast_to_channel(
            f"training:{training_id}",
            Message(
                type=MessageType.TRAINING_PROGRESS,
                channel=f"training:{training_id}",
                data=progress_data
            )
        )
    
    async def broadcast_job_status(self, job_id: str, status_data: Dict):
        """Broadcast job status update"""
        await self.broadcast_to_channel(
            f"job:{job_id}",
            Message(
                type=MessageType.JOB_STATUS,
                channel=f"job:{job_id}",
                data=status_data
            )
        )
    
    async def broadcast_metrics(self, metrics_data: Dict):
        """Broadcast system metrics"""
        await self.broadcast_to_channel(
            "metrics",
            Message(
                type=MessageType.METRIC_UPDATE,
                channel="metrics",
                data=metrics_data
            )
        )
    
    async def broadcast_logs(self, log_data: Dict):
        """Broadcast log entries"""
        await self.broadcast_to_channel(
            "logs",
            Message(
                type=MessageType.LOG_ENTRY,
                channel="logs",
                data=log_data
            )
        )
    
    async def send_notification(self, user_id: str, notification: Dict):
        """Send notification to user"""
        await self.send_to_user(
            user_id,
            Message(
                type=MessageType.NOTIFICATION,
                channel=f"user:{user_id}",
                data=notification
            )
        )
    
    async def send_alert(self, alert: Dict, user_ids: Optional[List[str]] = None):
        """Send alert to users"""
        message = Message(
            type=MessageType.ALERT,
            channel="alerts",
            data=alert
        )
        
        if user_ids:
            # Send to specific users
            for user_id in user_ids:
                await self.send_to_user(user_id, message)
        else:
            # Broadcast to all authenticated users
            await self.broadcast_to_channel("global", message)
    
    def get_statistics(self) -> Dict:
        """Get WebSocket statistics"""
        return {
            'total_clients': len(self.clients),
            'authenticated_clients': sum(
                1 for c in self.clients.values() if c.authenticated
            ),
            'total_channels': len(self.channels),
            'total_users': len(self.user_clients),
            'channel_subscribers': {
                channel: len(clients)
                for channel, clients in self.channels.items()
            }
        }
    
    async def shutdown(self):
        """Shutdown WebSocket manager"""
        self.running = False
        
        # Disconnect all clients
        for client_id in list(self.clients.keys()):
            await self.disconnect(client_id)
        
        logger.info("WebSocket manager shut down")


# Global WebSocket manager instance
ws_manager = WebSocketManager()