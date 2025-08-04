from sqlalchemy.orm import Session
from models.miscellaneous import Rule
from models import schemas

def create_rule(db: Session, rule: schemas.RuleCreate):
    db_rule = Rule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule
