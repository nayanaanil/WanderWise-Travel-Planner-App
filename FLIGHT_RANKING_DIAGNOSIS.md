# Flight Ranking Diagnosis: 28h 50m Recommended vs 10h 15m

## Problem Statement

A 28h 50m flight is marked as Recommended when a 10h 15m flight exists with:
- Same price
- Same airline  
- Same stops
- Same departure time

## Code Flow Analysis

### 1. Duration Calculation: `getFlightDurationMinutes()`

**Location**: `/lib/phase1/scoring.ts` lines 31-48

**Logic**:
```typescript
function getFlightDurationMinutes(flight: FlightOption): number {
  // Try to calculate from legs array first (most accurate)
  if (flight.legs && flight.legs.length > 0) {
    let totalMinutes = 0;
    for (const leg of flight.legs) {
      if ('durationMinutes' in leg) {
        // This is a FlightLeg
        totalMinutes += leg.durationMinutes;
      }
    }
    if (totalMinutes > 0) {
      return totalMinutes;
    }
  }
  
  // Fallback to parsing duration string
  return parseDurationToMinutes(flight.duration);
}
```

**Critical Issue #1: Layover Time Exclusion**

- When `flight.legs` exists, the function ONLY sums `durationMinutes` from `FlightLeg` objects
- It checks `'durationMinutes' in leg` which only matches `FlightLeg` type
- `FlightLayover` objects have `layoverMinutes` property, NOT `durationMinutes`
- **Result**: Layover time is EXCLUDED when calculating from legs array

**Critical Issue #2: Inconsistent Duration Sources**

- Flight A (28h 50m): Might have `legs` array → calculates from legs (EXCLUDES layovers) → gets shorter duration
- Flight B (10h 15m): Might NOT have `legs` array → falls back to `duration` string → gets actual total duration
- **OR vice versa**: If Flight A uses duration string (includes layovers) and Flight B uses legs (excludes layovers)

**Example Scenario**:
- Flight with 2 legs: 8h + 2h = 10h flight time
- Plus 18h 50m layover = 28h 50m total
- If using legs: returns 10h (600 minutes) - WRONG
- If using duration string: returns 28h 50m (1730 minutes) - CORRECT

### 2. Fastest Flight Identification

**Location**: `/lib/phase1/scoring.ts` lines 254-258

```typescript
const fastest = flightsToRank.reduce((min, f) => {
  const fDuration = getFlightDurationMinutes(f);
  const minDuration = min ? getFlightDurationMinutes(min) : Number.MAX_SAFE_INTEGER;
  return !min || fDuration < minDuration ? f : min;
}, null as FlightOption | null);
```

**Potential Issue**:
- If Flight A (28h 50m) uses legs array and calculates to 10h, it might be incorrectly identified as fastest
- If Flight B (10h 15m) uses duration string and calculates to 10h 15m, it would be slower
- **Result**: Wrong flight tagged as "fastest"

### 3. Duration Normalization

**Location**: `/lib/phase1/scoring.ts` lines 244-246, 268-271

```typescript
const minDuration = Math.min(...durations);
const maxDuration = Math.max(...durations);
const durationRange = maxDuration - minDuration;

// Later in scoring:
const normalizedDuration = durationRange > 0 
  ? (flightDuration - minDuration) / durationRange 
  : 0;
```

**Critical Issue #3: Zero Duration Range**

If both flights calculate to similar durations (due to layover exclusion):
- `durationRange` could be 0 or very small
- `normalizedDuration` becomes 0 for all flights
- **Result**: Duration has NO impact on weighted score (0.3 weight becomes 0)

**Example**:
- Flight A: 600 minutes (from legs, excludes layover)
- Flight B: 615 minutes (from legs, excludes layover)  
- Range = 15 minutes
- Normalized: A = 0, B = 1
- But if both use legs and have same flight time, range = 0 → normalized = 0 for both

### 4. Weighted Scoring

**Location**: `/lib/phase1/scoring.ts` lines 277-285

```typescript
const w_price = 0.5;
const w_duration = 0.3;
const w_stops = 0.2;

const score = 
  w_price * normalizedPrice +
  w_duration * normalizedDuration +
  w_stops * normalizedStops;
```

