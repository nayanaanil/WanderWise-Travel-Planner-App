# Activity Move Issues: Investigation Report

## Issue 1: Activity Not Moving to Different Date

### Problem
When user accepts a suggestion to move an activity to a different day (e.g., from Nov 15 to Nov 16), the activity stays on the original date (Nov 15) and replaces the existing activity instead of moving to the suggested date (Nov 16).

### Root Cause

**File**: `app/activities/select/page.tsx`  
**Lines**: 690-712

When handling `SCHEDULE_ACTIVITY` action, the code correctly extracts `timeSlot` from the payload but **ignores the `date` field** and always uses the original `day` from component state.

**Current Code (INCORRECT)**:
```typescript
if (actionType === 'SCHEDULE_ACTIVITY' && payload?.timeSlot) {
  finalSlot = payload.timeSlot;
  finalActivityId = payload.activityId || selectedActivity.id;
  // ❌ Missing: payload.date is not extracted!
}

// Build URL params
const params = new URLSearchParams({
  scheduledActivity: finalActivityId,
  scheduledDate: day,  // ❌ Always uses original day, ignores payload.date
  scheduledSlot: finalSlot,
  scheduledName: selectedActivity.name,
  slot: finalSlot,
});
```

**Decision Engine Output (CORRECT)**:
```typescript
// lib/decisions/activityDecisionEngine.ts, line 319-326
{
  type: 'SCHEDULE_ACTIVITY',
  payload: {
    activityId: activity.id,
    date: nearestDayWithSlot.date,  // ✅ Date is provided (e.g., "2024-11-16")
    timeSlot: nearestDayWithSlot.slot,  // ✅ Slot is provided
  },
}
```

### Impact

When the decision engine suggests moving to a different date:
- **Expected**: Activity moves to the suggested date (e.g., Nov 16)
- **Actual**: Activity is scheduled on the original date (e.g., Nov 15) at the suggested slot, replacing any existing activity there

### Example Flow

1. User tries to add "Zoo" to Nov 15 evening slot
2. System detects slot mismatch (Zoo is morning-only)
3. Decision engine suggests: "Move to Nov 16 morning" (date: "2024-11-16", slot: "day")
4. User clicks "Move to Nov 16"
5. **Bug**: Code ignores `payload.date` ("2024-11-16") and uses `day` ("2024-11-15")
6. **Result**: "Zoo" is added to Nov 15 morning slot, replacing "Alstadt Walk"

---

## Issue 2: Missing "Keep My Choice" Option

### Problem
When the system suggests moving an activity to a different day/slot, there is no "Keep my choice" or "Add anyway" option. Users are forced to accept the move suggestion or cancel entirely.

### Root Cause

**File**: `lib/decisions/activityDecisionEngine.ts`

When `status === 'MOVE'`, the decision engine returns **only ONE option** (the move suggestion). There's no option to proceed with the original selection.

**Current Code (MISSING OPTIONS)**:

**Case A1**: Correct slot available on same day (lines 282-301)
```typescript
return {
  domain: 'activity',
  status: 'MOVE',
  facts: [...],
  recommendation: `Move activity to ${correctSlot} slot`,
  options: [{
    id: 'move-to-correct-slot',
    label: 'Move activity to another slot on same day',
    // ❌ Only ONE option - no "Add anyway" option
  }],
};
```

**Case A2**: Correct slot available on another day (lines 305-328)
```typescript
return {
  domain: 'activity',
  status: 'MOVE',
  facts: [...],
  recommendation: `Move to ${formatDate(nearestDayWithSlot.date)}`,
  options: [{
    id: 'move-to-other-day',
    label: `Move to ${formatDate(nearestDayWithSlot.date)}`,
    // ❌ Only ONE option - no "Add anyway" option
  }],
};
```

**Case B1**: High-energy day available on another date (lines 394-417)
```typescript
return {
  domain: 'activity',
  status: 'MOVE',
  facts: [reason],
  recommendation: `Move to ${formatDate(lighterDay.date)}`,
  options: [{
    id: 'move-to-lighter-day',
    label: `Move to ${formatDate(lighterDay.date)}`,
    // ❌ Only ONE option - no "Add anyway" option
  }],
};
```

**Case C1**: Combined conflict - another day satisfies both (lines 483-507)
```typescript
return {
  domain: 'activity',
  status: 'MOVE',
  facts: [...],
  recommendation: `Move to ${formatDate(perfectDay.date)}`,
  options: [{
    id: 'move-to-perfect-day',
    label: `Move to ${formatDate(perfectDay.date)}`,
    // ❌ Only ONE option - no "Add anyway" option
  }],
};
```

### Comparison with Other Statuses

**BLOCKED status** (lines 331-387) - ✅ HAS "Add anyway" option:
```typescript
options.push({
  id: 'add-anyway',
  label: 'Add anyway',
  description: 'Schedule this activity despite slot mismatch',
  // ✅ Option to proceed with original selection
});
```

