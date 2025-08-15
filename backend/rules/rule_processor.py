"""
Rules Engine - Advanced Business Rules Processing
Implements a flexible rule engine for automation and decision making
"""

import re
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import operator
import ast
import hashlib
from collections import defaultdict
import croniter
import uuid


class RuleStatus(Enum):
    """Rule status states"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TESTING = "testing"
    FAILED = "failed"
    SCHEDULED = "scheduled"


class ConditionOperator(Enum):
    """Supported condition operators"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_OR_EQUAL = "greater_or_equal"
    LESS_OR_EQUAL = "less_or_equal"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IN = "in"
    NOT_IN = "not_in"
    MATCHES_REGEX = "matches_regex"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"
    BETWEEN = "between"
    NOT_BETWEEN = "not_between"


class LogicalOperator(Enum):
    """Logical operators for combining conditions"""
    AND = "and"
    OR = "or"
    NOT = "not"
    XOR = "xor"


class ActionType(Enum):
    """Types of actions that can be executed"""
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    SEND_NOTIFICATION = "send_notification"
    UPDATE_FIELD = "update_field"
    CALL_WEBHOOK = "call_webhook"
    TRIGGER_JOB = "trigger_job"
    LOG_EVENT = "log_event"
    ALERT = "alert"
    EXECUTE_SCRIPT = "execute_script"
    MODIFY_DATA = "modify_data"
    APPROVE_REQUEST = "approve_request"
    REJECT_REQUEST = "reject_request"
    ESCALATE = "escalate"


@dataclass
class Condition:
    """Single condition in a rule"""
    field: str
    operator: ConditionOperator
    value: Any
    case_sensitive: bool = True
    data_type: str = "string"  # string, number, boolean, datetime, array
    
    def evaluate(self, context: Dict) -> bool:
        """Evaluate condition against context"""
        try:
            # Get field value from context (supports nested fields)
            field_value = self._get_nested_value(context, self.field)
            
            # Handle null checks
            if self.operator == ConditionOperator.IS_NULL:
                return field_value is None
            elif self.operator == ConditionOperator.IS_NOT_NULL:
                return field_value is not None
            
            # If field value is None and not checking for null, condition fails
            if field_value is None:
                return False
            
            # Type conversion
            field_value = self._convert_type(field_value, self.data_type)
            compare_value = self._convert_type(self.value, self.data_type)
            
            # Case sensitivity for strings
            if self.data_type == "string" and not self.case_sensitive:
                field_value = str(field_value).lower()
                compare_value = str(compare_value).lower() if not isinstance(compare_value, list) else [str(v).lower() for v in compare_value]
            
            # Evaluate based on operator
            if self.operator == ConditionOperator.EQUALS:
                return field_value == compare_value
            elif self.operator == ConditionOperator.NOT_EQUALS:
                return field_value != compare_value
            elif self.operator == ConditionOperator.GREATER_THAN:
                return field_value > compare_value
            elif self.operator == ConditionOperator.LESS_THAN:
                return field_value < compare_value
            elif self.operator == ConditionOperator.GREATER_OR_EQUAL:
                return field_value >= compare_value
            elif self.operator == ConditionOperator.LESS_OR_EQUAL:
                return field_value <= compare_value
            elif self.operator == ConditionOperator.CONTAINS:
                return str(compare_value) in str(field_value)
            elif self.operator == ConditionOperator.NOT_CONTAINS:
                return str(compare_value) not in str(field_value)
            elif self.operator == ConditionOperator.STARTS_WITH:
                return str(field_value).startswith(str(compare_value))
            elif self.operator == ConditionOperator.ENDS_WITH:
                return str(field_value).endswith(str(compare_value))
            elif self.operator == ConditionOperator.IN:
                return field_value in compare_value
            elif self.operator == ConditionOperator.NOT_IN:
                return field_value not in compare_value
            elif self.operator == ConditionOperator.MATCHES_REGEX:
                return bool(re.match(str(compare_value), str(field_value)))
            elif self.operator == ConditionOperator.BETWEEN:
                return compare_value[0] <= field_value <= compare_value[1]
            elif self.operator == ConditionOperator.NOT_BETWEEN:
                return not (compare_value[0] <= field_value <= compare_value[1])
            else:
                return False
                
        except Exception as e:
            print(f"Error evaluating condition: {e}")
            return False
    
    def _get_nested_value(self, obj: Dict, path: str) -> Any:
        """Get value from nested dictionary using dot notation"""
        keys = path.split('.')
        value = obj
        
        for key in keys:
            # Handle array indices
            if '[' in key and ']' in key:
                base_key = key[:key.index('[')]
                index = int(key[key.index('[')+1:key.index(']')])
                value = value.get(base_key, [])[index] if base_key in value else None
            else:
                value = value.get(key) if isinstance(value, dict) else None
            
            if value is None:
                break
        
        return value
    
    def _convert_type(self, value: Any, data_type: str) -> Any:
        """Convert value to specified type"""
        if value is None:
            return None
        
        try:
            if data_type == "number":
                return float(value)
            elif data_type == "boolean":
                if isinstance(value, bool):
                    return value
                return str(value).lower() in ['true', '1', 'yes']
            elif data_type == "datetime":
                if isinstance(value, datetime):
                    return value
                return datetime.fromisoformat(str(value))
            elif data_type == "array":
                if isinstance(value, list):
                    return value
                return [value]
            else:  # string
                return str(value)
        except:
            return value


