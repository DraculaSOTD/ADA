from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import schemas
from services import vote_service, security
from core.database import get_db

router = APIRouter(prefix="/api/votes", tags=["Votes"])

@router.post("/", response_model=schemas.ModelVote)
def create_or_update_vote(
    vote: schemas.ModelVoteCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Create or update a vote for a model."""
    # Check if user already voted for this model
    existing_vote = vote_service.get_user_vote_for_model(
        db=db,
        user_id=current_user.id,
        model_id=vote.model_id
    )
    
    if existing_vote:
        # Update existing vote
        return vote_service.update_vote(
            db=db,
            vote_id=existing_vote.id,
            vote_type=vote.vote_type
        )
    else:
        # Create new vote
        return vote_service.create_vote(
            db=db,
            vote=vote,
            user_id=current_user.id
        )

@router.get("/model/{model_id}", response_model=schemas.VoteStats)
def get_model_votes(
    model_id: int,
    db: Session = Depends(get_db)
):
    """Get voting statistics for a specific model."""
    stats = vote_service.get_model_vote_stats(db=db, model_id=model_id)
    return stats

@router.get("/model/{model_id}/user")
def get_user_vote_for_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get the current user's vote for a specific model."""
    vote = vote_service.get_user_vote_for_model(
        db=db,
        user_id=current_user.id,
        model_id=model_id
    )
    
    if vote:
        return {
            "model_id": model_id,
            "vote_type": vote.vote_type,
            "vote_id": vote.id
        }
    else:
        return {
            "model_id": model_id,
            "vote_type": None,
            "vote_id": None
        }

@router.put("/{vote_id}", response_model=schemas.ModelVote)
def update_vote(
    vote_id: int,
    vote_type: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Update an existing vote."""
    vote = vote_service.get_vote_by_id(db=db, vote_id=vote_id)
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    
    if vote.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return vote_service.update_vote(
        db=db,
        vote_id=vote_id,
        vote_type=vote_type
    )

@router.delete("/{vote_id}")
def delete_vote(
    vote_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Remove a vote."""
    vote = vote_service.get_vote_by_id(db=db, vote_id=vote_id)
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    
    if vote.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    vote_service.delete_vote(db=db, vote_id=vote_id)
    return {"message": "Vote removed successfully"}

@router.get("/stats/{model_id}", response_model=schemas.VoteStats)
def get_vote_statistics(
    model_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed voting statistics for a model."""
    return vote_service.get_model_vote_stats(db=db, model_id=model_id)

@router.get("/user/history", response_model=List[schemas.ModelVote])
def get_user_vote_history(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get the voting history for the current user."""
    return vote_service.get_user_votes(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )

@router.get("/trending")
def get_trending_models(
    db: Session = Depends(get_db),
    days: int = 7,
    limit: int = 10
):
    """Get trending models based on recent votes."""
    trending = vote_service.get_trending_models(
        db=db,
        days=days,
        limit=limit
    )
    
    return {
        "period_days": days,
        "models": trending
    }
