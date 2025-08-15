"""
WebSocket Routes
FastAPI WebSocket endpoints
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
import logging

from .ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Handle messages
        while True:
            # Receive message
            message = await websocket.receive_text()
            
            # Process message
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/model/{model_id}")
async def model_websocket(websocket: WebSocket, model_id: str):
    """WebSocket endpoint for model updates"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Auto-subscribe to model channel
        await ws_manager.subscribe(client_id, f"model:{model_id}")
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Model WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Model WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/training/{training_id}")
async def training_websocket(websocket: WebSocket, training_id: str):
    """WebSocket endpoint for training progress"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Auto-subscribe to training channel
        await ws_manager.subscribe(client_id, f"training:{training_id}")
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Training WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Training WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/job/{job_id}")
async def job_websocket(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for job status updates"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Auto-subscribe to job channel
        await ws_manager.subscribe(client_id, f"job:{job_id}")
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Job WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Job WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/metrics")
async def metrics_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Auto-subscribe to metrics channel
        await ws_manager.subscribe(client_id, "metrics")
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Metrics WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Metrics WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/logs")
async def logs_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time logs"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Auto-subscribe to logs channel
        await ws_manager.subscribe(client_id, "logs")
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Logs WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Logs WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for chat/collaboration"""
    client_id = None
    
    try:
        # Initialize manager if needed
        if not ws_manager.running:
            await ws_manager.initialize()
        
        # Accept connection
        client_id = await ws_manager.connect(websocket)
        
        # Note: Client must authenticate before joining chat
        
        # Handle messages
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_message(client_id, message)
            
    except WebSocketDisconnect:
        if client_id:
            await ws_manager.disconnect(client_id)
        logger.info(f"Chat WebSocket client disconnected: {client_id}")
        
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        if client_id:
            await ws_manager.disconnect(client_id)