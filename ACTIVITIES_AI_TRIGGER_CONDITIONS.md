# Activities AI: Trigger Conditions & Safeguards

## When AI Guidance Triggers

### Condition 1: Meaningful Differences Gate (Priority Guidance)

AI guidance appears **only when 2 or more dimensions meaningfully differ** across available activity options.

#### The Four Dimensions:

**1. Timing Fit** (`timingFit`)
- **Triggers when**: Activities span different time periods OR have different timing sensitivities OR mix flexible and constrained timing
- **Specific conditions**:
  - Activities include both day-time options (early_morning, morning, afternoon) AND night-time options (evening, night), OR
  - Activities have 2+ different timing sensitivity levels (low, medium, high), OR
  - Activities mix flexible timing (`timingReason: 'flexible'`) with constrained timing (crowds, lighting, opening_hours, weather, access, experience_quality)

**2. Crowd Density** (`crowdDensity`)
- **Triggers when**: Activities span 2+ different crowd levels (low, medium, high)

**3. Energy Demand** (`energyDemand`)
- **Triggers when**: Activities span 2+ different physical effort levels (low, medium, high)

**4. Rigidity** (`rigidity`)
- **Triggers when**: Activities differ in scheduling flexibility
- **Specific conditions**:
  - Activities mix low timing sensitivity (flexible) with high timing sensitivity (rigid), OR
  - Activities mix constrained options (requiresDaylight or weatherDependent) with unconstrained options, OR
  - Activities have different duration requirements (short ~2-3 hours vs. long ~4-6 hours)

#### Gate Logic:
```
IF (count of dimensions that differ >= 2) THEN
  → Show AI guidance (brief + priority pills)
ELSE
  → No AI guidance shown
```

### Condition 2: Activity Filtering (Pre-Guidance)

Before computing meaningful differences, the system **automatically filters out**:
- Activities already assigned to any day/slot in the same city
- Activities that are not available (empty activity list)

**Result**: Guidance only considers activities the user can actually select.

### Condition 3: Conflict Detection (Post-Selection)

AI conflict resolution triggers **only when a user attempts to schedule an activity** that has:
- **Slot Mismatch**: Activity's optimal time doesn't match the selected slot (day vs. night)
- **Energy Conflict**: High-effort or long-duration activity conflicts with existing high-energy activities on the same day
- **Arrival Day Fatigue**: High-effort activity scheduled on arrival day after a long flight (>10 hours)
- **Combined Conflict**: Both slot mismatch and energy conflict occur simultaneously

**Important**: Conflict resolution is **reactive**, not proactive. It only triggers when the user takes an action.

---

## When AI Does NOT Intervene

### Case 1: Insufficient Meaningful Differences

**Scenario**: All available activities are similar across dimensions
- **Example**: All activities are low-effort, flexible timing, low crowds, short duration
- **Result**: No AI guidance shown (brief-only mode or no guidance at all)
- **Reason**: No meaningful tradeoffs to explain

**Specific sub-cases**:
- Only 1 dimension differs (e.g., only crowd levels differ, but timing, energy, and flexibility are identical)
- All activities have identical timing characteristics (all day-time, all flexible)
- All activities have identical energy requirements (all low-effort, all short duration)
- All activities have identical flexibility (all low sensitivity, no constraints)

### Case 2: No Available Activities

**Scenario**: All activities for the city are already assigned
- **Result**: No AI guidance (empty activity list)
- **Reason**: Nothing to guide on

### Case 3: User Hasn't Selected an Activity

**Scenario**: User is browsing activities but hasn't clicked to schedule one
- **Result**: No conflict resolution triggered
- **Reason**: No action to evaluate

### Case 4: Activity Fits Perfectly

**Scenario**: User selects an activity that:
- Matches the selected slot (day/night compatibility)
- Doesn't conflict with existing activities (no energy overload)
- Is not on arrival day with long flight + high effort
- **Result**: Activity is scheduled immediately without AI intervention
- **Reason**: No conflicts to resolve

### Case 5: User Overrides AI Recommendation

**Scenario**: User ignores Agent Pick and selects a different activity
- **Result**: No additional AI intervention (no warnings, no blocking)
- **Reason**: User autonomy is respected; AI remains silent

### Case 6: Duplicate Recommendations Detected

**Scenario**: AI resolves multiple priorities but they all point to the same activity
- **Result**: Guidance collapses to brief-only (no priority pills shown)
- **Reason**: No distinct alternatives to present

### Case 7: Less Than 2 Distinct Activities Resolved

**Scenario**: After resolving all priorities, fewer than 2 distinct activities are found
- **Result**: Guidance collapses to brief-only (no priority pills shown)
- **Reason**: Insufficient distinct options to present as choices

