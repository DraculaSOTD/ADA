from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import rule_service
from core.database import get_db

router = APIRouter(prefix="/rules", tags=["Rules"])

@router.post("/", response_model=schemas.Rule)
def create_rule(rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    return rule_service.create_rule(db=db, rule=rule)
