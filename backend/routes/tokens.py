from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import token_service, security
from core.database import get_db

router = APIRouter(prefix="/api/tokens", tags=["Tokens"])

@router.post("/", response_model=schemas.TokenTransaction)
def create_token_transaction(transaction: schemas.TokenTransactionCreate, db: Session = Depends(get_db)):
    return token_service.create_token_transaction(db=db, transaction=transaction)

@router.get("/usage", response_model=list[schemas.TokenTransaction])
def get_token_usage(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return token_service.get_token_transactions_by_user(db=db, user_id=current_user.id)
