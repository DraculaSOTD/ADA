from sqlalchemy.orm import Session
from sqlalchemy import and_
from models.miscellaneous import Rule, RuleExecution
from models.model import Model
from models import schemas
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import time

def create_advanced_rule(db: Session, rule: schemas.RuleCreate, user_id: int):
    """Create a new rule with advanced features and optional model linking"""
    db_rule = Rule(
        user_id=user_id,
        rule_name=rule.rule_name,
        description=rule.description,
        logic_json=rule.logic_json,
        token_cost=rule.token_cost,
        trigger_config=rule.trigger_config,
        input_schema=rule.input_schema,
        output_schema=rule.output_schema,
        execution_mode=rule.execution_mode,
        error_handling=rule.error_handling,
        is_active=rule.is_active if hasattr(rule, 'is_active') else True
    )
    
    # If this should also appear as a model
    if rule.create_as_model:
        db_model = Model(
            user_id=user_id,
            name=rule.rule_name,
            description=f"Rules Engine: {rule.description or rule.rule_name}",
            type='rules_engine',
            visibility=rule.visibility if hasattr(rule, 'visibility') else 'private',
            status='active'
        )
        db.add(db_model)
        db.flush()  # Get the model ID
        db_rule.linked_model_id = db_model.id
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def get_user_rules(db: Session, user_id: int) -> List[Rule]:
    """Get all rules for a user"""
    return db.query(Rule).filter(
        and_(Rule.user_id == user_id, Rule.parent_rule_id == None)
    ).order_by(Rule.created_at.desc()).all()

def get_rule_by_id(db: Session, rule_id: int, user_id: int) -> Optional[Rule]:
    """Get a specific rule by ID for a user"""
    return db.query(Rule).filter(
        and_(Rule.id == rule_id, Rule.user_id == user_id)
    ).first()

def get_rule_for_webhook(db: Session, rule_id: int) -> Optional[Rule]:
    """Get a rule for webhook execution (no user check)"""
    return db.query(Rule).filter(Rule.id == rule_id).first()

def update_rule(db: Session, rule_id: int, user_id: int, rule_update: schemas.RuleUpdate) -> Optional[Rule]:
    """Update an existing rule"""
    rule = get_rule_by_id(db, rule_id, user_id)
    if not rule:
        return None
    
    # Update fields if provided
    update_data = rule_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)
    
    # Update linked model if exists
    if rule.linked_model_id:
        model = db.query(Model).filter(Model.id == rule.linked_model_id).first()
        if model:
            model.name = rule.rule_name
            model.description = f"Rules Engine: {rule.description or rule.rule_name}"
    
    # Increment version
    rule.version = (rule.version or 1) + 1
    
    db.commit()
    db.refresh(rule)
    return rule

def delete_rule(db: Session, rule_id: int, user_id: int) -> bool:
    """Delete a rule and its linked model"""
    rule = get_rule_by_id(db, rule_id, user_id)
    if not rule:
        return False
    
    # Delete linked model if exists
    if rule.linked_model_id:
        model = db.query(Model).filter(Model.id == rule.linked_model_id).first()
        if model:
            db.delete(model)
    
    db.delete(rule)
    db.commit()
    return True

def execute_rule(
    db: Session, 
    rule_id: int, 
    user_id: int, 
    input_data: Dict[str, Any], 
    trigger_type: str = 'manual'
) -> Optional[RuleExecution]:
    """Execute a rule and create an execution record"""
    rule = get_rule_by_id(db, rule_id, user_id)
    if not rule or not rule.is_active:
        return None
    
    # Create execution record
    execution = RuleExecution(
        rule_id=rule_id,
        user_id=user_id,
        trigger_type=trigger_type,
        input_data=input_data,
        status='running'
    )
    db.add(execution)
    db.commit()
    
    start_time = time.time()
    
    try:
        # Execute the rule logic
        output_data = execute_rule_logic(rule, input_data, db)
        
        execution.status = 'completed'
        execution.output_data = output_data
        execution.execution_time_ms = int((time.time() - start_time) * 1000)
        execution.completed_at = datetime.utcnow()
        execution.token_cost = calculate_token_cost(rule, input_data, output_data)
        
    except Exception as e:
        execution.status = 'failed'
        execution.error_message = str(e)
        execution.execution_time_ms = int((time.time() - start_time) * 1000)
        execution.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(execution)
    return execution