@dataclass
class ConditionGroup:
    """Group of conditions with logical operator"""
    operator: LogicalOperator
    conditions: List[Union[Condition, 'ConditionGroup']]
    
    def evaluate(self, context: Dict) -> bool:
        """Evaluate condition group against context"""
        results = [
            cond.evaluate(context) for cond in self.conditions
        ]
        
        if self.operator == LogicalOperator.AND:
            return all(results)
        elif self.operator == LogicalOperator.OR:
            return any(results)
        elif self.operator == LogicalOperator.NOT:
            return not results[0] if results else False
        elif self.operator == LogicalOperator.XOR:
            return sum(results) == 1
        else:
            return False


@dataclass
class Action:
    """Action to be executed when rule conditions are met"""
    action_type: ActionType
    parameters: Dict[str, Any]
    async_execution: bool = False
    retry_count: int = 3
    retry_delay: int = 5  # seconds
    timeout: int = 30  # seconds
    
    async def execute(self, context: Dict, action_handlers: Dict) -> Dict:
        """Execute the action"""
        handler = action_handlers.get(self.action_type)
        if not handler:
            return {
                'success': False,
                'error': f'No handler for action type: {self.action_type.value}'
            }
        
        # Merge context into parameters
        enriched_params = self._enrich_parameters(self.parameters, context)
        
        # Execute with retry logic
        for attempt in range(self.retry_count):
            try:
                if self.async_execution:
                    result = await asyncio.wait_for(
                        handler(enriched_params, context),
                        timeout=self.timeout
                    )
                else:
                    result = await handler(enriched_params, context)
                
                return {
                    'success': True,
                    'result': result,
                    'attempts': attempt + 1
                }
                
            except asyncio.TimeoutError:
                if attempt == self.retry_count - 1:
                    return {
                        'success': False,
                        'error': 'Action execution timeout',
                        'attempts': attempt + 1
                    }
            except Exception as e:
                if attempt == self.retry_count - 1:
                    return {
                        'success': False,
                        'error': str(e),
                        'attempts': attempt + 1
                    }
                
                await asyncio.sleep(self.retry_delay)
        
        return {
            'success': False,
            'error': 'Max retries exceeded'
        }
    
    def _enrich_parameters(self, params: Dict, context: Dict) -> Dict:
        """Enrich parameters with context values"""
        enriched = {}
        
        for key, value in params.items():
            if isinstance(value, str):
                # Replace template variables {{variable}}
                enriched[key] = self._replace_templates(value, context)
            elif isinstance(value, dict):
                enriched[key] = self._enrich_parameters(value, context)
            elif isinstance(value, list):
                enriched[key] = [
                    self._replace_templates(v, context) if isinstance(v, str) else v
                    for v in value
                ]
            else:
                enriched[key] = value
        
        return enriched
    
    def _replace_templates(self, template: str, context: Dict) -> str:
        """Replace template variables with context values"""
        pattern = r'\{\{(\w+(?:\.\w+)*)\}\}'
        
        def replacer(match):
            path = match.group(1)
            value = self._get_nested_value(context, path)
            return str(value) if value is not None else match.group(0)
        
        return re.sub(pattern, replacer, template)
    
    def _get_nested_value(self, obj: Dict, path: str) -> Any:
        """Get value from nested dictionary"""
        keys = path.split('.')
        value = obj
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            
            if value is None:
                break
        
        return value


