# Activities AI: Product Specification

## Overview

The Activities AI is a decision-support system that helps users select and schedule activities for their trip itinerary. It operates across three phases: **generation**, **guidance**, and **conflict resolution**, each designed to reduce decision fatigue while respecting user autonomy.

## Inputs

The system receives the following contextual information:

### Trip Context
- **City**: The destination city for which activities are being selected
- **Pace**: User's travel pace preference (relaxed, moderate, or packed)
- **Travel Interests**: User-selected interests (e.g., history, food, adventure, culture)
- **Group Composition**: Number of adults and children traveling
- **Trip Duration**: Total days in the trip
- **Existing Schedule**: Activities already assigned to specific days and time slots (day/night)

### Activity Metadata
Each activity option includes:
- **Timing Characteristics**: Best time of day (early morning, morning, afternoon, evening, night), timing sensitivity (how critical timing is), and reason for timing constraints
- **Energy Requirements**: Physical effort level (low, medium, high) and duration (short ~2-3 hours or long ~4-6 hours)
- **Crowd Characteristics**: Expected crowd level (low, medium, high)
- **Flexibility**: Timing sensitivity, environmental constraints (indoor/outdoor), weather dependencies
- **Personalization Signals**: Relevance to user interests, iconic status, discovery potential

### Selection Context
When a user attempts to assign an activity:
- **Requested Slot**: The day/night slot the user selected
- **Current Day Status**: Whether the day is arrival day, already has activities, and energy load
- **City-Wide Schedule**: All activities across all days in the same city
- **Flight Duration**: For arrival days, the length of the inbound flight to assess fatigue

## Decisions It Helps With

### 1. Activity Selection Guidance
When multiple activity options are available for a city, the AI helps users understand which dimensions matter most:
- **Timing Fit**: Whether activities differ in when they should be done (morning vs. evening, flexible vs. time-sensitive)
- **Crowd Density**: Whether activities differ in expected crowd levels
- **Energy Demand**: Whether activities differ in physical effort and duration requirements
- **Rigidity**: Whether activities differ in scheduling flexibility (can be moved vs. must happen at specific time)

The AI only surfaces guidance when **two or more dimensions meaningfully differ** across options, avoiding noise when all activities are similar.

### 2. Activity Recommendation
For each priority dimension, the AI deterministically selects a single "Agent Pick" activity that best matches that priority:
- **Timing Fit Priority**: Recommends activities with flexible timing that fit naturally into the schedule
- **Crowd Density Priority**: Recommends activities with lower crowd levels for a more relaxed experience
- **Energy Demand Priority**: Recommends activities that match the user's pace (low effort for relaxed pace, high effort for packed pace)
- **Rigidity Priority**: Recommends activities with flexible timing vs. those requiring specific timing/conditions

The recommendation considers:
- **Slot Compatibility**: Penalizes activities that don't fit the selected day/night slot
- **Intra-Day Energy Balancing**: Avoids recommending high-effort + high-effort or long-duration + long-duration activities on the same day
- **Exclusion Logic**: Ensures distinct recommendations when multiple priorities are shown (no duplicate activities across priority pills)

### 3. Conflict Resolution
When a user attempts to schedule an activity that conflicts with timing or energy constraints, the AI evaluates the conflict and suggests resolution options:

**Slot Mismatch**: Activity's optimal time doesn't match the selected slot
- If the correct slot is available on the same day → suggests moving to that slot
- If the correct slot is available on another day → suggests moving to that day
- If no correct slot is available → suggests swapping with existing activities or choosing a different activity

**Energy Conflict**: High-effort or long-duration activity conflicts with existing high-energy activities on the same day
- If a lighter day exists → suggests moving to that day
- If no lighter day exists → suggests swapping with lighter activities or choosing a different activity

**Combined Conflict**: Both slot mismatch and energy conflict occur simultaneously
- If another day satisfies both requirements → suggests moving to that day
- Otherwise → suggests local reshuffling (swapping activities within the same city) or choosing a different activity

**Smart Reorder**: When a target slot is full, the system evaluates local rearrangements within the same city:
- Considers swapping with lower-effort or more flexible activities
- Scores each rearrangement plan based on penalties (slot mismatch, energy overload, timing rigidity)
- Recommends the lowest-penalty plan as the primary suggestion

