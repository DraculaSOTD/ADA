from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from models.miscellaneous import ModelVote
from models.model import Model
from models import schemas

def create_vote(db: Session, vote: schemas.ModelVoteCreate, user_id: int) -> ModelVote:
    """Create a new vote."""
    db_vote = ModelVote(**vote.dict(), user_id=user_id)
    db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    return db_vote

def get_vote_by_id(db: Session, vote_id: int) -> Optional[ModelVote]:
    """Get a vote by ID."""
    return db.query(ModelVote).filter(ModelVote.id == vote_id).first()

def get_user_vote_for_model(db: Session, user_id: int, model_id: int) -> Optional[ModelVote]:
    """Get a user's vote for a specific model."""
    return db.query(ModelVote).filter(
        ModelVote.user_id == user_id,
        ModelVote.model_id == model_id
    ).first()

def update_vote(db: Session, vote_id: int, vote_type: str) -> ModelVote:
    """Update an existing vote."""
    vote = get_vote_by_id(db, vote_id)
    if vote:
        vote.vote_type = vote_type
        db.commit()
        db.refresh(vote)
    return vote

def delete_vote(db: Session, vote_id: int) -> bool:
    """Delete a vote."""
    vote = get_vote_by_id(db, vote_id)
    if vote:
        db.delete(vote)
        db.commit()
        return True
    return False

def get_model_vote_stats(db: Session, model_id: int) -> Dict[str, Any]:
    """Get voting statistics for a model."""
    # Count votes by type
    vote_counts = db.query(
        ModelVote.vote_type,
        func.count(ModelVote.id).label('count')
    ).filter(
        ModelVote.model_id == model_id
    ).group_by(ModelVote.vote_type).all()
    
    # Convert to dictionary
    stats = {
        "model_id": model_id,
        "upvotes": 0,
        "downvotes": 0,
        "total_votes": 0,
        "net_votes": 0,
        "upvote_percentage": 0
    }
    
    for vote_type, count in vote_counts:
        if vote_type == "upvote":
            stats["upvotes"] = count
        elif vote_type == "downvote":
            stats["downvotes"] = count
    
    stats["total_votes"] = stats["upvotes"] + stats["downvotes"]
    stats["net_votes"] = stats["upvotes"] - stats["downvotes"]
    
    if stats["total_votes"] > 0:
        stats["upvote_percentage"] = round(
            (stats["upvotes"] / stats["total_votes"]) * 100, 2
        )
    
    return stats

def get_user_votes(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[ModelVote]:
    """Get all votes by a user."""
    return db.query(ModelVote).filter(
        ModelVote.user_id == user_id
    ).order_by(desc(ModelVote.id)).offset(skip).limit(limit).all()

def get_trending_models(
    db: Session,
    days: int = 7,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Get trending models based on recent votes."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get models with most net positive votes in the time period
    # Note: This assumes ModelVote has a created_at field. If not, we'll need to add it
    trending = db.query(
        Model.id,
        Model.name,
        Model.description,
        func.sum(
            func.case(
                [(ModelVote.vote_type == "upvote", 1)],
                else_=-1
            )
        ).label('net_votes'),
        func.count(ModelVote.id).label('total_votes')
    ).join(
        ModelVote, Model.id == ModelVote.model_id
    ).group_by(
        Model.id, Model.name, Model.description
    ).order_by(
        desc('net_votes'), desc('total_votes')
    ).limit(limit).all()
    
    # Format results
    results = []
    for model in trending:
        results.append({
            "model_id": model.id,
            "model_name": model.name,
            "model_description": model.description,
            "net_votes": model.net_votes or 0,
            "total_votes": model.total_votes or 0
        })
    
    return results

def get_model_vote_history(
    db: Session,
    model_id: int,
    days: int = 30
) -> Dict[str, Any]:
    """Get vote history for a model over time."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get daily vote counts
    # Note: This is a simplified version. In production, you'd want proper date grouping
    votes = db.query(ModelVote).filter(
        ModelVote.model_id == model_id
    ).all()
    
    # Calculate trends
    upvote_trend = []
    downvote_trend = []
    
    # This is a placeholder - in production, you'd group by date
    for i in range(days):
        date = cutoff_date + timedelta(days=i)
        upvote_trend.append({"date": date.isoformat(), "count": 0})
        downvote_trend.append({"date": date.isoformat(), "count": 0})
    
    return {
        "model_id": model_id,
        "period_days": days,
        "upvote_trend": upvote_trend,
        "downvote_trend": downvote_trend
    }

def cleanup_orphaned_votes(db: Session) -> int:
    """Remove votes for models that no longer exist."""
    # Find votes with no corresponding model
    orphaned_votes = db.query(ModelVote).outerjoin(
        Model, ModelVote.model_id == Model.id
    ).filter(Model.id.is_(None)).all()
    
    count = len(orphaned_votes)
    for vote in orphaned_votes:
        db.delete(vote)
    
    db.commit()
    return count