**When Duration Normalization Fails**:
- If `normalizedDuration = 0` for all flights (due to zero range or same values)
- Score becomes: `0.5 * normalizedPrice + 0 * 0 + 0.2 * normalizedStops`
- Duration weight (0.3) is effectively eliminated
- **Result**: Ranking depends only on price and stops

### 5. Final Sorting Logic

**Location**: `/lib/phase1/scoring.ts` lines 375-411 (`sortFlightsWithTagsUsingScores`)

```typescript
// Sort: fastest first, then cheapest (if not fastest), then by score
flightsWithScoresAndTags.sort((a, b) => {
  // Fastest flights first
  if (a.isFastest && !b.isFastest) return -1;
  if (!a.isFastest && b.isFastest) return 1;
  
  // Cheapest flights next (but only if not fastest)
  if (!a.isFastest && !b.isFastest) {
    if (a.isCheapest && !b.isCheapest) return -1;
    if (!a.isCheapest && b.isCheapest) return 1;
  }
  
  // Then by score (lower is better)
  return a.score - b.score;
});
```

**Critical Issue #4: Fastest Tag Priority**

- If the 28h 50m flight is incorrectly tagged as "fastest" (due to wrong duration calculation)
- It will be placed FIRST regardless of score
- The 10h 15m flight, even if it has a better score, will be placed AFTER

**Critical Issue #5: Score Tie-Breaking**

- If both flights have same price and stops
- And duration normalization is 0 (zero range)
- Scores will be identical: `0.5 * 0 + 0 * 0 + 0.2 * 0 = 0`
- Sort order becomes undefined/arbitrary (depends on array order)

### 6. Recommended Flight Selection

**Location**: `/lib/phase1/scoring.ts` lines 418-428 (`markRecommendedFlight`)

```typescript
return flights.map((flight, index) => ({
  ...flight,
  recommended: index === 0,  // First flight in sorted array
  ...
}));
```

**Result**: Whatever flight ends up at index 0 after sorting becomes "Recommended"

## Root Cause Analysis

### Primary Root Cause: Layover Time Exclusion in Duration Calculation

**Problem**: `getFlightDurationMinutes()` excludes layover time when using `legs` array

**Evidence**:
- Line 36: Only processes legs where `'durationMinutes' in leg`
- This matches `FlightLeg` type only
- `FlightLayover` objects are skipped entirely
- Line 47: Falls back to `duration` string which may include layovers

**Impact**:
1. Flights with `legs` array: Duration = sum of flight legs only (excludes layovers)
2. Flights without `legs` array: Duration = parsed from string (may include layovers)
3. Inconsistent duration calculations lead to wrong "fastest" identification
4. Zero duration range when all flights use legs array with similar flight times
5. Duration weight eliminated from scoring
6. Wrong flight ends up at index 0

### Secondary Issue: Zero Duration Range

**Problem**: When all flights have similar calculated durations (due to layover exclusion), normalization fails

**Evidence**:
- Line 246: `durationRange = maxDuration - minDuration`
- Line 270: If `durationRange === 0`, `normalizedDuration = 0`
- Line 284: Duration contributes 0 to weighted score

**Impact**:
- Duration becomes irrelevant in ranking
- Ranking depends only on price and stops
- If price and stops are same, order is arbitrary

## Diagnostic Checklist

To confirm the root cause, check for each flight:

1. **Does flight have `legs` array?**
   - If yes → duration calculated from legs (excludes layovers)
   - If no → duration parsed from string (may include layovers)

2. **What is the raw duration minutes?**
   - From `getFlightDurationMinutes(flight)`
   - Check if it matches displayed duration (28h 50m vs 10h 15m)

3. **Is layover time included?**
   - Check if `flight.legs` contains `FlightLayover` objects
   - Verify if layover minutes are added to total

4. **What is normalizedDuration?**
   - Check if `durationRange > 0`
   - Verify normalized values for both flights

5. **What is the final weighted score?**
   - Calculate: `0.5 * normalizedPrice + 0.3 * normalizedDuration + 0.2 * normalizedStops`
   - Compare scores for both flights

