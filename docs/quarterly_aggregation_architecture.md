# Quarterly Aggregation Architecture

## Overview

This architecture provides a clean, scalable approach to handling NULL vs 0 in quarterly aggregation while respecting quarter applicability for indicators.

## Key Design Principles

### 1. Database Schema Design

#### Indicator Model
- **`applicable_quarters`**: JSONField storing list of applicable quarters [1, 2, 3, 4]
- **Empty list** = All quarters apply
- **Partial list** = Only specified quarters apply (e.g., [1, 2] for Q1-Q2 only indicators)

#### QuarterlyBreakdown Model
- **NULL values**: Represent "not applicable" or "not set"
- **Decimal values**: Represent actual target values
- **Fields**: `q1, q2, q3, q4` are now nullable

#### QuarterlyPerformance Model
- **NULL values**: Represent "not applicable" or "not reported"
- **Decimal values**: Represent actual performance values

### 2. NULL vs 0 Semantics

| Value | Meaning | When to Use |
|-------|---------|-------------|
| `NULL` | Not applicable / Not set | Quarter doesn't apply to indicator |
| `0` | Zero target/performance | Quarter applies but value is zero |

### 3. Aggregation Logic

#### Core Principles
1. **Respect quarter applicability**: Only aggregate applicable quarters
2. **Preserve NULL semantics**: Return NULL when no applicable indicators exist
3. **Avoid N+1 queries**: Use bulk operations and efficient joins
4. **Clean separation**: Business logic in utilities, not models

#### Implementation Strategy

```python
# Example: Quarterly aggregation with NULL handling
def get_quarterly_breakdown_aggregate(group, year):
    result = {'q1': None, 'q2': None, 'q3': None, 'q4': None}
    
    for quarter_num in range(1, 5):
        quarter_field = f'q{quarter_num}'
        
        # Filter by quarter applicability
        applicable_indicators = [
            ind for ind in direct_indicators 
            if ind.is_quarter_applicable(quarter_num)
        ]
        
        if applicable_indicators:
            # Sum only applicable indicators
            quarter_sum = sum(bd.get_quarter_value(quarter_num) or 0 
                           for bd in breakdowns)
            result[quarter_field] = quarter_sum
        # else: remains None (not applicable)
    
    return result
```

## API Response Format

### Individual Indicator Response
```json
{
  "id": 1,
  "name": "Crop Yield",
  "applicable_quarters": [1, 2],
  "quarterly_breakdown": {
    "q1": 100.0,
    "q2": 150.0,
    "q3": null,
    "q4": null,
    "quarter_applicability": {
      "q1": true,
      "q2": true,
      "q3": false,
      "q4": false
    },
    "quarter_values": {
      "q1": 100.0,
      "q2": 150.0,
      "q3": null,
      "q4": null
    }
  }
}
```

### Group Aggregation Response
```json
{
  "id": 1,
  "name": "Agriculture Indicators",
  "quarterly_breakdown_aggregate": {
    "q1": 500.0,
    "q2": 750.0,
    "q3": null,
    "q4": 200.0
  }
}
```

## Frontend Integration

### Display Logic
```javascript
function displayQuarterValue(value, isApplicable) {
  if (!isApplicable) {
    return "N/A";
  }
  if (value === null) {
    return "Not Set";
  }
  return value.toFixed(2);
}
```

### Form Validation
- Only show input fields for applicable quarters
- Validate that sum of applicable quarters equals annual target
- Allow NULL for non-applicable quarters

## Performance Optimizations

### 1. Bulk Aggregation
```python
# Avoid N+1 queries with bulk operations
def get_bulk_quarterly_aggregates(groups, year):
    # Collect all indicators at once
    # Single query for all breakdowns
    # Efficient in-memory aggregation
```

### 2. Query Optimization
- Use `select_related` for indicator relationships
- Filter by quarter applicability in database when possible
- Cache aggregation results for frequently accessed data

### 3. Database Indexes
```python
class Indicator(models.Model):
    applicable_quarters = models.JSONField(
        default=list,
        db_index=True  # Add GIN index for JSON field
    )
```

## Migration Strategy

### Phase 1: Schema Changes
1. Add `applicable_quarters` field to Indicator
2. Make quarterly fields nullable
3. Run data migration to set existing values

### Phase 2: Data Migration
```python
def migrate_existing_data():
    # Set all existing indicators to [1, 2, 3, 4] (all quarters)
    # Convert existing 0 values to NULL where appropriate
    # Validate data integrity
```

### Phase 3: Application Updates
1. Update serializers to handle NULL values
2. Implement new aggregation logic
3. Update frontend to display "N/A" appropriately

## Testing Strategy

### Unit Tests
- Test quarter applicability logic
- Test aggregation with mixed NULL/0 values
- Test edge cases (all NULL, all 0, mixed)

### Integration Tests
- Test API responses with different quarter configurations
- Test group aggregation scenarios
- Test performance with large datasets

### Frontend Tests
- Test display logic for NULL vs "N/A"
- Test form validation with partial quarters
- Test user experience scenarios

## Benefits of This Architecture

1. **Clear Semantics**: NULL means "not applicable", 0 means "zero value"
2. **Flexible**: Supports any combination of applicable quarters
3. **Scalable**: Efficient aggregation avoids N+1 queries
4. **Maintainable**: Clean separation of concerns
5. **Backwards Compatible**: Existing data can be migrated smoothly
6. **User-Friendly**: Frontend can show "N/A" for non-applicable quarters

## Future Enhancements

1. **Caching**: Cache aggregation results for performance
2. **Validation Rules**: More sophisticated quarter applicability rules
3. **Bulk Operations**: Bulk import/export with quarter applicability
4. **Reporting**: Enhanced reporting with quarter applicability filters
5. **Audit Trail**: Track changes to quarter applicability over time