## Tradeoff Evaluation

The system evaluates tradeoffs across four dimensions:

### 1. Time Tradeoffs
- **Timing Fit**: Compares activities' optimal time windows (day vs. night, flexible vs. time-sensitive)
- **Timing Sensitivity**: Evaluates how critical timing is (low = can be moved, high = must happen at specific time)
- **Duration Impact**: Considers how activity duration affects schedule flexibility (short activities are easier to fit)

### 2. Energy Tradeoffs
- **Physical Effort**: Compares activity energy requirements (low, medium, high)
- **Duration**: Considers activity length (short ~2-3 hours vs. long ~4-6 hours)
- **Day Energy Load**: Evaluates cumulative energy demand when multiple activities are scheduled on the same day
- **Arrival Day Fatigue**: Accounts for flight duration and jet lag when scheduling high-effort activities on arrival day

### 3. Conflict Tradeoffs
- **Slot Compatibility**: Penalizes activities that don't match the selected time slot (day vs. night)
- **Energy Overload**: Penalizes days with multiple high-effort or long-duration activities
- **Timing Rigidity**: Penalizes activities with high timing sensitivity or environmental constraints

### 4. Flexibility Tradeoffs
- **Scheduling Flexibility**: Compares activities' ability to be moved or rescheduled
- **Constraint Impact**: Evaluates weather dependencies, daylight requirements, and other environmental constraints
- **Complementary Pairings**: Prefers activities that balance each other (high + low effort, long + short duration)

## Outputs

### 1. Activity Generation
Produces 5-8 realistic, well-known activities per city with:
- Rich metadata (timing, energy, crowds, flexibility)
- Personalization (60-70% aligned with user interests, 30-40% exploratory/iconic)
- Relevance scoring (1-5 scale with reasoning)
- Balanced mix across time periods and energy levels

### 2. Priority Guidance
When meaningful differences exist (2+ dimensions differ), produces:
- **Brief**: 1-2 sentence explanation of the decision context, written in casual, friendly tone
- **Priority Pills**: Short labels (3-5 words) with one-sentence helper text for each active dimension
- **Travel Signals**: Derived risk indicators (fatigue risk, crowd stress, flexibility risk, weather exposure) used for AI framing only

### 3. Agent Pick Recommendation
For each priority dimension, produces:
- **Selected Activity**: Single activity ID that best matches the priority
- **Priority Used**: Which dimension was used for selection
- **Human Explanation**: Template-based copy explaining the recommendation and accepted tradeoff
- **Visual Highlighting**: Subtle visual cues (orange styling, compass icon) on the recommended activity card

### 4. Conflict Resolution
When conflicts are detected, produces:
- **Decision Result**: Structured response with status (MOVE, WARNING, BLOCKED, SMART_REORDER_SUGGESTION)
- **Facts**: Clear explanation of why the conflict exists
- **Risks**: Potential downsides of proceeding with the conflict
- **Recommendation**: Primary suggested action (e.g., "Move to May 12 morning")
- **Options**: Alternative actions (swap activities, choose different activity, keep as-is)
- **Single Suggestion**: One concrete recommendation per conflict (no multi-action phrasing)

## Key Design Principles

1. **Meaningful Difference Gate**: AI guidance only appears when options truly differ (≥2 dimensions), reducing cognitive load
2. **Deterministic Resolution**: Agent Pick uses rule-based scoring, not AI, ensuring consistent recommendations
3. **Context Awareness**: Recommendations consider slot compatibility, day energy load, and existing schedule
4. **User Autonomy**: All recommendations are suggestions; users can override at any time
5. **Progressive Disclosure**: Conflicts are surfaced only when they occur, not preemptively
6. **Single Recommendation**: One clear suggestion per conflict, avoiding decision paralysis
7. **Local Scope**: Conflict resolution only affects activities within the same city; never modifies route, hotels, or flights

## Integration Points

- **Activity Generation API**: Produces initial activity pool with metadata
- **Activity Selection UI**: Filters out already-assigned activities before computing differences
- **Priority Guidance API**: Generates brief and priority pills when meaningful differences exist
- **Decision Engine**: Evaluates conflicts and produces resolution suggestions
- **Trip State**: Persists activity assignments and tracks agent decision success for progressive trust