6. **Is the 10h 15m flight tagged as fastest?**
   - Check if `fastest.id === 10h15mFlight.id`
   - Verify `getFlightDurationMinutes()` returns correct value

7. **Why does 28h 50m flight end up at index 0?**
   - Check if it's tagged as fastest (incorrectly)
   - Check if it has lowest score
   - Check array order before sorting

## Expected Findings

Based on the code analysis, the most likely scenario:

1. **28h 50m flight**:
   - Has `legs` array
   - Duration calculated from legs only: ~10h (excludes 18h 50m layover)
   - Gets tagged as "fastest" (incorrectly)
   - Placed first in sorted array

2. **10h 15m flight**:
   - Either has `legs` array with same flight time, OR uses duration string
   - If using legs: Also calculates to ~10h
   - Duration range becomes 0 or very small
   - Normalized duration = 0
   - Score depends only on price/stops (same as 28h flight)
   - Placed after "fastest" flight

## Code Locations to Inspect

1. **Duration calculation**: `/lib/phase1/scoring.ts:31-48` (`getFlightDurationMinutes`)
2. **Fastest identification**: `/lib/phase1/scoring.ts:254-258`
3. **Normalization**: `/lib/phase1/scoring.ts:244-246, 268-271`
4. **Scoring**: `/lib/phase1/scoring.ts:277-285`
5. **Sorting**: `/lib/phase1/scoring.ts:375-411` (`sortFlightsWithTagsUsingScores`)
6. **Recommended marking**: `/lib/phase1/scoring.ts:418-428` (`markRecommendedFlight`)

## Verified Root Cause

**Confirmed**: The root cause is **layover time exclusion** in `getFlightDurationMinutes()` when using the `legs` array.

### Evidence from Code

**File**: `/lib/transformDuffelFlights.ts` lines 90-155 (`buildLegsArray`)

The `legs` array contains BOTH:
- `FlightLeg` objects with `durationMinutes` property (flight segments)
- `FlightLayover` objects with `layoverMinutes` property (layover time)

**File**: `/lib/phase1/scoring.ts` lines 31-48 (`getFlightDurationMinutes`)

```typescript
for (const leg of flight.legs) {
  if ('durationMinutes' in leg) {  // Only matches FlightLeg, NOT FlightLayover
    totalMinutes += leg.durationMinutes;  // Only sums flight time
  }
  // FlightLayover objects are SKIPPED entirely
}
```

**File**: `/lib/transformDuffelFlights.ts` line 243

The `duration` string comes from `offer.total_duration` which **INCLUDES layover time**.

### The Problem

1. **Flight with legs array**:
   - `getFlightDurationMinutes()` sums only `durationMinutes` from FlightLeg objects
   - Layover time (`layoverMinutes` from FlightLayover objects) is EXCLUDED
   - Example: 10h flight time + 18h 50m layover = 10h calculated duration (WRONG)

2. **Flight without legs array** (or legs sum to 0):
   - Falls back to parsing `duration` string
   - Duration string includes layover time
   - Example: 10h flight time + 18h 50m layover = 28h 50m parsed duration (CORRECT)

3. **Result**:
   - Flight A (28h 50m total): If using legs → calculates to 10h → tagged as "fastest" (WRONG)
   - Flight B (10h 15m total): If using duration string → calculates to 10h 15m → slower than Flight A
   - Flight A ends up at index 0 → marked as Recommended

## Conclusion

The root cause is **layover time exclusion** in `getFlightDurationMinutes()` when using the `legs` array. This causes:
1. Inconsistent duration calculations between flights (legs exclude layovers, duration string includes them)
2. Wrong "fastest" flight identification (shorter calculated duration wins)
3. Zero duration range in normalization (when all flights use legs with similar flight times)
4. Duration weight elimination from scoring (normalized duration = 0)
5. Incorrect flight at index 0 (Recommended)

### Fix Required

`getFlightDurationMinutes()` must include layover time when calculating from legs array:
- Sum `durationMinutes` from FlightLeg objects
- **ALSO** sum `layoverMinutes` from FlightLayover objects
- OR use the `duration` string (which includes layovers) as the source of truth

