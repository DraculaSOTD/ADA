from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import vote_service, security
from core.database import get_db

router = APIRouter(prefix="/api/votes", tags=["Votes"])

@router.post("/", response_model=schemas.ModelVote)
def create_vote(vote: schemas.ModelVoteCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return vote_service.create_vote(db=db, vote=vote, user_id=current_user.id)
