from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from datetime import datetime, timedelta
from typing import Optional
from models.miscellaneous import TokenTransaction
from models import schemas

def create_token_transaction(db: Session, transaction: schemas.TokenTransactionCreate):
    db_transaction = TokenTransaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_token_transactions_by_user(
    db: Session,
    user_id: int,
    offset: int = 0,
    limit: int = 100,
    filter_type: Optional[str] = None,
    days: Optional[int] = None
):
    query = db.query(TokenTransaction).filter(TokenTransaction.user_id == user_id)
    
    # Apply time filter
    if days:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(TokenTransaction.created_at >= cutoff_date)
    
    # Apply type filter
    if filter_type:
        if filter_type == 'generation':
            query = query.filter(TokenTransaction.reason.ilike('%generat%'))
        elif filter_type == 'training':
            query = query.filter(
                or_(
                    TokenTransaction.reason.ilike('%train%'),
                    TokenTransaction.reason.ilike('%model%')
                )
            )
        elif filter_type == 'prediction':
            query = query.filter(TokenTransaction.reason.ilike('%predict%'))
        elif filter_type == 'purchase':
            query = query.filter(
                and_(
                    TokenTransaction.change > 0,
                    TokenTransaction.reason.ilike('%purchase%')
                )
            )
        elif filter_type == 'bonus':
            query = query.filter(
                and_(
                    TokenTransaction.change > 0,
                    or_(
                        TokenTransaction.reason.ilike('%bonus%'),
                        TokenTransaction.reason.ilike('%reward%')
                    )
                )
            )
    
    # Order by most recent first
    query = query.order_by(desc(TokenTransaction.created_at))
    
    return query.offset(offset).limit(limit).all()
