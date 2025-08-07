from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from models import schemas
from models.miscellaneous import Rule
from services import rule_service
from core.database import get_db
from services.security import get_current_user

router = APIRouter(prefix="/api/rules", tags=["Rules"])

@router.post("/", response_model=schemas.RuleResponse)
async def create_rule(
    rule: schemas.RuleCreate, 
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new rule engine with advanced features"""
    return rule_service.create_advanced_rule(
        db=db, 
        rule=rule, 
        user_id=current_user.id
    )

@router.get("/", response_model=List[schemas.RuleListItem])
async def get_rules(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rules for the current user"""
    return rule_service.get_user_rules(db=db, user_id=current_user.id)

@router.get("/{rule_id}", response_model=schemas.RuleDetail)
async def get_rule(
    rule_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific rule"""
    rule = rule_service.get_rule_by_id(db=db, rule_id=rule_id, user_id=current_user.id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.put("/{rule_id}", response_model=schemas.RuleResponse)
async def update_rule(
    rule_id: int,
    rule_update: schemas.RuleUpdate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing rule"""
    rule = rule_service.update_rule(
        db=db, 
        rule_id=rule_id, 
        user_id=current_user.id, 
        rule_update=rule_update
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a rule"""
    if not rule_service.delete_rule(db=db, rule_id=rule_id, user_id=current_user.id):
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}

@router.post("/{rule_id}/execute", response_model=schemas.RuleExecutionResponse)
async def execute_rule(
    rule_id: int,
    execution_request: schemas.RuleExecutionRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a rule with the provided input data"""
    execution = rule_service.execute_rule(
        db=db,
        rule_id=rule_id,
        user_id=current_user.id,
        input_data=execution_request.input_data,
        trigger_type=execution_request.trigger_type
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Rule not found or execution failed")
    return execution

@router.post("/{rule_id}/test", response_model=schemas.RuleTestResponse)
async def test_rule(
    rule_id: int,
    test_request: schemas.RuleTestRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test a rule without creating an execution record"""
    result = rule_service.test_rule(
        db=db,
        rule_id=rule_id,
        user_id=current_user.id,
        test_data=test_request.test_data
    )
    if not result:
        raise HTTPException(status_code=404, detail="Rule not found")
    return result

@router.get("/executions", response_model=List[schemas.RuleExecutionListItem])
async def get_all_executions(
    limit: int = Query(100, ge=1, le=500),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rule executions for the current user"""
    return rule_service.get_user_executions(
        db=db,
        user_id=current_user.id,
        limit=limit
    )

@router.get("/{rule_id}/executions", response_model=List[schemas.RuleExecutionListItem])
async def get_rule_executions(
    rule_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get execution history for a rule"""
    return rule_service.get_rule_executions(
        db=db,
        rule_id=rule_id,
        user_id=current_user.id,
        limit=limit
    )

@router.post("/webhook/{rule_id}")
async def webhook_trigger(
    rule_id: int,
    webhook_data: dict,
    webhook_token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Webhook endpoint for external rule triggers"""
    # Verify webhook token if required
    rule = rule_service.get_rule_for_webhook(db=db, rule_id=rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Invalid rule")
    
    # Verify token if rule requires it
    if rule.trigger_config.get('webhook_token') and webhook_token != rule.trigger_config['webhook_token']:
        raise HTTPException(status_code=401, detail="Invalid webhook token")
    
    execution = rule_service.execute_rule(
        db=db,
        rule_id=rule_id,
        user_id=rule.user_id,
        input_data=webhook_data,
        trigger_type='webhook'
    )
    
    if not execution:
        raise HTTPException(status_code=500, detail="Execution failed")
    
    return {
        "success": True,
        "execution_id": execution.id,
        "status": execution.status
    }

@router.post("/webhook/{rule_id}/{token}")
async def webhook_trigger_with_token(
    rule_id: int,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Webhook endpoint with token in URL for API configuration"""
    # Handle both string rule_id and numeric
    if rule_id == 'new':
        raise HTTPException(status_code=400, detail="Cannot trigger webhook for unsaved rule")
    
    # Get the rule
    rule = db.query(Rule).filter(Rule.id == int(rule_id)).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Verify the token from API configuration
    if rule.logic_json and rule.logic_json.get('apiConfig'):
        api_config = rule.logic_json['apiConfig']
        if api_config.get('inputs', {}).get('webhook', {}):
            stored_token = api_config['inputs']['webhook'].get('token')
            if stored_token != token:
                raise HTTPException(status_code=401, detail="Invalid webhook token")
            
            # Check if webhook is enabled
            if not api_config['inputs']['webhook'].get('enabled'):
                raise HTTPException(status_code=400, detail="Webhook is not enabled for this rule")
        else:
            raise HTTPException(status_code=400, detail="Rule does not have webhook configuration")
    else:
        raise HTTPException(status_code=400, detail="Rule does not have API configuration")
    
    # Get request body
    try:
        input_data = await request.json()
    except:
        input_data = {}
    
    # Validate against schema if defined
    schema = rule.logic_json.get('apiConfig', {}).get('inputs', {}).get('schema', [])
    if schema:
        # Basic validation
        for field in schema:
            if field.get('required') and field.get('name') and field['name'] not in input_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Required field '{field['name']}' is missing"
                )
    
    # Execute rule in background
    background_tasks.add_task(
        rule_service.execute_rule,
        db,
        rule.id,
        rule.user_id,
        input_data,
        "webhook"
    )
    
    return {
        "status": "accepted",
        "message": "Rule execution triggered",
        "rule_id": rule_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/models/rules", response_model=List[schemas.RuleModelListItem])
async def get_rule_models(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rule engines that appear as models"""
    return rule_service.get_rule_models(db=db, user_id=current_user.id)

@router.post("/{rule_id}/clone", response_model=schemas.RuleResponse)
async def clone_rule(
    rule_id: int,
    clone_request: schemas.RuleCloneRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clone an existing rule"""
    cloned_rule = rule_service.clone_rule(
        db=db,
        rule_id=rule_id,
        user_id=current_user.id,
        new_name=clone_request.new_name
    )
    if not cloned_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return cloned_rule