@dataclass
class Rule:
    """Complete rule definition"""
    rule_id: str
    name: str
    description: str
    conditions: ConditionGroup
    actions: List[Action]
    priority: int = 5
    enabled: bool = True
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0
    
    # Execution control
    max_triggers_per_hour: Optional[int] = None
    cooldown_seconds: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    # Scheduling
    schedule: Optional[str] = None  # Cron expression
    
    def is_valid(self) -> bool:
        """Check if rule is currently valid"""
        if not self.enabled:
            return False
        
        now = datetime.utcnow()
        
        if self.valid_from and now < self.valid_from:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        return True
    
    def can_trigger(self) -> bool:
        """Check if rule can be triggered based on limits"""
        if not self.is_valid():
            return False
        
        # Check cooldown
        if self.cooldown_seconds and self.last_triggered:
            cooldown_end = self.last_triggered + timedelta(seconds=self.cooldown_seconds)
            if datetime.utcnow() < cooldown_end:
                return False
        
        # Check rate limit
        if self.max_triggers_per_hour:
            # This would need to check trigger history
            # Simplified for now
            pass
        
        return True


class RuleProcessor:
    """Main rule processing engine"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.rules: Dict[str, Rule] = {}
        self.action_handlers: Dict[ActionType, Callable] = {}
        self.execution_history: List[Dict] = []
        self.compiled_rules: Dict[str, Any] = {}  # Cached compiled rules
        self.rule_index: Dict[str, List[str]] = defaultdict(list)  # Field -> Rule IDs
        
        # Initialize default action handlers
        self._initialize_default_handlers()
        
    def _initialize_default_handlers(self):
        """Initialize default action handlers"""
        self.action_handlers[ActionType.LOG_EVENT] = self._handle_log_event
        self.action_handlers[ActionType.SEND_NOTIFICATION] = self._handle_send_notification
        self.action_handlers[ActionType.UPDATE_FIELD] = self._handle_update_field
        self.action_handlers[ActionType.CALL_WEBHOOK] = self._handle_webhook
        self.action_handlers[ActionType.TRIGGER_JOB] = self._handle_trigger_job
    
    # Rule Management
    def add_rule(self, rule: Rule) -> bool:
        """Add a new rule to the processor"""
        try:
            # Validate rule
            if not self._validate_rule(rule):
                return False
            
            # Compile rule for optimization
            self._compile_rule(rule)
            
            # Index rule by fields
            self._index_rule(rule)
            
            # Store rule
            self.rules[rule.rule_id] = rule
            
            print(f"Rule added: {rule.name} ({rule.rule_id})")
            return True
            
        except Exception as e:
            print(f"Failed to add rule: {e}")
            return False
    
    def remove_rule(self, rule_id: str) -> bool:
        """Remove a rule from the processor"""
        if rule_id in self.rules:
            rule = self.rules[rule_id]
            
            # Remove from index
            self._unindex_rule(rule)
            
            # Remove compiled version
            if rule_id in self.compiled_rules:
                del self.compiled_rules[rule_id]
            
            # Remove rule
            del self.rules[rule_id]
            
            print(f"Rule removed: {rule_id}")
            return True
        
        return False
    
    def update_rule(self, rule_id: str, updates: Dict) -> bool:
        """Update an existing rule"""
        if rule_id not in self.rules:
            return False
        
        rule = self.rules[rule_id]
        
        # Remove from index
        self._unindex_rule(rule)
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        rule.updated_at = datetime.utcnow()
        
        # Recompile and reindex
        self._compile_rule(rule)
        self._index_rule(rule)
        
        return True
    
    # Rule Execution
    async def process_event(self, event: Dict) -> List[Dict]:
        """Process an event against all rules"""
        results = []
        
        # Find potentially matching rules using index
        candidate_rules = self._find_candidate_rules(event)
        
        # Sort by priority
        candidate_rules.sort(key=lambda r: r.priority)
        
        # Evaluate rules
        for rule in candidate_rules:
            if not rule.can_trigger():
                continue
            
            # Evaluate conditions
            if rule.conditions.evaluate(event):
                # Execute actions
                action_results = await self._execute_rule_actions(rule, event)
                
                # Update rule statistics
                rule.last_triggered = datetime.utcnow()
                rule.trigger_count += 1
                
                # Record execution
                execution_record = {
                    'rule_id': rule.rule_id,
                    'rule_name': rule.name,
                    'event': event,
                    'timestamp': datetime.utcnow().isoformat(),
                    'action_results': action_results
                }
                
                self.execution_history.append(execution_record)
                results.append(execution_record)
                
                print(f"Rule triggered: {rule.name}")
        
        return results
    
    async def _execute_rule_actions(self, rule: Rule, context: Dict) -> List[Dict]:
        """Execute all actions for a triggered rule"""
        results = []
        
        for action in rule.actions:
            result = await action.execute(context, self.action_handlers)
            results.append({
                'action_type': action.action_type.value,
                'parameters': action.parameters,
                'result': result
            })
        
        return results
    
    # Rule Compilation and Optimization
    def _compile_rule(self, rule: Rule):
        """Compile rule for optimized execution"""
        # Create optimized representation
        compiled = {
            'rule_id': rule.rule_id,
            'priority': rule.priority,
            'conditions_ast': self._compile_conditions(rule.conditions),
            'fields_used': self._extract_fields(rule.conditions)
        }
        
        self.compiled_rules[rule.rule_id] = compiled
    
    def _compile_conditions(self, conditions: ConditionGroup) -> str:
        """Compile conditions to Python AST for faster evaluation"""
        # This would create an optimized representation
        # For now, return a simple representation
        return str(conditions)
    
    def _extract_fields(self, conditions: ConditionGroup) -> Set[str]:
        """Extract all fields used in conditions"""
        fields = set()
        
        def extract(cond):
            if isinstance(cond, Condition):
                fields.add(cond.field)
            elif isinstance(cond, ConditionGroup):
                for c in cond.conditions:
                    extract(c)
        
        extract(conditions)
        return fields
    
    # Indexing
    def _index_rule(self, rule: Rule):
        """Index rule by fields for efficient lookup"""
        compiled = self.compiled_rules.get(rule.rule_id)
        if compiled:
            for field in compiled['fields_used']:
                self.rule_index[field].append(rule.rule_id)
    
    def _unindex_rule(self, rule: Rule):
        """Remove rule from index"""
        compiled = self.compiled_rules.get(rule.rule_id)
        if compiled:
            for field in compiled['fields_used']:
                if rule.rule_id in self.rule_index[field]:
                    self.rule_index[field].remove(rule.rule_id)
    
    def _find_candidate_rules(self, event: Dict) -> List[Rule]:
        """Find rules that might match the event"""
        candidate_ids = set()
        
        # Find rules that use fields present in the event
        for field in event.keys():
            candidate_ids.update(self.rule_index.get(field, []))
        
        # Also include rules with wildcard fields
        candidate_ids.update(self.rule_index.get('*', []))
        
        # Return rule objects
        return [
            self.rules[rule_id]
            for rule_id in candidate_ids
            if rule_id in self.rules and self.rules[rule_id].is_valid()
        ]
    
    # Validation
    def _validate_rule(self, rule: Rule) -> bool:
        """Validate rule structure and logic"""
        # Check for required fields
        if not rule.rule_id or not rule.name:
            return False
        
        # Validate conditions
        if not self._validate_conditions(rule.conditions):
            return False
        
        # Validate actions
        if not rule.actions:
            return False
        
        for action in rule.actions:
            if action.action_type not in self.action_handlers:
                print(f"Warning: No handler for action type {action.action_type}")
        
        return True
    
    def _validate_conditions(self, conditions: ConditionGroup) -> bool:
        """Validate condition structure"""
        if not conditions.conditions:
            return False
        
        for cond in conditions.conditions:
            if isinstance(cond, ConditionGroup):
                if not self._validate_conditions(cond):
                    return False
            elif isinstance(cond, Condition):
                if not cond.field:
                    return False
        
        return True
    
    # Default Action Handlers
    async def _handle_log_event(self, params: Dict, context: Dict) -> Dict:
        """Default handler for logging events"""
        message = params.get('message', 'Rule triggered')
        level = params.get('level', 'INFO')
        
        print(f"[{level}] {message}")
        
        return {'logged': True, 'message': message}
    
    async def _handle_send_notification(self, params: Dict, context: Dict) -> Dict:
        """Default handler for sending notifications"""
        recipient = params.get('recipient')
        message = params.get('message')
        channel = params.get('channel', 'email')
        
        # This would integrate with notification service
        print(f"Notification to {recipient} via {channel}: {message}")
        
        return {'sent': True, 'recipient': recipient}
    
    async def _handle_update_field(self, params: Dict, context: Dict) -> Dict:
        """Default handler for updating fields"""
        field = params.get('field')
        value = params.get('value')
        
        # This would update in database
        print(f"Update {field} = {value}")
        
        return {'updated': True, 'field': field, 'value': value}
    
    async def _handle_webhook(self, params: Dict, context: Dict) -> Dict:
        """Default handler for webhook calls"""
        url = params.get('url')
        method = params.get('method', 'POST')
        headers = params.get('headers', {})
        body = params.get('body', context)
        
        # This would make actual HTTP request
        print(f"Webhook: {method} {url}")
        
        return {'called': True, 'url': url}
    
    async def _handle_trigger_job(self, params: Dict, context: Dict) -> Dict:
        """Default handler for triggering jobs"""
        job_type = params.get('job_type')
        job_params = params.get('parameters', {})
        
        # This would submit job to queue
        print(f"Trigger job: {job_type}")
        
        return {'triggered': True, 'job_type': job_type}
    
    # Custom Action Handler Registration
    def register_action_handler(self, action_type: ActionType, handler: Callable):
        """Register a custom action handler"""
        self.action_handlers[action_type] = handler
    
    # Testing
    async def test_rule(self, rule_id: str, test_event: Dict) -> Dict:
        """Test a rule against a sample event"""
        if rule_id not in self.rules:
            return {'error': 'Rule not found'}
        
        rule = self.rules[rule_id]
        
        # Evaluate conditions
        condition_result = rule.conditions.evaluate(test_event)
        
        # Simulate action execution
        action_results = []
        if condition_result:
            for action in rule.actions:
                # Don't actually execute, just validate
                enriched_params = action._enrich_parameters(action.parameters, test_event)
                action_results.append({
                    'action_type': action.action_type.value,
                    'would_execute': enriched_params
                })
        
        return {
            'rule_id': rule_id,
            'rule_name': rule.name,
            'conditions_met': condition_result,
            'actions': action_results
        }
    
    # Statistics and Monitoring
    def get_rule_statistics(self, rule_id: str) -> Optional[Dict]:
        """Get statistics for a specific rule"""
        if rule_id not in self.rules:
            return None
        
        rule = self.rules[rule_id]
        
        return {
            'rule_id': rule_id,
            'name': rule.name,
            'enabled': rule.enabled,
            'trigger_count': rule.trigger_count,
            'last_triggered': rule.last_triggered.isoformat() if rule.last_triggered else None,
            'created_at': rule.created_at.isoformat(),
            'updated_at': rule.updated_at.isoformat()
        }
    
    def get_execution_history(self, limit: int = 100) -> List[Dict]:
        """Get recent execution history"""
        return self.execution_history[-limit:]
    
    # Bulk Operations
    def import_rules(self, rules_data: List[Dict]) -> Dict:
        """Import multiple rules from data"""
        imported = 0
        failed = []
        
        for rule_data in rules_data:
            try:
                rule = self._parse_rule_data(rule_data)
                if self.add_rule(rule):
                    imported += 1
                else:
                    failed.append(rule_data.get('rule_id', 'unknown'))
            except Exception as e:
                failed.append(rule_data.get('rule_id', 'unknown'))
        
        return {
            'imported': imported,
            'failed': failed
        }
    
    def export_rules(self) -> List[Dict]:
        """Export all rules as data"""
        return [
            self._serialize_rule(rule)
            for rule in self.rules.values()
        ]
    
    def _parse_rule_data(self, data: Dict) -> Rule:
        """Parse rule from dictionary data"""
        # Parse conditions
        conditions = self._parse_conditions(data['conditions'])
        
        # Parse actions
        actions = [
            Action(
                action_type=ActionType(a['action_type']),
                parameters=a['parameters'],
                async_execution=a.get('async_execution', False),
                retry_count=a.get('retry_count', 3),
                retry_delay=a.get('retry_delay', 5),
                timeout=a.get('timeout', 30)
            )
            for a in data['actions']
        ]
        
        return Rule(
            rule_id=data.get('rule_id', str(uuid.uuid4())),
            name=data['name'],
            description=data.get('description', ''),
            conditions=conditions,
            actions=actions,
            priority=data.get('priority', 5),
            enabled=data.get('enabled', True),
            tags=data.get('tags', []),
            metadata=data.get('metadata', {})
        )
    
    def _parse_conditions(self, data: Dict) -> ConditionGroup:
        """Parse conditions from dictionary"""
        operator = LogicalOperator(data['operator'])
        conditions = []
        
        for cond_data in data['conditions']:
            if 'operator' in cond_data and 'conditions' in cond_data:
                # Nested condition group
                conditions.append(self._parse_conditions(cond_data))
            else:
                # Single condition
                conditions.append(
                    Condition(
                        field=cond_data['field'],
                        operator=ConditionOperator(cond_data['operator']),
                        value=cond_data['value'],
                        case_sensitive=cond_data.get('case_sensitive', True),
                        data_type=cond_data.get('data_type', 'string')
                    )
                )
        
        return ConditionGroup(operator=operator, conditions=conditions)
    
    def _serialize_rule(self, rule: Rule) -> Dict:
        """Serialize rule to dictionary"""
        return {
            'rule_id': rule.rule_id,
            'name': rule.name,
            'description': rule.description,
            'conditions': self._serialize_conditions(rule.conditions),
            'actions': [
                {
                    'action_type': action.action_type.value,
                    'parameters': action.parameters,
                    'async_execution': action.async_execution,
                    'retry_count': action.retry_count,
                    'retry_delay': action.retry_delay,
                    'timeout': action.timeout
                }
                for action in rule.actions
            ],
            'priority': rule.priority,
            'enabled': rule.enabled,
            'tags': rule.tags,
            'metadata': rule.metadata
        }
    
    def _serialize_conditions(self, conditions: ConditionGroup) -> Dict:
        """Serialize conditions to dictionary"""
        return {
            'operator': conditions.operator.value,
            'conditions': [
                self._serialize_conditions(c) if isinstance(c, ConditionGroup)
                else {
                    'field': c.field,
                    'operator': c.operator.value,
                    'value': c.value,
                    'case_sensitive': c.case_sensitive,
                    'data_type': c.data_type
                }
                for c in conditions.conditions
            ]
        }