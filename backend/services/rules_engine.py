from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from models.miscellaneous import Rule, RuleExecution
from models.model import Model
from services.model_service import get_model_by_id
from services.predict import run_prediction
import json
import re
import operator
from datetime import datetime

class RulesExecutionEngine:
    """Advanced rules execution engine with support for complex conditions and actions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.context = {}
        self.variables = {}
        
        # Operator mapping
        self.operators = {
            'equals': operator.eq,
            'not_equals': operator.ne,
            'greater_than': operator.gt,
            'less_than': operator.lt,
            'greater_equal': operator.ge,
            'less_equal': operator.le,
            'contains': lambda a, b: b in str(a),
            'starts_with': lambda a, b: str(a).startswith(str(b)),
            'ends_with': lambda a, b: str(a).endswith(str(b)),
            'in_list': lambda a, b: a in b.split(',') if isinstance(b, str) else a in b,
            'not_in_list': lambda a, b: a not in b.split(',') if isinstance(b, str) else a not in b,
            'is_empty': lambda a, b: not a,
            'is_not_empty': lambda a, b: bool(a),
            'regex': lambda a, b: bool(re.search(b, str(a)))
        }
    
    def execute(self, rule: Rule, input_data: Dict[str, Any], trigger_type: str = 'manual') -> Dict[str, Any]:
        """Execute a rule with given input data"""
        self.context = {
            'input': input_data,
            'trigger_type': trigger_type,
            'rule_id': rule.id,
            'user_id': rule.user_id,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.variables = {}
        
        logic = rule.logic_json
        
        # Evaluate conditions
        conditions_result = self.evaluate_conditions(logic.get('conditions', {}))
        
        if not conditions_result:
            return {
                'conditions_met': False,
                'message': 'Conditions not satisfied',
                'context': self.context,
                'variables': self.variables
            }
        
        # Execute actions
        action_results = []
        execution_mode = rule.execution_mode or 'sequential'
        
        if execution_mode == 'sequential':
            action_results = self.execute_actions_sequential(logic.get('actions', []))
        else:  # parallel
            action_results = self.execute_actions_parallel(logic.get('actions', []))
        
        return {
            'conditions_met': True,
            'actions_executed': len(action_results),
            'results': action_results,
            'context': self.context,
            'variables': self.variables
        }
    
    def evaluate_conditions(self, conditions: Dict[str, Any]) -> bool:
        """Recursively evaluate condition groups and individual conditions"""
        if not conditions:
            return True
        
        condition_type = conditions.get('type', 'condition')
        
        if condition_type == 'group':
            return self.evaluate_condition_group(conditions)
        else:
            return self.evaluate_single_condition(conditions)
    
    def evaluate_condition_group(self, group: Dict[str, Any]) -> bool:
        """Evaluate a group of conditions with AND/OR logic"""
        operator_type = group.get('operator', 'AND')
        children = group.get('children', [])
        
        if not children:
            return True
        
        results = [self.evaluate_conditions(child) for child in children]
        
        if operator_type == 'AND':
            return all(results)
        else:  # OR
            return any(results)
    
    def evaluate_single_condition(self, condition: Dict[str, Any]) -> bool:
        """Evaluate a single condition"""
        field = condition.get('field', '')
        operator_name = condition.get('operator', 'equals')
        value = condition.get('value', '')
        
        # Get field value from context or variables
        field_value = self.get_field_value(field)
        
        # Get operator function
        op_func = self.operators.get(operator_name, self.operators['equals'])
        
        try:
            return op_func(field_value, value)
        except Exception as e:
            print(f"Error evaluating condition: {e}")
            return False
    
    def get_field_value(self, field_path: str) -> Any:
        """Get value from field path (e.g., 'input.field1', 'model.output'"""
        parts = field_path.split('.')
        
        # Start with context or variables
        if parts[0] in self.context:
            value = self.context[parts[0]]
        elif parts[0] in self.variables:
            value = self.variables[parts[0]]
        else:
            return None
        
        # Navigate through nested structure
        for part in parts[1:]:
            if isinstance(value, dict):
                value = value.get(part)
            elif hasattr(value, part):
                value = getattr(value, part)
            else:
                return None
        
        return value
    
    def execute_actions_sequential(self, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute actions one after another"""
        results = []
        
        for action in actions:
            try:
                result = self.execute_action(action)
                results.append(result)
                
                # Store output in variables if specified
                if 'output_variable' in action.get('config', {}):
                    var_name = action['config']['output_variable']
                    self.variables[var_name] = result.get('output')
                    
            except Exception as e:
                error_result = {
                    'action_id': action.get('id'),
                    'action_type': action.get('type'),
                    'status': 'failed',
                    'error': str(e)
                }
                results.append(error_result)
                
                # Check error handling strategy
                if self.should_stop_on_error(action):
                    break
        
        return results
    
    def execute_actions_parallel(self, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute actions in parallel (simplified for now)"""
        # In a real implementation, this would use threading or async
        return self.execute_actions_sequential(actions)
    
    def execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single action based on its type"""
        action_type = action.get('type')
        config = action.get('config', {})
        
        if action_type == 'trigger_model':
            return self.trigger_model(config)
        elif action_type == 'send_notification':
            return self.send_notification(config)
        elif action_type == 'webhook':
            return self.call_webhook(config)
        elif action_type == 'store_data':
            return self.store_data(config)
        elif action_type == 'transform_data':
            return self.transform_data(config)
        elif action_type == 'conditional_action':
            return self.conditional_action(config)
        elif action_type == 'trigger_rule':
            return self.trigger_rule(config)
        else:
            return {
                'action_type': action_type,
                'status': 'unsupported',
                'message': f'Action type {action_type} is not yet implemented'
            }
    
    def trigger_model(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger a model execution"""
        model_id = config.get('modelId')
        input_mapping = config.get('inputMapping', {})
        
        if not model_id:
            return {'status': 'failed', 'error': 'No model ID specified'}
        
        # Get the model
        model = get_model_by_id(self.db, int(model_id), self.context['user_id'])
        if not model:
            return {'status': 'failed', 'error': 'Model not found'}
        
        # Prepare input data
        model_input = self.resolve_input_mapping(input_mapping)
        
        # Execute model (placeholder - would call actual model execution)
        # result = run_prediction(self.db, model, model_input)
        
        # Simulated result
        result = {
            'prediction': 0.85,
            'label': 'positive',
            'confidence': 0.92
        }
        
        return {
            'action_type': 'trigger_model',
            'status': 'success',
            'model_id': model_id,
            'model_name': model.name,
            'output': result
        }
    
    def send_notification(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Send a notification"""
        notification_type = config.get('type', 'in_app')
        recipients = config.get('recipients', [])
        message = config.get('message', '')
        
        # Resolve template variables in message
        message = self.resolve_template(message)
        
        # In real implementation, would send actual notification
        return {
            'action_type': 'send_notification',
            'status': 'success',
            'notification_type': notification_type,
            'recipients': recipients,
            'message': message
        }
    
    def call_webhook(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Call an external webhook"""
        url = config.get('url')
        method = config.get('method', 'POST')
        payload = config.get('payload', {})
        
        # Resolve template variables in payload
        resolved_payload = self.resolve_input_mapping(payload)
        
        # In real implementation, would make actual HTTP request
        return {
            'action_type': 'webhook',
            'status': 'success',
            'url': url,
            'method': method,
            'response': {'status': 200, 'body': 'OK'}
        }
    
    def trigger_rule(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger another rule engine"""
        rule_id = config.get('ruleId')
        input_data = config.get('inputData', {})
        
        if not rule_id:
            return {'status': 'failed', 'error': 'No rule ID specified'}
        
        # Get the rule
        rule = self.db.query(Rule).filter(Rule.id == int(rule_id)).first()
        if not rule:
            return {'status': 'failed', 'error': 'Rule not found'}
        
        # Resolve input data
        resolved_input = self.resolve_input_mapping(input_data)
        
        # Execute the rule (recursive call)
        sub_engine = RulesExecutionEngine(self.db)
        result = sub_engine.execute(rule, resolved_input, 'chained')
        
        return {
            'action_type': 'trigger_rule',
            'status': 'success',
            'rule_id': rule_id,
            'rule_name': rule.rule_name,
            'output': result
        }
    
    def store_data(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Store data action"""
        storage_type = config.get('storageType', 'variable')
        key = config.get('key')
        value = config.get('value')
        
        # Resolve template in value
        resolved_value = self.resolve_template(str(value)) if isinstance(value, str) else value
        
        if storage_type == 'variable':
            self.variables[key] = resolved_value
        
        return {
            'action_type': 'store_data',
            'status': 'success',
            'storage_type': storage_type,
            'key': key
        }
    
    def transform_data(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data action"""
        transformation = config.get('transformation', {})
        
        # Simple transformation examples
        result = {}
        for key, transform_config in transformation.items():
            source = transform_config.get('source')
            operation = transform_config.get('operation', 'copy')
            
            source_value = self.get_field_value(source)
            
            if operation == 'copy':
                result[key] = source_value
            elif operation == 'uppercase':
                result[key] = str(source_value).upper()
            elif operation == 'lowercase':
                result[key] = str(source_value).lower()
            elif operation == 'sum':
                # Sum array of numbers
                result[key] = sum(source_value) if isinstance(source_value, list) else source_value
        
        return {
            'action_type': 'transform_data',
            'status': 'success',
            'output': result
        }
    
    def conditional_action(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Conditional action execution"""
        condition = config.get('condition', {})
        then_action = config.get('thenAction', {})
        else_action = config.get('elseAction', {})
        
        # Evaluate condition
        condition_met = self.evaluate_conditions(condition)
        
        # Execute appropriate action
        if condition_met and then_action:
            return self.execute_action(then_action)
        elif not condition_met and else_action:
            return self.execute_action(else_action)
        
        return {
            'action_type': 'conditional_action',
            'status': 'success',
            'condition_met': condition_met
        }
    
    def resolve_template(self, template: str) -> str:
        """Resolve template variables like {{variable_name}}"""
        pattern = r'\{\{([^}]+)\}\}'
        
        def replacer(match):
            var_path = match.group(1).strip()
            value = self.get_field_value(var_path)
            return str(value) if value is not None else match.group(0)
        
        return re.sub(pattern, replacer, template)
    
    def resolve_input_mapping(self, mapping: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve input mapping with template variables"""
        resolved = {}
        
        for key, value in mapping.items():
            if isinstance(value, str):
                resolved[key] = self.resolve_template(value)
            elif isinstance(value, dict):
                resolved[key] = self.resolve_input_mapping(value)
            else:
                resolved[key] = value
        
        return resolved
    
    def should_stop_on_error(self, action: Dict[str, Any]) -> bool:
        """Check if execution should stop on error"""
        # Check action-level error handling
        action_error_handling = action.get('errorHandling', {})
        if action_error_handling.get('strategy') == 'continue':
            return False
        
        # Default to stop on error
        return True