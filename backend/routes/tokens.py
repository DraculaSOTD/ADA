from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from models import schemas
from services import token_service, security
from core.database import get_db

router = APIRouter(prefix="/api/tokens", tags=["Tokens"])

@router.post("/", response_model=schemas.TokenTransaction)
def create_token_transaction(transaction: schemas.TokenTransactionCreate, db: Session = Depends(get_db)):
    return token_service.create_token_transaction(db=db, transaction=transaction)

@router.get("/usage", response_model=list[schemas.TokenTransaction])
def get_token_usage(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    filter_type: Optional[str] = None,
    days: Optional[int] = None
):
    """Get token usage with filtering options."""
    return token_service.get_token_transactions_by_user(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        filter_type=filter_type,
        days=days
    )

@router.get("/balance")
def get_token_balance(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get current token balance and usage summary."""
    transactions = token_service.get_token_transactions_by_user(db=db, user_id=current_user.id)
    
    # Calculate balance
    current_balance = sum(t.change for t in transactions)
    
    # Calculate monthly usage
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    monthly_transactions = [t for t in transactions if t.created_at >= thirty_days_ago]
    monthly_usage = sum(abs(t.change) for t in monthly_transactions if t.change < 0)
    
    # Get user's token limit based on subscription
    token_limit = 10000  # Default for Developer tier
    if hasattr(current_user, 'subscription_tier'):
        tier_limits = {
            'developer': 10000,
            'professional': 1000000,
            'business': 10000000,
            'enterprise': float('inf')
        }
        token_limit = tier_limits.get(current_user.subscription_tier, 10000)
    
    return {
        "current_balance": current_balance,
        "monthly_usage": monthly_usage,
        "token_limit": token_limit,
        "percentage_used": (monthly_usage / token_limit * 100) if token_limit != float('inf') else 0,
        "days_until_reset": 30 - (datetime.utcnow() - thirty_days_ago).days
    }

@router.get("/limits")
def get_token_limits(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get user's token limits based on subscription."""
    tier = getattr(current_user, 'subscription_tier', 'developer')
    
    limits = {
        'developer': {
            'monthly_limit': 10000,
            'per_generation_limit': 1000,
            'per_model_limit': 5000,
            'api_rate_limit': 100
        },
        'professional': {
            'monthly_limit': 1000000,
            'per_generation_limit': 100000,
            'per_model_limit': 500000,
            'api_rate_limit': 1000
        },
        'business': {
            'monthly_limit': 10000000,
            'per_generation_limit': 10000000,
            'per_model_limit': 5000000,
            'api_rate_limit': 10000
        },
        'enterprise': {
            'monthly_limit': float('inf'),
            'per_generation_limit': float('inf'),
            'per_model_limit': float('inf'),
            'api_rate_limit': float('inf')
        }
    }
    
    return {
        "subscription_tier": tier,
        "limits": limits.get(tier, limits['developer'])
    }

@router.get("/analytics")
def get_token_analytics(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    period: str = Query("month", regex="^(day|week|month|year)$")
):
    """Get detailed token usage analytics."""
    transactions = token_service.get_token_transactions_by_user(db=db, user_id=current_user.id)
    
    # Determine time range
    now = datetime.utcnow()
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:  # year
        start_date = now - timedelta(days=365)
    
    # Filter transactions
    period_transactions = [t for t in transactions if t.created_at >= start_date]
    
    # Group by type
    usage_by_type = {}
    for t in period_transactions:
        reason = t.reason.lower()
        if 'generat' in reason:
            type_key = 'generation'
        elif 'train' in reason or 'model' in reason:
            type_key = 'training'
        elif 'predict' in reason:
            type_key = 'prediction'
        elif 'purchase' in reason:
            type_key = 'purchase'
        elif 'bonus' in reason or 'reward' in reason:
            type_key = 'bonus'
        else:
            type_key = 'other'
        
        if type_key not in usage_by_type:
            usage_by_type[type_key] = {'count': 0, 'total': 0}
        
        usage_by_type[type_key]['count'] += 1
        usage_by_type[type_key]['total'] += abs(t.change)
    
    # Calculate daily average
    days_in_period = max(1, (now - start_date).days)
    total_usage = sum(abs(t.change) for t in period_transactions if t.change < 0)
    daily_average = total_usage / days_in_period
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_usage": total_usage,
        "daily_average": daily_average,
        "usage_by_type": usage_by_type,
        "transaction_count": len(period_transactions)
    }

@router.post("/purchase")
def purchase_tokens(
    amount: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Purchase additional tokens (demo endpoint)."""
    # This is a placeholder - in production, integrate with payment provider
    
    # Create purchase transaction
    transaction = schemas.TokenTransactionCreate(
        user_id=current_user.id,
        change=amount,
        reason=f"Purchased {amount} tokens"
    )
    
    created_transaction = token_service.create_token_transaction(db=db, transaction=transaction)
    
    # Get new balance
    balance_info = get_token_balance(db=db, current_user=current_user)
    
    return {
        "message": "Tokens purchased successfully",
        "transaction_id": created_transaction.id,
        "tokens_added": amount,
        "new_balance": balance_info["current_balance"]
    }
