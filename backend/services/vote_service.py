from sqlalchemy.orm import Session
from models.miscellaneous import ModelVote
from models import schemas

def create_vote(db: Session, vote: schemas.ModelVoteCreate, user_id: int):
    db_vote = db.query(ModelVote).filter(ModelVote.user_id == user_id, ModelVote.model_id == vote.model_id).first()

    if db_vote:
        if db_vote.vote_type == vote.vote_type:
            # User is casting the same vote again, so remove the vote
            db.delete(db_vote)
            db.commit()
            return None
        else:
            # User is changing their vote
            db_vote.vote_type = vote.vote_type
    else:
        # New vote
        db_vote = ModelVote(**vote.dict(), user_id=user_id)
        db.add(db_vote)
    
    db.commit()
    db.refresh(db_vote)
    return db_vote