def execute_rule_logic(rule: Rule, input_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Execute the actual rule logic using the advanced execution engine"""
    from services.rules_engine import RulesExecutionEngine
    
    engine = RulesExecutionEngine(db)
    return engine.execute(rule, input_data)

def evaluate_conditions(conditions: Dict[str, Any], input_data: Dict[str, Any]) -> bool:
    """Evaluate rule conditions"""
    # Placeholder for condition evaluation
    # In real implementation, this would recursively evaluate condition groups
    return True

def calculate_token_cost(rule: Rule, input_data: Dict[str, Any], output_data: Dict[str, Any]) -> int:
    """Calculate token cost for rule execution"""
    # Placeholder calculation
    base_cost = rule.token_cost or 100
    data_size_factor = len(json.dumps(input_data)) + len(json.dumps(output_data))
    return base_cost + (data_size_factor // 100)

def test_rule(db: Session, rule_id: int, user_id: int, test_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Test a rule without creating an execution record"""
    rule = get_rule_by_id(db, rule_id, user_id)
    if not rule:
        return None
    
    try:
        # Simulate rule execution
        conditions_met = evaluate_conditions(rule.logic_json.get('conditions', {}), test_data)
        
        return {
            "conditions_passed": conditions_met,
            "actions_to_execute": len(rule.logic_json.get('actions', [])) if conditions_met else 0,
            "estimated_token_cost": rule.token_cost or 100,
            "test_output": {
                "message": "Test completed successfully",
                "would_execute": conditions_met
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "conditions_passed": False,
            "actions_to_execute": 0
        }

def get_rule_executions(db: Session, rule_id: int, user_id: int, limit: int = 50) -> List[RuleExecution]:
    """Get execution history for a rule"""
    rule = get_rule_by_id(db, rule_id, user_id)
    if not rule:
        return []
    
    return db.query(RuleExecution).filter(
        RuleExecution.rule_id == rule_id
    ).order_by(RuleExecution.created_at.desc()).limit(limit).all()

def get_user_executions(db: Session, user_id: int, limit: int = 100) -> List[RuleExecution]:
    """Get all rule executions for a user across all rules"""
    return db.query(RuleExecution).filter(
        RuleExecution.user_id == user_id
    ).order_by(RuleExecution.created_at.desc()).limit(limit).all()

def get_rule_models(db: Session, user_id: int) -> List[Model]:
    """Get all rule engines that appear as models for a user"""
    return db.query(Model).filter(
        and_(Model.user_id == user_id, Model.type == 'rules_engine')
    ).order_by(Model.created_at.desc()).all()

def clone_rule(db: Session, rule_id: int, user_id: int, new_name: str) -> Optional[Rule]:
    """Clone an existing rule"""
    original_rule = get_rule_by_id(db, rule_id, user_id)
    if not original_rule:
        return None
    
    # Create a new rule with the same configuration
    cloned_rule = Rule(
        user_id=user_id,
        rule_name=new_name,
        description=f"Clone of {original_rule.description or original_rule.rule_name}",
        logic_json=original_rule.logic_json,
        token_cost=original_rule.token_cost,
        trigger_config=original_rule.trigger_config,
        input_schema=original_rule.input_schema,
        output_schema=original_rule.output_schema,
        execution_mode=original_rule.execution_mode,
        error_handling=original_rule.error_handling,
        parent_rule_id=original_rule.id,
        is_active=True
    )
    
    # Create corresponding model if original had one
    if original_rule.linked_model_id:
        db_model = Model(
            user_id=user_id,
            name=new_name,
            description=f"Rules Engine: Clone of {original_rule.rule_name}",
            type='rules_engine',
            visibility='private',
            status='active'
        )
        db.add(db_model)
        db.flush()
        cloned_rule.linked_model_id = db_model.id
    
    db.add(cloned_rule)
    db.commit()
    db.refresh(cloned_rule)
    return cloned_rule