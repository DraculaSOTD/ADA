"""
WebSocket Routes for Real-time Updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from services.websocket_service import websocket_endpoint
from services import security
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws")
async def websocket_route(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket endpoint
    Client should connect with authentication token as query parameter
    """
    try:
        # Authenticate user from token
        if not token:
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        try:
            # Verify token and get user
            user = await security.get_user_from_token(token)
            if not user:
                await websocket.close(code=1008, reason="Invalid token")
                return
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        # Handle WebSocket connection
        await websocket_endpoint(websocket, user.id)
        
    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass