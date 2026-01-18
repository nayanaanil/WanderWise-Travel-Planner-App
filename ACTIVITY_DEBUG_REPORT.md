# Activity Generation Debug Report

## Problem
Only 3 static activities appear for every city, regardless of destination.

## Investigation Results

### 1. Activity Source Verification

**Location**: `app/plan/logistics/page.tsx` and `app/activities/select/page.tsx`

**Findings**:
- Activities are loaded from `tripState.generatedActivitiesByCity[city]` (line 236 in select page, line 728 in logistics)
- Fallback fetch is triggered if cache is empty (line 207 in select page)
- No UI-level filtering that would reduce to 3 activities
- `rankActivities()` does NOT truncate - it only sorts and labels (lib/activities/rankActivities.ts)

**Status**: ✅ Activities source is correct, no UI truncation found

---

### 2. API Execution Check

**Location**: `app/api/agent/generate-activities/route.ts`

**Critical Finding #1 - Line 495**:
```typescript
// Enforce minimum quality floor: at least 5 activities
if (validated.length < 5) {
  console.warn(`[GenerateActivities] Only ${validated.length} valid activities for ${city}, falling back`);
  return null; // Trigger fallback
}
```

**Critical Finding #2 - Line 823**:
```typescript
if (aiActivities && aiActivities.length >= 3) {
  activities = aiActivities;
} else {
  // Fallback to hardcoded activities
  activities = getFallbackActivities(body.city, body.pace);
}
```

**Critical Finding #3 - Line 321**:
```typescript
return validated.length >= 3 ? validated : genericActivities.slice(0, 3).map(act => ({
```

**Analysis**:
- If AI generates < 5 valid activities → returns `null` → triggers fallback
- Fallback function `getFallbackActivities()` returns exactly **3 activities** (line 321)
- Fallback result gets **cached** (line 834), so subsequent requests return cached 3 activities

**Status**: ⚠️ **ROOT CAUSE IDENTIFIED** - Fallback returns 3 activities and gets cached

---

### 3. Caching Logic Check

**Location**: `app/api/agent/generate-activities/route.ts` lines 810-834

**Cache Key**: SHA256(city + pace + userContext)

**Findings**:
- Cache is checked BEFORE AI call (line 813)
- If cache hit → returns cached activities immediately (line 815)
- If cache miss → AI call → fallback if needed → cache result (line 834)
- **Problem**: If a fallback (3 activities) was cached previously, it will be reused forever

**Status**: ⚠️ **CACHING ISSUE** - Cached fallback responses persist

---

### 4. Activity Truncation Check

**Searched for**:
- `.slice(0, 3)` or similar truncation
- Pace-based capping
- Relevance filtering

**Findings**:
- ❌ No `.slice()` calls that limit to 3 in activity generation
- ❌ No pace-based activity count capping (MAX_COUNT is used for generation, not filtering)
- ❌ No relevance-based filtering that would reduce to 3
- ✅ `rankActivities.ts` does NOT truncate - only sorts and labels

**Status**: ✅ No truncation logic found in ranking or filtering

---

### 5. UI Filtering Check

**Location**: `app/activities/select/page.tsx`

**Findings**:
- `availableActivities` filters by `assignedActivityIds` only (line 170)
- `rankedActivities` uses full `availableActivities` list (line 174)
- No filtering by slot, label, or timing tier
- Render loop iterates over full `rankedActivities` list

**Status**: ✅ No UI filtering that would reduce to 3

---

## Root Cause Analysis

### Primary Issue: Fallback Function Returns Exactly 3 Activities

**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 321

```typescript
return validated.length >= 3 ? validated : genericActivities.slice(0, 3).map(act => ({
```

The `getFallbackActivities()` function:
1. Has only 3 activities in `genericActivities` array (lines 261-309)
2. Validates up to 5 (line 314) but only has 3 to validate
3. Returns exactly 3 activities (line 321)

### Secondary Issue: AI Validation Too Strict

**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 495

```typescript
if (validated.length < 5) {
  return null; // Trigger fallback
}
```

If AI generates 4 or fewer valid activities, it triggers fallback → 3 activities.

### Tertiary Issue: Cached Fallback Responses

**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 834

```typescript
activitiesCache.set(cacheKey, activities);
```

Once a fallback (3 activities) is cached, it persists and is reused for that cache key.

---

## Exact Location of Issue

**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 321

```typescript
return validated.length >= 3 ? validated : genericActivities.slice(0, 3).map(act => ({
```

**Why it happens**:
1. AI call fails OR returns < 5 valid activities
2. Falls back to `getFallbackActivities()`
3. Fallback has only 3 activities in `genericActivities` array
4. Returns exactly 3 activities
5. Result gets cached (line 834)
6. Subsequent requests for same city/pace/userContext return cached 3 activities

---

## Proposed Minimal Safe Fix

### Option 1: Expand Fallback Activities (Recommended)
**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 261

Add more activities to `genericActivities` array to have 5-8 fallback options instead of 3.

### Option 2: Relax AI Validation Threshold
**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 495

Change from `< 5` to `< 3` to allow 3-4 activities from AI without triggering fallback.

### Option 3: Clear Cache on Fallback
**File**: `app/api/agent/generate-activities/route.ts`
**Line**: 827

Don't cache fallback responses, or add a flag to indicate fallback so cache can be invalidated.

---

## Diagnostic Logging Needed

Add these logs to verify:

1. **In POST handler** (line 779):
   ```typescript
   console.log('[GenerateActivities] Request:', { city: body.city, pace: body.pace, userContext: body.userContext });
   ```

2. **Before cache check** (line 812):
   ```typescript
   console.log('[GenerateActivities] Cache key:', cacheKey, 'Has cache:', activitiesCache.has(cacheKey));
   ```

3. **After AI call** (line 821):
   ```typescript
   console.log('[GenerateActivities] AI returned:', aiActivities?.length || 0, 'activities');
   ```

4. **Before caching** (line 833):
   ```typescript
   console.log('[GenerateActivities] Final activities count:', activities.length, 'Is fallback:', activities.length === 3);
   ```

---

## Summary

**Root Cause**: Fallback function returns exactly 3 activities, which get cached and reused.

**Exact Location**: `app/api/agent/generate-activities/route.ts:321`

**Why**: `genericActivities` array has only 3 items, and fallback result gets cached.

**Fix**: Expand fallback activities array OR don't cache fallback responses OR relax AI validation threshold.
