# Rules Engine Connector Fix Summary

## Issue Fixed
The AND/OR operator was appearing at the beginning of the conditions group, which didn't make logical sense. Operators should appear BETWEEN conditions as connectors.

## Changes Made

### 1. Data Structure Update
Added `connector` property to conditions and groups:
```javascript
condition: {
    id: 'condition_1',
    type: 'condition',
    field: 'x',
    operator: 'equals',        // comparison operator
    value: 'y',
    connector: 'AND'           // how this connects to previous condition
}
```

### 2. Removed Group-Level Operator
- Removed the operator selector from the beginning of condition groups
- The root group no longer shows an AND/OR selector when empty

### 3. Added Connectors Between Conditions
- First condition: No connector
- Second+ conditions: Show AND/OR selector before each one
- Connectors are rendered in the parent group's logic

### 4. Visual Layout
Before:
```
[AND ▼]  <-- Confusing!
[Field] [Operator] [Value]
[Field] [Operator] [Value]
```

After:
```
[Field] [Operator] [Value]
[AND ▼]
[Field] [Operator] [Value]
[OR ▼]
[Field] [Operator] [Value]
```

### 5. Event Handling
- Updated `attachConditionEventListeners` to handle connector changes
- Connector changes update the condition's `connector` property

## How It Works Now

1. **Adding first condition**: No connector shown
2. **Adding second condition**: Automatically gets `connector: 'AND'`
3. **User can change connector**: Dropdown between conditions allows AND/OR selection
4. **Logical flow**: Creates natural reading like "IF x = y AND z > 10 THEN..."

## Example Rule Structure
```javascript
{
    conditions: {
        id: 'root',
        type: 'group',
        operator: 'AND',  // Still here but not displayed
        children: [
            {
                id: 'condition_0',
                field: 'api.input.userId',
                operator: 'equals',
                value: '123',
                connector: null  // First condition, no connector
            },
            {
                id: 'condition_1',
                field: 'api.input.amount',
                operator: 'greater_than',
                value: '100',
                connector: 'AND'  // Connects to previous with AND
            },
            {
                id: 'condition_2',
                field: 'api.input.status',
                operator: 'equals',
                value: 'active',
                connector: 'OR'   // Connects to previous with OR
            }
        ]
    }
}
```

This creates the logical expression: 
`IF (userId = '123' AND amount > 100) OR (status = 'active') THEN ...`