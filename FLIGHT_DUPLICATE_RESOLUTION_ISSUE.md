# Flight Priority Guidance: Duplicate Resolution Issue

## Problem

When multiple priority pills are displayed (e.g., "Arrive at your pace" and "Chill on layovers"), both pills can resolve to the same exact flights, making the guidance appear redundant.

## Root Cause

Unlike the activities system, the flight priority resolution **lacks exclusion logic** to ensure distinct recommendations across priorities.

### Current Flow

1. **Priority pills are displayed** when guidance loads (e.g., "arrival" and "layover" priorities)
2. **User clicks a pill** → `setSelectedFlightPriority(priority.id)` is called
3. **Resolution happens** → `resolveSelectionByPriority(selectedPriority, gatewayOptions)` runs
4. **Each priority resolves independently** → No cross-priority exclusion

### Why Duplicates Occur

The `resolveSelectionByPriority` function selects the best gateway + flights for each priority:

- **"arrival" priority**: Selects gateway with earliest arriving inbound flight
- **"layover" priority**: Selects gateway with lowest layover burden

If the same gateway happens to have both:
- The earliest arriving inbound flight, AND
- The lowest layover burden

Then both priorities resolve to the same gateway and flights, causing duplicate recommendations.

### Example Scenario (Mumbai → Japan)

- Gateway A: Has earliest arrival (6 AM), minimal layovers (1 stop, 2h layover)
- Gateway B: Has later arrival (10 AM), more layovers (2 stops, 5h total)

**Result**:
- "Arrive at your pace" → Resolves to Gateway A (earliest arrival)
- "Chill on layovers" → Resolves to Gateway A (best layovers)

Both pills show the same flights, making the choice appear meaningless.

## Comparison with Activities System

The activities system prevents this issue by:

1. **Pre-resolving all priorities** when guidance loads
2. **Excluding previously resolved activity IDs** from subsequent resolutions
3. **Validating distinct count** before showing priority pills
4. **Collapsing to brief-only** if fewer than 2 distinct activities are found

**Code location**: `app/activities/select/page.tsx` lines 1024-1048

```typescript
// Resolve each priority, excluding previously resolved activities
for (const priority of data.priorities) {
  const resolved = resolveActivityByPriority(
    priorityId,
    availableActivities,
    pace,
    excludeIds,  // ← Exclusion logic here
    resolutionContext
  );
  if (resolved) {
    resolvedMap.set(priorityId, resolved);
    excludeIds.push(resolved.activityId);  // ← Add to exclusion list
  }
}

// Validation: Check for duplicates
const resolvedActivityIds = Array.from(resolvedMap.values()).map(r => r.activityId);
const distinctActivityIds = new Set(resolvedActivityIds);
const distinctCount = distinctActivityIds.size;

// Collapse to brief-only if fewer than 2 distinct activities
if (hasDuplicates || distinctCount < 2) {
  setActivityPriorityGuidance({
    brief: data.brief,
    priorities: [],  // ← Hide pills if duplicates
  });
}
```

## Missing in Flights System

1. **No pre-resolution**: Flights only resolve when user clicks a pill
2. **No exclusion logic**: Each priority resolves independently
3. **No duplicate detection**: No validation that resolved selections are distinct
4. **No fallback**: System shows pills even if they all resolve to the same flights

## Code Locations

### Flight Resolution Function
**File**: `components/FlightOptionsResultsScreen.tsx`  
**Function**: `resolveSelectionByPriority` (lines 366-599)  
**Called**: Line 1393 when user selects a priority

```typescript
useEffect(() => {
  if (!selectedFlightPriority || gatewayOptions.length === 0) {
    setAgentResolvedSelection(null);
    return;
  }

  const resolved = resolveSelectionByPriority(selectedFlightPriority, gatewayOptions);
  setAgentResolvedSelection(resolved);
  // ...
}, [selectedFlightPriority, gatewayOptions]);
```

### Priority Pills Display
**File**: `components/FlightOptionsResultsScreen.tsx`  
**Lines**: 1710-1735

```typescript
{flightPriorityGuidance.priorities.map((priority) => {
  const isSelected = selectedFlightPriority === priority.id;
  return (
    <button
      onClick={() =>
        setSelectedFlightPriority(
          selectedFlightPriority === priority.id ? null : priority.id
        )
      }
      // ... renders pill
    />
  );
})}
```

## Recommended Fix Strategy

1. **Pre-resolve all priorities** when `flightPriorityGuidance` loads
2. **Exclude previously resolved gateway+flight combinations** from subsequent resolutions
3. **Validate distinct count** before showing priority pills
4. **Collapse to brief-only** if fewer than 2 distinct resolutions

### Implementation Pattern

Similar to activities, create a Map of resolved selections:

```typescript
const resolvedFlightsByPriority = new Map<string, {
  gatewayId: string;
  outboundFlightId: string;
  inboundFlightId: string;
  priorityUsed: string;
}>();

// Pre-resolve all priorities
for (const priority of flightPriorityGuidance.priorities) {
  const resolved = resolveSelectionByPriority(
    priority.id,
    gatewayOptions,
    excludeCombinations  // ← New parameter
  );
  if (resolved) {
    resolvedFlightsByPriority.set(priority.id, resolved);
    excludeCombinations.push({
      gatewayId: resolved.gatewayId,
      outboundFlightId: resolved.outboundFlightId,
      inboundFlightId: resolved.inboundFlightId,
    });
  }
}

// Validate distinct count
const distinctCombinations = new Set(
  Array.from(resolvedFlightsByPriority.values()).map(r => 
    `${r.gatewayId}-${r.outboundFlightId}-${r.inboundFlightId}`
  )
);

// Collapse to brief-only if duplicates
if (distinctCombinations.size < 2) {
  setFlightPriorityGuidance({
    brief: data.brief,
    priorities: [],  // Hide pills
  });
}
```

## Additional Considerations

- **Fallback behavior**: If exclusion prevents finding valid alternatives, return `null` for that priority (similar to activities)
- **Display logic**: Show resolved flights for each pill on hover/click, even if user hasn't selected that priority yet
- **User experience**: Ensure distinct recommendations provide meaningful choice differentiation
