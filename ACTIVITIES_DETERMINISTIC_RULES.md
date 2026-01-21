# Activities AI: How Deterministic Rules Constrain AI Suggestions

## Overview

The Activities AI uses a **hybrid approach**: AI generates contextual guidance (brief + priority pills), but **deterministic rules** control which activities are actually recommended and how conflicts are resolved. These rules can override AI preferences to ensure practical constraints (timing, energy, availability) are respected.

## Architecture: AI Guidance + Deterministic Resolution

1. **AI Layer**: Generates brief explanation and priority pills based on meaningful differences
2. **Deterministic Layer**: Applies rule-based scoring with penalties/bonuses to select specific activities
3. **Conflict Detection**: Evaluates user actions against hard constraints and suggests alternatives

**Key Principle**: AI provides context and framing; deterministic rules make the final selection.

---

## Deterministic Rules Applied During Resolution

### Rule 1: Slot Compatibility Penalty

**Purpose**: Ensure recommended activities match the selected time slot (day vs. night)

**Mechanism**: Adds penalties/bonuses to priority-based scoring

**Penalties Applied**:
- **+50 penalty**: Activity only supports opposite slot (night-only activity in day slot, or vice versa)
- **-10 bonus**: Activity explicitly supports the selected slot
- **0 (neutral)**: Activity supports both slots or unclear

**How It Overrides AI**:
- If AI's priority (e.g., "crowdDensity") would select a low-crowd activity that's night-only, but user is selecting for a day slot, the +50 penalty can push the system to select a different activity that's day-compatible, even if it has slightly higher crowds.

**Example**:
```
Scenario: User selecting for "day" slot, priority is "crowdDensity"
Available activities:
- Activity A: Low crowds, night-only (bestTime: ['evening', 'night'])
- Activity B: Medium crowds, day-compatible (bestTime: ['morning', 'afternoon'])

Without slot penalty: Activity A wins (lowest crowd score = 0)
With slot penalty: 
  - Activity A: 0 (crowd) + 50 (slot mismatch) = 50 total
  - Activity B: 50 (crowd) + (-10) (slot bonus) = 40 total
  → Activity B wins despite higher crowds
```

### Rule 2: Energy Balancing Penalty

**Purpose**: Prevent energy overload on the same day (high-effort + high-effort, or long + long duration)

**Mechanism**: Adds penalties/bonuses based on existing activities in the OTHER slot

**Penalties Applied**:
- **+40 penalty**: High-effort activity when other slot already has high-effort activity
- **+30 penalty**: Long-duration activity when other slot already has long-duration activity
- **-15 bonus**: High-effort activity paired with low-effort activity (complementary)
- **-10 bonus**: Long-duration activity paired with short-duration activity (complementary)

**How It Overrides AI**:
- If AI's priority (e.g., "energyDemand" for packed pace) would select a high-effort activity, but the day already has a high-effort activity in the other slot, the +40 penalty can push the system to select a medium-effort activity instead.

**Example**:
```
Scenario: User selecting for "night" slot, priority is "energyDemand" (packed pace)
Existing activity in "day" slot: High-effort hiking (physicalEffort: 'high')
Available activities:
- Activity A: High-effort rock climbing (physicalEffort: 'high', matches pace perfectly)
- Activity B: Medium-effort evening walk (physicalEffort: 'medium', partial match)

Without energy penalty: Activity A wins (perfect match = 100 points)
With energy penalty:
  - Activity A: 100 (match) - 0 (slot) - 40 (energy penalty) = 60 total
  - Activity B: 50 (partial match) - 0 (slot) - (-15) (energy bonus) = 65 total
  → Activity B wins despite being a partial match
```

### Rule 3: Activity Exclusion (Pre-Resolution)

**Purpose**: Prevent recommending activities already assigned in the same city

**Mechanism**: Filters out assigned activities before computing meaningful differences or resolving priorities

**How It Overrides AI**:
- AI guidance is computed only on available activities
- If AI would naturally recommend an already-assigned activity, it never appears in the guidance

**Example**:
```
Scenario: User has already assigned "Sunset Beach Walk" to May 12 night slot
Available activities for May 13 day slot:
- Sunset Beach Walk (already assigned)
- Morning Market Tour
- Afternoon Museum Visit

Without exclusion: AI might recommend "Sunset Beach Walk" again
With exclusion: "Sunset Beach Walk" is filtered out before AI sees it
  → AI only considers Morning Market Tour and Afternoon Museum Visit
```

### Rule 4: Distinct Recommendations Guard

**Purpose**: Ensure each priority pill recommends a different activity

**Mechanism**: When resolving multiple priorities, passes previously selected activity IDs into subsequent resolution calls

**How It Overrides AI**:
- If multiple priorities would naturally select the same activity, the system excludes it from subsequent resolutions
- If fewer than 2 distinct activities are resolved, guidance collapses to brief-only (no pills)