---

## How the System Prevents Overstepping

### Safeguard 1: Deterministic Gate (No AI Until Threshold Met)

**Mechanism**: `shouldProceedWithAI()` function counts dimensions that differ
- **Threshold**: Must be ≥2 dimensions
- **Result**: AI guidance API is never called if threshold isn't met
- **Prevents**: AI from generating guidance when options are too similar

### Safeguard 2: Activity Exclusion (No Auto-Selection)

**Mechanism**: Activities already assigned are filtered out before AI sees them
- **Scope**: Only considers activities user can actually select
- **Result**: AI cannot recommend activities already in the schedule
- **Prevents**: Duplicate recommendations or suggesting unavailable options

### Safeguard 3: Recommendation-Only (No Auto-Assignment)

**Mechanism**: Agent Pick is a **visual highlight and suggestion**, not an automatic assignment
- **User Action Required**: User must click the Agent Pick card or CTA to select it
- **Result**: AI never automatically adds activities to the schedule
- **Prevents**: AI from making decisions without user consent

### Safeguard 4: Distinct Recommendations Guard

**Mechanism**: System validates that resolved activities are distinct before showing priority pills
- **Check**: Ensures no duplicate `activityId` across resolved priorities
- **Fallback**: If duplicates detected, collapses to brief-only mode
- **Prevents**: Showing multiple priority pills that all recommend the same activity

### Safeguard 5: Conflict Resolution is Suggestive, Not Blocking

**Mechanism**: All conflict resolution options include "Add anyway" or "Keep as-is" option
- **User Autonomy**: User can always override AI suggestions
- **Result**: AI never blocks user actions, only suggests alternatives
- **Prevents**: AI from preventing user from making their own choices

### Safeguard 6: Local Scope Only

**Mechanism**: Conflict resolution only affects activities within the same city
- **Constraint**: Never modifies route order, hotels, or flights
- **Result**: AI cannot make structural changes to the trip
- **Prevents**: AI from overstepping into areas outside its scope

### Safeguard 7: Reactive, Not Proactive

**Mechanism**: Conflict detection only triggers when user takes an action
- **Timing**: Evaluates conflicts at the moment of selection, not preemptively
- **Result**: AI doesn't warn about hypothetical conflicts
- **Prevents**: Overwhelming users with warnings about things they haven't done yet

### Safeguard 8: Single Recommendation Per Conflict

**Mechanism**: Each conflict type returns one primary recommendation
- **Structure**: One concrete suggestion (e.g., "Move to May 12 morning")
- **Result**: No multi-action phrasing or overwhelming options
- **Prevents**: Decision paralysis from too many choices

### Safeguard 9: Template-Based Explanations (No AI Hallucination)

**Mechanism**: Agent Pick explanations use deterministic templates based on `priorityUsed`
- **Source**: Pre-written copy templates, not AI-generated explanations
- **Result**: Consistent, predictable messaging
- **Prevents**: AI from generating unexpected or inappropriate explanations

### Safeguard 10: Failure Mode is Silent

**Mechanism**: If AI guidance API fails, system shows nothing (no error messages, no fallback guidance)
- **Behavior**: UI continues to work normally without AI guidance
- **Result**: AI failure doesn't break the user experience
- **Prevents**: AI errors from blocking user progress

---

## Summary: AI Intervention Matrix

| User State | Available Activities | Meaningful Differences | AI Behavior |
|------------|---------------------|----------------------|-------------|
| Browsing activities | 5+ activities | <2 dimensions differ | **No guidance shown** |
| Browsing activities | 5+ activities | ≥2 dimensions differ | **Shows brief + priority pills** |
| Browsing activities | All assigned | N/A | **No guidance shown** |
| Selecting compatible activity | Any | N/A | **No conflict resolution** (schedules immediately) |
| Selecting mismatched activity | Any | N/A | **Shows conflict resolution** (suggests move/swap) |
| Selecting high-energy activity on overloaded day | Any | N/A | **Shows conflict resolution** (suggests lighter day) |
| Ignoring Agent Pick | Any | N/A | **No additional intervention** (respects user choice) |

---

## Key Principles

1. **AI is Optional**: Users can always proceed without AI guidance
2. **AI is Suggestive**: All recommendations require explicit user action
3. **AI is Contextual**: Only intervenes when meaningful differences or conflicts exist
4. **AI is Respectful**: Never blocks user actions, only suggests alternatives
5. **AI is Local**: Only affects activities within the same city
6. **AI is Reactive**: Responds to user actions, doesn't preemptively warn
7. **AI is Deterministic**: Uses rule-based logic for recommendations, not AI for final selection
8. **AI Fails Gracefully**: Errors don't break the user experience
