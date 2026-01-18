# Flight Decision Support Agent Loop - Verification

## Required Behavior (Enforced)

### 1. System Computes Options ✅
- **Location**: `/app/api/phase1/gateway-flights/route.ts`
- Gateway options and flights are computed deterministically
- Options stored in `tripState.gatewayOptions`

### 2. Meaningful-Difference Gate Runs ✅
- **Location**: `components/FlightOptionsResultsScreen.tsx` lines 1020-1033
- **Function**: `computeMeaningfulDifferences(tripState.gatewayOptions)`
- Checks three dimensions: `price`, `arrival`, `layover`
- Returns: `{ price: boolean, arrival: boolean, layover: boolean }`

### 3. Gate Decision Logic ✅
- **Location**: `components/FlightOptionsResultsScreen.tsx` lines 1029-1033

**IF ≥2 differences:**
- AI call proceeds
- AI receives `differentiators` with 2-3 `true` values
- AI returns brief + priorities (2-3 priority options)
- UI shows: Brief + Priority pills

**IF <2 differences (but ≥1):**
- AI call proceeds
- AI receives `differentiators` with exactly 1 `true` value
- AI returns brief + empty priorities array `[]`
- UI shows: Brief only (no pills)

**IF 0 differences:**
- AI call is skipped (early return)
- No guidance shown

### 4. AI Prompt Constraints ✅
- **Location**: `/app/api/agent/flight-priority-guidance/route.ts` lines 127-131

```
CRITICAL CONSTRAINT:
- You MUST ONLY include priorities for dimensions listed in the differentiators above.
- If only 2 dimensions differ, return exactly 2 priority options.
- If only 1 dimension differs, return an empty priorities array [].
- If 0 dimensions differ (should not happen), return an empty priorities array [].
```

### 5. API Validation ✅
- **Location**: `/app/api/agent/flight-priority-guidance/route.ts` lines 246-268

**Special handling for 1 dimension:**
- If `expectedCount === 1` and `priorities.length === 0` → Valid (brief only)
- If `expectedCount >= 2` → Must match exactly (brief + priorities)

### 6. UI Rendering ✅
- **Location**: `components/FlightOptionsResultsScreen.tsx` lines 1404-1438

**Conditional rendering:**
```typescript
{flightPriorityGuidance && (
  <section>
    <p>{flightPriorityGuidance.brief}</p>
    {/* Only render priorities if array is not empty */}
    {flightPriorityGuidance.priorities.length > 0 && (
      <div>
        {/* Priority pills */}
      </div>
    )}
  </section>
)}
```

**Behavior:**
- If `priorities.length > 0`: Shows brief + priority pills
- If `priorities.length === 0`: Shows brief only (no pills)

### 7. User Selection (if any) ✅
- **Location**: `components/FlightOptionsResultsScreen.tsx` line 802
- **State**: `selectedFlightPriority: 'price' | 'arrival' | 'layover' | null`
- User can select a priority when pills are shown
- Selection stored in local state (not yet used for ranking)

### 8. AI Explains Outcome ✅
- **Location**: Gateway explanations (lines 835-877), Flight explanations (lines 1109-1206)
- Gateway-level AI explanations fetched on page load
- Flight-level AI explanations fetched when gateway expanded
- Explanations use `preferenceLens` and `gatewayContext`

## Loop Flow Diagram

```
1. System computes options
   ↓
2. Meaningful-difference gate runs
   ↓
3. Count dimensions that differ
   ↓
   ├─ IF 0 differences → Skip AI call (no guidance)
   │
   ├─ IF 1 difference → Call AI
   │   ├─ AI returns: brief + empty priorities []
   │   └─ UI shows: brief only (no question)
   │
   └─ IF ≥2 differences → Call AI
       ├─ AI returns: brief + priorities (2-3 options)
       └─ UI shows: brief + priority pills
       ↓
4. User selection (optional)
   ↓
5. Deterministic selection (future step)
   ↓
6. AI explains outcome (gateway/flight explanations)
```

## Enforcement Points

### ✅ Gate Enforcement
- **Line 1029-1033**: Gate checks `dimensionsThatDiffer`
- **Line 1030**: Early return if `dimensionsThatDiffer === 0`
- **Line 1033**: Comment confirms "Continue with AI call for ≥1 differences"

### ✅ AI Prompt Enforcement
- **Line 130**: "If only 1 dimension differs, return an empty priorities array []"
- **Line 129**: "If only 2 dimensions differ, return exactly 2 priority options"

### ✅ API Validation Enforcement
- **Line 247-252**: Validates priorities count matches expected
- **Line 247-249**: Special case allows empty array when `expectedCount === 1`

### ✅ UI Rendering Enforcement
- **Line 1411**: Conditional: `{flightPriorityGuidance.priorities.length > 0 && (`
- **Line 1407**: Conditional margin: `${flightPriorityGuidance.priorities.length > 0 ? 'mb-3' : ''}`

## Confirmation

✅ **No agent questions when unnecessary**
- When 0 differences: No AI call, no guidance shown
- When 1 difference: AI called, returns empty priorities, UI shows brief only (no pills)
- When ≥2 differences: AI called, returns priorities, UI shows brief + pills

✅ **Loop is strictly enforced**
- Gate prevents unnecessary AI calls (0 differences)
- Gate allows AI calls with appropriate constraints (1 vs ≥2 differences)
- AI prompt enforces correct output format
- API validation enforces correct structure
- UI conditionally renders based on priorities array length

✅ **No highlighting or ranking changes**
- `selectedFlightPriority` is stored but not used for ranking
- No flight highlighting based on priority selection
- Gateway/flight ranking logic unchanged

