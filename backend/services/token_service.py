from sqlalchemy.orm import Session
from models.miscellaneous import TokenTransaction
from models import schemas

def create_token_transaction(db: Session, transaction: schemas.TokenTransactionCreate):
    db_transaction = TokenTransaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_token_transactions_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(TokenTransaction).filter(TokenTransaction.user_id == user_id).offset(skip).limit(limit).all()