**Example**:
```
Scenario: 3 priorities active (timingFit, crowdDensity, energyDemand)
Resolution process:
1. Resolve "timingFit" → Selects Activity A
2. Resolve "crowdDensity" → Would select Activity A again, but it's excluded
   → Selects Activity B instead
3. Resolve "energyDemand" → Would select Activity A again, but it's excluded
   → Selects Activity C instead

Result: 3 distinct recommendations (A, B, C)
If all 3 would select Activity A: Guidance collapses to brief-only
```

---

## Deterministic Rules Applied During Conflict Detection

### Rule 5: Slot Mismatch Detection

**Purpose**: Detect when user selects an activity incompatible with the chosen slot

**Mechanism**: Compares activity's `bestTime` with selected slot (day vs. night)

**How It Overrides User Action**:
- User action is intercepted and evaluated
- If mismatch detected, system suggests moving to correct slot or different day
- User can override with "Add anyway" option

**Example**:
```
User Action: Selects "Sunset Beach Walk" (night-only) for "day" slot
Deterministic Check: bestTime = ['evening', 'night'], slot = 'day' → MISMATCH

System Response:
- Status: MOVE
- Recommendation: "Move activity to night slot"
- Options: 
  1. Move to night slot on same day (if available)
  2. Move to night slot on another day (if same day full)
  3. Swap with existing activity
  4. Add anyway (user override)
```

### Rule 6: Energy Conflict Detection

**Purpose**: Detect when high-effort activity conflicts with existing high-energy activities

**Mechanism**: Checks if activity is high-effort (physicalEffort: 'high' OR durationSlots: 2) AND day already has high-effort or long-duration activity

**How It Overrides User Action**:
- User action is intercepted and evaluated
- If conflict detected, system suggests moving to lighter day or swapping activities
- User can override with "Add anyway" option

**Example**:
```
User Action: Selects "Full-Day Hiking" (high-effort, long duration) for day slot
Existing Activity: "Morning Rock Climbing" (high-effort) in night slot
Deterministic Check: 
  - isHighEnergyActivity = true (high effort)
  - energyLoad.hasHighEffort = true (existing high-effort activity)
  → ENERGY CONFLICT

System Response:
- Status: WARNING or MOVE
- Recommendation: "Move to May 14" (lighter day)
- Options:
  1. Move to lighter day (if available)
  2. Swap with lighter activity
  3. Add anyway (user override)
```

### Rule 7: Arrival Day Fatigue Check

**Purpose**: Detect high-effort activities scheduled on arrival day after long flight

**Mechanism**: Checks if `isArrivalDay = true` AND `flightDurationHours > 10` AND `isHighEnergyActivity = true`

**How It Overrides User Action**:
- Special case of energy conflict with additional context
- System suggests moving to a later day

**Example**:
```
User Action: Selects "Full-Day Hiking" for arrival day (May 12)
Context: Flight duration = 12 hours, arrival day = May 12
Deterministic Check:
  - isArrivalDay = true
  - flightDurationHours = 12 (> 10)
  - isHighEnergyActivity = true
  → ARRIVAL DAY FATIGUE

System Response:
- Status: MOVE
- Recommendation: "Move to May 13" (after rest day)
- Facts: "This is a physically demanding activity scheduled on your arrival day after a long flight."
```

### Rule 8: Combined Conflict Resolution

**Purpose**: Handle cases where both slot mismatch and energy conflict occur

**Mechanism**: First checks if another day satisfies both requirements, then falls back to local reshuffling

**How It Overrides User Action**:
- System evaluates multiple constraints simultaneously
- Suggests moving to a day that satisfies both slot and energy requirements
- If no perfect day exists, suggests swapping activities

**Example**:
```
User Action: Selects "Sunset Beach Walk" (night-only, high-effort) for day slot
Existing Activity: "Morning Hiking" (high-effort) in day slot
Deterministic Check:
  - Slot mismatch: night-only in day slot
  - Energy conflict: high-effort on high-effort day
  → COMBINED CONFLICT

System Response:
- Status: MOVE or SWAP
- First checks: Is there a day with available night slot AND no high-effort activities?
  - If yes: "Move to May 14 night"
  - If no: "Swap with lighter activity" or "Reorder activities"
```

---

## Concrete Examples: AI Suggestions Overridden

### Example 1: Slot Compatibility Override

**Context**: User selecting for "day" slot, AI priority is "crowdDensity"

**Available Activities**:
- **Activity A**: "Quiet Morning Market" (crowdLevel: 'low', bestTime: ['evening', 'night'])
- **Activity B**: "Busy Afternoon Museum" (crowdLevel: 'medium', bestTime: ['morning', 'afternoon'])

**AI Guidance**: "Consider crowd levels when choosing activities."

**Without Slot Penalty**:
- Activity A wins (lowest crowd score = 0)
- System recommends: "Quiet Morning Market"

**With Slot Penalty**:
- Activity A: 0 (crowd) + 50 (slot mismatch) = **50 total**
- Activity B: 50 (crowd) + (-10) (slot bonus) = **40 total**
- **System recommends: "Busy Afternoon Museum"** (despite higher crowds)

