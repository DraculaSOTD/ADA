from fastapi import APIRouter, Depends
from models import schemas
from services.security import get_current_user

router = APIRouter(prefix="/api", tags=["Endpoints"])

@router.get("/endpoints")
async def get_api_endpoints(
    current_user: schemas.User = Depends(get_current_user)
):
    """Get available API endpoints for webhook and integration configuration"""
    endpoints = [
        {
            "path": "/api/rules/webhook/{rule_id}/{token}",
            "method": "POST",
            "description": "Webhook endpoint for triggering rules via external HTTP requests",
            "category": "webhooks",
            "authenticated": False,
            "requires_token": True
        },
        {
            "path": "/api/rules/{rule_id}/execute",
            "method": "POST",
            "description": "Execute a rule with provided input data",
            "category": "rules",
            "authenticated": True,
            "requires_token": False
        },
        {
            "path": "/api/rules",
            "method": "GET",
            "description": "Get all rules for the current user",
            "category": "rules",
            "authenticated": True,
            "requires_token": False
        },
        {
            "path": "/api/rules",
            "method": "POST",
            "description": "Create a new rule",
            "category": "rules",
            "authenticated": True,
            "requires_token": False
        },
        {
            "path": "/api/models/me",
            "method": "GET",
            "description": "Get all models for the current user",
            "category": "models",
            "authenticated": True,
            "requires_token": False
        },
        {
            "path": "/api/models/{model_id}/predict",
            "method": "POST",
            "description": "Make predictions using a trained model",
            "category": "models",
            "authenticated": True,
            "requires_token": False
        }
    ]
    return endpoints