**WARNING status** (lines 452-466) - ✅ HAS "Add anyway" option:
```typescript
options.push({
  id: 'add-anyway-energy',
  label: 'Add anyway',
  description: 'Schedule this activity despite energy conflict',
  // ✅ Option to proceed with original selection
});
```

### Expected Behavior

All `MOVE` status decisions should include an "Add anyway" option that allows users to proceed with their original selection, similar to `BLOCKED` and `WARNING` statuses.

---

## Code Locations

### Issue 1: Missing Date Extraction
**File**: `app/activities/select/page.tsx`  
**Function**: `handleOptionSelect`  
**Lines**: 690-712  
**Fix**: Extract `payload.date` and use it instead of `day` when `actionType === 'SCHEDULE_ACTIVITY'`

### Issue 2: Missing "Add anyway" Options
**File**: `lib/decisions/activityDecisionEngine.ts`  
**Lines**: 
- 282-301 (Case A1: Same day slot move)
- 305-328 (Case A2: Other day slot move)
- 394-417 (Case B1: Lighter day move)
- 483-507 (Case C1: Perfect day move)

**Fix**: Add "Add anyway" option to each `MOVE` status return, similar to `BLOCKED` and `WARNING` statuses.

---

## Recommended Fixes

### Fix 1: Extract Date from Payload
```typescript
if (actionType === 'SCHEDULE_ACTIVITY' && payload?.timeSlot) {
  finalSlot = payload.timeSlot;
  finalActivityId = payload.activityId || selectedActivity.id;
  // ✅ ADD THIS: Extract date from payload, fallback to original day
  finalDate = payload.date || day;
}

// Then use finalDate instead of day:
const params = new URLSearchParams({
  scheduledActivity: finalActivityId,
  scheduledDate: finalDate,  // ✅ Use extracted date
  scheduledSlot: finalSlot,
  scheduledName: selectedActivity.name,
  slot: finalSlot,
});
```

### Fix 2: Add "Add anyway" to All MOVE Statuses
For each `MOVE` status case, add an "Add anyway" option after the move suggestion:
```typescript
options.push({
  id: 'add-anyway',
  label: 'Add anyway',
  description: 'Schedule this activity despite the suggestion',
  tradeoffs: [...],  // Include relevant tradeoffs
  action: {
    type: 'SCHEDULE_ACTIVITY',
    payload: {
      activityId: activity.id,
      date: day.date,  // Original date
      timeSlot: requestedSlot,  // Original slot
    },
  },
});
```

---

---

## Issue 3: System Suggests Days in Different Cities

### Problem
When suggesting to move an activity to a different day, the system suggests days in different cities instead of limiting suggestions to the same city. For example, when adding a morning activity to the evening slot of Nov 16 in Nuremberg (where Nov 15 and 16 are in Nuremberg), the system suggests moving to Nov 17, which is a different destination.

### Root Cause

**File**: `lib/decisions/activityDecisionEngine.ts`  
**Function**: `findNearestDayWithSlot`  
**Lines**: 155-179

The function sorts days by proximity to the current date, **preferring future days over past days**, without validating that the suggested day is in the same city.

**Current Sorting Logic (PROBLEMATIC)**:
```typescript
const sortedDays = [...otherDaysInCity].sort((a, b) => {
  const dateA = new Date(a.date).getTime();
  const dateB = new Date(b.date).getTime();
  const currentTime = current.getTime();
  // Prefer future days, then nearest past days
  if (dateA >= currentTime && dateB < currentTime) return -1;  // Future > Past
  if (dateA < currentTime && dateB >= currentTime) return 1;   // Past < Future
  return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
});
```

**Problem**: If `otherDaysInCity` incorrectly includes dates from other cities (due to date range calculation bugs or city matching issues), the function will prefer future days (e.g., Nov 17 in different city) over past days in the same city (e.g., Nov 15 in Nuremberg).

**Secondary Issue**: The code that builds `otherDaysInCity` (lines 399-469 in `app/activities/select/page.tsx`) relies on `structuralRoute.derived.arrivalDates[city]` and `structuralRoute.derived.departureDates[city]`. If:
- City name matching is case-sensitive or has whitespace issues
- Date range calculation has off-by-one errors
- Departure date is inclusive when it should be exclusive

Then `otherDaysInCity` might include dates from adjacent cities or miss dates in the current city.

### Impact

**Example Scenario**:
- Nuremberg: Nov 15-16 (2 days, 4 slots)
- Nov 16 morning: Full
- User tries to add morning activity to Nov 16 evening
- System should suggest: Nov 15 morning (same city, past day)
- **Actual**: System suggests Nov 17 (different city, future day)

**Why This Happens**:
1. `otherDaysInCity` might include Nov 17 if date range calculation is wrong
2. OR sorting logic prefers Nov 17 (future) over Nov 15 (past), even if both are in the array
3. OR `otherDaysInCity` doesn't include Nov 15 because it's filtered out incorrectly

### Code Locations