**Result**: Deterministic rule overrides AI's crowd preference to ensure slot compatibility.

---

### Example 2: Energy Balancing Override

**Context**: User selecting for "night" slot, priority is "energyDemand" (packed pace), day slot already has high-effort activity

**Existing Activity**: "Full-Day Hiking" (physicalEffort: 'high') in day slot

**Available Activities**:
- **Activity A**: "Evening Rock Climbing" (physicalEffort: 'high', durationSlots: 1, matches packed pace perfectly)
- **Activity B**: "Evening Yoga Class" (physicalEffort: 'medium', durationSlots: 1, partial match for pace)

**AI Guidance**: "Match your energy level to your pace."

**Without Energy Penalty**:
- Activity A: 100 (perfect match) + 10 (short duration) = **110 points**
- Activity B: 50 (partial match, 1 level away) + 10 (short duration) = **60 points**
- Activity A wins → System recommends: "Evening Rock Climbing"

**With Energy Penalty**:
- Activity A: 100 (perfect match) + 10 (short duration) - 40 (energy penalty for high+high) = **70 total**
- Activity B: 50 (partial match) + 10 (short duration) - (-15) (energy bonus for high+medium pairing) = **75 total**
- **System recommends: "Evening Yoga Class"** (despite being partial match for pace)

**Result**: Deterministic rule overrides AI's pace preference to prevent energy overload.

---

### Example 3: Exclusion Override

**Context**: User has already assigned "Sunset Beach Walk" to May 12 night slot

**Available Activities for May 13 day slot**:
- "Sunset Beach Walk" (already assigned to May 12)
- "Morning Market Tour"
- "Afternoon Museum Visit"

**AI Guidance**: Would naturally recommend "Sunset Beach Walk" if it's the best fit

**With Exclusion**:
- "Sunset Beach Walk" is filtered out before AI sees it
- AI only considers "Morning Market Tour" and "Afternoon Museum Visit"
- **System recommends from remaining activities only**

**Result**: Deterministic rule prevents duplicate recommendations.

---

### Example 4: Conflict Detection Override

**Context**: User selects "Sunset Beach Walk" (night-only) for day slot

**User Action**: Clicks to schedule activity for "day" slot

**Deterministic Check**:
- Activity's bestTime: ['evening', 'night']
- Selected slot: 'day'
- **MISMATCH DETECTED**

**System Response**:
- Intercepts user action
- Shows conflict modal: "This activity fits better during the evening."
- Suggests: "Move activity to night slot"
- **User cannot proceed without acknowledging conflict**

**Result**: Deterministic rule blocks incompatible scheduling, even if user explicitly selects it.

---

### Example 5: Distinct Recommendations Override

**Context**: 3 priorities active, all would naturally select the same activity

**Resolution Process**:
1. Resolve "timingFit" → Selects "Flexible Museum Visit"
2. Resolve "crowdDensity" → Would select "Flexible Museum Visit" again
   - **Exclusion applied**: "Flexible Museum Visit" is excluded
   - → Selects "Quiet Park Walk" instead
3. Resolve "energyDemand" → Would select "Flexible Museum Visit" again
   - **Exclusion applied**: "Flexible Museum Visit" is excluded
   - → Selects "Evening Stroll" instead

**Result**: 3 distinct recommendations shown, even though AI's natural preference would be the same activity for all priorities.

**If Exclusion Fails** (all alternatives are poor):
- System detects fewer than 2 distinct activities
- **Guidance collapses to brief-only** (no priority pills shown)
- **Result**: Deterministic rule prevents showing misleading multiple options when there's really only one good choice.

---

## Summary: Rule Hierarchy

1. **Pre-Resolution Rules** (applied before AI guidance):
   - Activity exclusion (already-assigned activities filtered out)

2. **Resolution Rules** (applied during activity selection):
   - Slot compatibility penalty (+50 / -10)
   - Energy balancing penalty (+40 / +30 / -15 / -10)
   - Distinct recommendations guard (exclusion chain)

3. **Post-Selection Rules** (applied when user takes action):
   - Slot mismatch detection (blocks incompatible scheduling)
   - Energy conflict detection (suggests lighter day)
   - Arrival day fatigue check (special case of energy conflict)
   - Combined conflict resolution (evaluates multiple constraints)

**Key Principle**: Deterministic rules are **additive** to AI priority scoring, meaning they can change which activity wins, but they never completely ignore AI preferences—they balance AI guidance with practical constraints.

---

## Design Philosophy

1. **AI Provides Context**: AI explains what dimensions matter (timing, crowds, energy, flexibility)
2. **Rules Ensure Feasibility**: Deterministic rules ensure recommendations are actually schedulable
3. **User Always Has Override**: All rules can be bypassed with "Add anyway" or "Keep as-is" options
4. **Transparency**: Conflicts are explicitly surfaced, not silently resolved
5. **Local Scope**: Rules only affect activities within the same city; never modify route, hotels, or flights