**File**: `lib/decisions/activityDecisionEngine.ts`  
**Functions with same issue**:
- `findNearestDayWithSlot` (lines 155-179) - Used for slot mismatch suggestions
- `findLighterDay` (lines 184-211) - Used for energy conflict suggestions  
- `findDayWithSlotAndEnergy` (lines 216-244) - Used for combined conflict suggestions

All three functions use the same problematic sorting logic that prefers future days over past days.

**File**: `app/activities/select/page.tsx`  
**Function**: `handleActivitySelect`  
**Lines**: 399-469 (building `otherDaysInCity`)

### Recommended Fix

**Primary Fix: Modify Sorting Logic to Prefer Closer Dates (Not Future-Only)**

The sorting logic should prefer **closer dates** (past or future) within the same city, not just future days. This ensures Nov 15 (1 day in past) is preferred over Nov 17 (1 day in future) when both are in the same city.

**Note**: This fix must be applied to **all three day-finding functions**:
- `findNearestDayWithSlot` (lines 155-179) - Used for slot mismatch suggestions
- `findLighterDay` (lines 184-211) - Used for energy conflict suggestions  
- `findDayWithSlotAndEnergy` (lines 216-244) - Used for combined conflict suggestions

**Implementation**:
```typescript
function findNearestDayWithSlot(
  currentDate: string,
  targetSlot: TimeSlot,
  otherDaysInCity: Array<{ date: string; activities: Array<{ timeSlot: TimeSlot }> }>,
  allCityActivities?: Array<{ date: string; day?: { id: string; name: string }; night?: { id: string; name: string } }>
): { date: string; slot: TimeSlot } | null {
  const current = new Date(currentDate);
  // ✅ MODIFY: Sort by absolute distance (closer dates first), not future preference
  const sortedDays = [...otherDaysInCity].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const currentTime = current.getTime();
    // Prefer closer dates (past or future) - absolute distance
    return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
  });
  
  for (const otherDay of sortedDays) {
    if (isSlotAvailable(otherDay.date, targetSlot, otherDay.activities, allCityActivities)) {
      return { date: otherDay.date, slot: targetSlot };
    }
  }
  
  return null;
}
```

**Apply Same Fix to Other Functions**:

The same sorting fix must be applied to `findLighterDay` (line 189-195) and `findDayWithSlotAndEnergy` (line 223-229). Replace their sorting logic with:

```typescript
// ✅ MODIFY: Sort by absolute distance instead of future preference
const sortedDays = [...otherDaysInCity].sort((a, b) => {
  const dateA = new Date(a.date).getTime();
  const dateB = new Date(b.date).getTime();
  const currentTime = current.getTime();
  return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
});
```

**Secondary Fix: Ensure Date Range is Correct**

In `app/activities/select/page.tsx`, ensure the date range loop is correct and city name matching is robust:

```typescript
// ✅ ADD: Normalize city name for matching (case-insensitive, trimmed)
const normalizedCity = city.toLowerCase().trim();
const cityArrivalDate = structuralRoute.derived.arrivalDates[normalizedCity];
const cityDepartureDate = structuralRoute.derived.departureDates[normalizedCity];

if (cityArrivalDate && cityDepartureDate) {
  const arrival = new Date(cityArrivalDate);
  const departure = new Date(cityDepartureDate);
  
  // ✅ MODIFY: Use < instead of <= to exclude departure date (departure day is first day of next city)
  // OR if departure date is inclusive, ensure we don't include dates beyond the city's stay
  for (let d = new Date(arrival); d <= departure; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // ✅ ADD: Double-check that this date is actually in the same city
    // Verify by checking if date falls within city's arrival-departure range
    const dateTime = d.getTime();
    const arrivalTime = arrival.getTime();
    const departureTime = departure.getTime();
    
    // Skip if date is outside city's range (safety check)
    if (dateTime < arrivalTime || dateTime > departureTime) {
      continue;
    }
    
    // Skip the current day (we're evaluating for this day)
    if (dateStr === day) {
      continue;
    }
    
    // ... rest of loop
  }
}
```

**Why This Fixes the Issue**:

1. **Sorting Fix**: By sorting by absolute distance instead of preferring future days, Nov 15 (1 day away) will be checked before Nov 17 (1 day away), ensuring same-city past days are considered first.

2. **Date Range Validation**: Adding explicit validation ensures we never include dates outside the city's actual stay period, even if there are bugs in the date range calculation.

3. **City Name Normalization**: Case-insensitive, trimmed matching ensures we correctly identify the city's date range even if there are minor name variations.

---

## Testing Checklist

After fixes:
1. ✅ Move to different day: Activity should move to suggested date, not original date
2. ✅ Move to same day different slot: Activity should move to suggested slot on same day
3. ✅ "Add anyway" appears in all MOVE suggestions
4. ✅ "Add anyway" schedules activity on original date/slot
5. ✅ Move suggestions only include days in the same city (not adjacent cities)
6. ✅ Past days in same city are preferred over future days in different cities
7. ✅ No regressions in BLOCKED/WARNING status handling
