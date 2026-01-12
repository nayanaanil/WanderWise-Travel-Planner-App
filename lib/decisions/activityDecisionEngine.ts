/**
 * Activity Decision Engine
 * 
 * Deterministic evaluation of activity scheduling decisions.
 * 
 * Rules:
 * - Pure function (no side effects)
 * - No state mutation
 * - Deterministic output for given input
 * - Returns DecisionResult with facts, risks, and options
 * - Slot recommendations are SOFT (user can override)
 * - Conflicts result in EXPLICIT user choices, never silent replacement
 * - Simplified to Day/Night slots only
 */

import { DecisionResult, DecisionOption } from './types';

// Simplified to Day/Night only
export type TimeSlot = 'day' | 'night';

export type ActivityDecisionInput = {
  activity: {
    id: string;
    name: string;
    bestTime?: TimeSlot | TimeSlot[];
    duration?: number; // in hours
    // V2 metadata for tiered decision handling
    timingSensitivity?: 'low' | 'medium' | 'high';
    timingReason?: 'crowds' | 'lighting' | 'opening_hours' | 'weather' | 'access' | 'experience_quality' | 'flexible';
    constraints?: {
      requiresDaylight?: boolean;
      weatherDependent?: boolean;
    };
  };
  day: {
    date: string; // ISO date
    city: string;
  };
  requestedSlot?: TimeSlot; // The slot the user initially requested (for override option)
  existingActivities?: Array<{
    id: string;
    name: string;
    timeSlot: TimeSlot;
    duration?: number;
  }>;
};

/**
 * Determine if a time slot conflicts with existing activities
 */
function hasSlotConflict(
  proposedSlot: TimeSlot,
  duration: number = 4, // default 4 hours
  existingActivities: Array<{ timeSlot: TimeSlot; duration?: number }> = []
): boolean {
  // Simplified conflict detection: same slot = conflict
  // In a more sophisticated system, we'd check overlapping durations
  return existingActivities.some(activity => activity.timeSlot === proposedSlot);
}

/**
 * Helper to get all available slots
 */
function getAvailableSlots(
  existingActivities: Array<{ timeSlot: TimeSlot; duration?: number }> = [],
  activityDuration: number = 4
): { free: TimeSlot[]; occupied: TimeSlot[] } {
  const allSlots: TimeSlot[] = ['day', 'night']; // Simplified to Day/Night
  const free = allSlots.filter(slot => !hasSlotConflict(slot, activityDuration, existingActivities));
  const occupied = allSlots.filter(slot => hasSlotConflict(slot, activityDuration, existingActivities));
  return { free, occupied };
}

/**
 * Build conflict resolution options when target slot is occupied
 */
function buildConflictOptions(
  targetSlot: TimeSlot,
  activity: { id: string; name: string },
  conflictingActivity: { id: string; name: string; timeSlot: TimeSlot },
  freeSlots: TimeSlot[],
  dayDate: string
): DecisionOption[] {
  const options: DecisionOption[] = [];
  
  // Option 1: Replace existing activity in target slot
  options.push({
    id: `replace-${targetSlot}`,
    label: `Replace ${conflictingActivity.name} in ${targetSlot}`,
    description: `Remove ${conflictingActivity.name} and add ${activity.name} to ${targetSlot} slot`,
    tradeoffs: [`Will remove ${conflictingActivity.name} from ${targetSlot} slot`],
    action: {
      type: 'REPLACE_ACTIVITY',
      payload: {
        removeActivityId: conflictingActivity.id,
        addActivityId: activity.id,
        date: dayDate,
        timeSlot: targetSlot,
      },
    },
  });
  
  // Option 2: Move existing activity to another free slot
  if (freeSlots.length > 0) {
    freeSlots.forEach((freeSlot, idx) => {
      options.push({
        id: `move-existing-${freeSlot}-${idx}`,
        label: `Move ${conflictingActivity.name} to ${freeSlot}, add ${activity.name} to ${targetSlot}`,
        description: `Reschedule ${conflictingActivity.name} to ${freeSlot} slot to make room for ${activity.name}`,
        tradeoffs: [`${conflictingActivity.name} will be moved to ${freeSlot}`],
        action: {
          type: 'MOVE_AND_ADD',
          payload: {
            moveActivityId: conflictingActivity.id,
            moveToSlot: freeSlot,
            addActivityId: activity.id,
            addToSlot: targetSlot,
            date: dayDate,
          },
        },
      });
    });
  }
  
  // Option 3: Add new activity to a different free slot
  freeSlots.forEach((freeSlot, idx) => {
    options.push({
      id: `add-to-${freeSlot}-${idx}`,
      label: `Add to ${freeSlot} slot instead`,
      description: `Schedule ${activity.name} in ${freeSlot} slot to avoid conflict`,
      action: {
        type: 'SCHEDULE_ACTIVITY',
        payload: {
          activityId: activity.id,
          date: dayDate,
          timeSlot: freeSlot,
        },
      },
    });
  });
  
  return options;
}

/**
 * Normalize slot names to semantic equivalents
 * 
 * Equivalence rules:
 * - evening, night → 'night'
 * - early_morning, morning, afternoon, day → 'day'
 * 
 * This prevents false-positive impact modals when users select
 * semantically equivalent slots (e.g., evening activity → night card).
 */
function normalizeSlot(slot: string): 'day' | 'night' {
  const slotLower = slot.toLowerCase();
  
  // Night equivalents
  if (['evening', 'night'].includes(slotLower)) {
    return 'night';
  }
  
  // Day equivalents
  if (['early_morning', 'morning', 'afternoon', 'day'].includes(slotLower)) {
    return 'day';
  }
  
  // Default fallback (should not happen with valid TimeSlot)
  return slotLower as 'day' | 'night';
}

/**
 * Check if user's selected slot is compatible with activity's bestTime
 * 
 * Uses slot normalization to treat semantically equivalent slots as compatible
 * (e.g., evening ≈ night, morning ≈ day)
 */
function isSlotCompatible(
  requestedSlot: TimeSlot | undefined,
  bestTime: TimeSlot | TimeSlot[] | undefined
): boolean {
  if (!requestedSlot || !bestTime) {
    return true; // No constraint
  }
  
  const normalizedRequested = normalizeSlot(requestedSlot);
  const bestTimes = Array.isArray(bestTime) ? bestTime : [bestTime];
  const normalizedBestSlots = bestTimes.map(normalizeSlot);
  
  return normalizedBestSlots.includes(normalizedRequested);
}

/**
 * Determine timing sensitivity tier for an activity
 * 
 * Tier 1 (Flexible): Skip impact UI entirely
 * Tier 2 (Preferential): Simple 2-option modal
 * Tier 3 (Constrained): Full decision modal with multiple options
 */
function getTimingTier(activity: {
  timingSensitivity?: 'low' | 'medium' | 'high';
  timingReason?: string;
  constraints?: { requiresDaylight?: boolean; weatherDependent?: boolean };
}): 1 | 2 | 3 {
  // Tier 3: Constrained (strict requirements)
  if (
    activity.timingSensitivity === 'high' ||
    activity.constraints?.requiresDaylight === true
  ) {
    return 3;
  }
  
  // Tier 1: Flexible (no timing constraints)
  if (
    activity.timingSensitivity === 'low' ||
    activity.timingReason === 'flexible'
  ) {
    return 1;
  }
  
  // Tier 2: Preferential (medium sensitivity)
  if (activity.timingSensitivity === 'medium') {
    return 2;
  }
  
  // Default to Tier 2 if metadata is incomplete
  return 2;
}

/**
 * Get concrete reason text based on timing metadata
 */
function getTimingReasonText(
  timingReason?: string,
  bestTime?: TimeSlot | TimeSlot[]
): string {
  const bestTimes = Array.isArray(bestTime) ? bestTime : bestTime ? [bestTime] : [];
  const timeLabel = bestTimes.length > 0 ? bestTimes[0] : 'earlier';
  
  switch (timingReason) {
    case 'crowds':
      return `This activity is usually more enjoyable ${timeLabel === 'day' ? 'during the day' : 'in the evening'} due to lighter crowds.`;
    case 'lighting':
      return `This activity offers a better experience ${timeLabel === 'day' ? 'during daylight' : 'after dark'} due to lighting conditions.`;
    case 'opening_hours':
      return `This activity is typically open ${timeLabel === 'day' ? 'during the day' : 'in the evening'}.`;
    case 'weather':
      return `This activity is more comfortable ${timeLabel === 'day' ? 'during the day' : 'in the evening'} for most weather conditions.`;
    case 'experience_quality':
      return `This activity is designed to be experienced ${timeLabel === 'day' ? 'during the day' : 'in the evening'}.`;
    default:
      return `This activity is usually more enjoyable ${timeLabel === 'day' ? 'during the day' : 'in the evening'}.`;
  }
}

/**
 * Evaluate activity scheduling decision with tiered handling
 * 
 * Implements three tiers:
 * - Tier 1 (Flexible): Skip impact UI, add immediately
 * - Tier 2 (Preferential): Simple 2-option modal with one concrete reason
 * - Tier 3 (Constrained): Full decision modal with multiple options
 * 
 * Rules:
 * - Pure function (no side effects)
 * - No state mutation
 * - Deterministic output for given input
 * - Slot recommendations are SOFT (user can override)
 * - Conflicts result in EXPLICIT user choices
 */
export function evaluateActivityDecision(input: ActivityDecisionInput): DecisionResult {
  const { activity, day, requestedSlot, existingActivities = [] } = input;

  // Determine timing tier
  const tier = getTimingTier(activity);

  const { free: freeSlots } = getAvailableSlots(existingActivities, activity.duration);

  // Helper to find conflicting activity for a slot
  const getConflictingActivity = (slot: TimeSlot) => 
    existingActivities.find(a => a.timeSlot === slot);

  // PRIORITY 1: Handle slot conflicts (applies to all tiers)
  if (requestedSlot && hasSlotConflict(requestedSlot, activity.duration, existingActivities)) {
    const conflictingActivity = getConflictingActivity(requestedSlot);
    if (conflictingActivity) {
      // Conflicts always trigger decision UI (Tier 3 behavior)
      return {
        domain: 'activity',
        status: 'WARNING',
        facts: [
          `The ${requestedSlot} slot is already occupied by ${conflictingActivity.name}.`,
        ],
        risks: ['Requested time slot is already occupied'],
        recommendation: `Choose how to resolve the conflict.`,
        options: buildConflictOptions(requestedSlot, activity, conflictingActivity, freeSlots, day.date),
      };
    }
  }

  // PRIORITY 2: Handle fully occupied days (applies to all tiers)
  if (freeSlots.length === 0) {
    return {
      domain: 'activity',
      status: 'BLOCKED',
      facts: ['All time slots are occupied for this day.'],
      risks: [
        'Cannot schedule activity without removing another',
        'Activity may need to be scheduled on a different day',
      ],
      recommendation: 'Remove or reschedule existing activities, or schedule on a different day',
      options: existingActivities.map((existingActivity, index) => ({
        id: `replace-activity-${index}`,
        label: `Replace ${existingActivity.name}`,
        description: `Remove ${existingActivity.name} and schedule ${activity.name} instead`,
        tradeoffs: [`Will remove ${existingActivity.name} from ${existingActivity.timeSlot} slot`],
        action: {
          type: 'REPLACE_ACTIVITY',
          payload: {
            removeActivityId: existingActivity.id,
            addActivityId: activity.id,
            date: day.date,
            timeSlot: existingActivity.timeSlot,
          },
        },
      })),
    };
  }

  // TIER 1: Flexible activities - skip impact UI entirely
  if (tier === 1) {
    // Immediately schedule in requested slot (or first available)
    const targetSlot = requestedSlot && freeSlots.includes(requestedSlot) 
      ? requestedSlot 
      : freeSlots[0];
    
    return {
      domain: 'activity',
      status: 'OK',
      facts: [],
      options: [{
        id: 'schedule-immediately',
        label: 'Schedule activity',
        description: `Add ${activity.name} to ${targetSlot} slot`,
        action: {
          type: 'SCHEDULE_ACTIVITY',
          payload: {
            activityId: activity.id,
            date: day.date,
            timeSlot: targetSlot,
          },
        },
      }],
    };
  }

  // Check if user's requested slot is compatible with bestTime (using normalization)
  const isCompatible = isSlotCompatible(requestedSlot, activity.bestTime);

  // If no bestTime specified or requested slot is compatible, proceed without decision
  if (!activity.bestTime || isCompatible) {
    const targetSlot = requestedSlot || freeSlots[0];
    
    return {
      domain: 'activity',
      status: 'OK',
      facts: [],
      options: [{
        id: 'schedule-requested',
        label: 'Schedule activity',
        description: `Add ${activity.name} to ${targetSlot} slot`,
        action: {
          type: 'SCHEDULE_ACTIVITY',
          payload: {
            activityId: activity.id,
            date: day.date,
            timeSlot: targetSlot,
          },
        },
      }],
    };
  }

  // User requested a slot that is NOT compatible with bestTime
  // (e.g., day activity → night slot, or evening activity → day slot)
  const bestTimes = Array.isArray(activity.bestTime) ? activity.bestTime : [activity.bestTime];
  // Find the first available bestTime slot
  const availableBestTimes = bestTimes.filter(slot => freeSlots.includes(slot));
  
  // TIER 2: Preferential - simple 2-option modal
  if (tier === 2 && availableBestTimes.length > 0) {
    const recommendedSlot = availableBestTimes[0];
    const reasonText = getTimingReasonText(activity.timingReason, bestTimes);
    
    return {
      domain: 'activity',
      status: 'WARNING',
      facts: [reasonText],
      options: [
        {
          id: 'move-to-recommended',
          label: 'Move to recommended time',
          description: `Schedules the activity at a time that usually offers a better experience.`,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: recommendedSlot,
            },
          },
        },
        {
          id: 'keep-selection',
          label: 'Keep my choice',
          description: `Keeps the activity at your selected time.`,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: requestedSlot!,
            },
          },
        },
      ],
    };
  }

  // TIER 3: Constrained - full decision modal with multiple options
  // (Or Tier 2 when no available bestTime slots exist)
  
  const recommendedSlot = availableBestTimes.length > 0 ? availableBestTimes[0] : freeSlots[0];
  const options: DecisionOption[] = [];

  // Option 1: Recommended slot (bestTime if available, otherwise first free)
  options.push({
    id: 'schedule-recommended',
    label: availableBestTimes.length > 0 
      ? `Schedule in ${recommendedSlot} (recommended)`
      : `Schedule in ${recommendedSlot}`,
    description: availableBestTimes.length > 0
      ? `Schedule in optimal ${recommendedSlot} slot based on activity's best time`
      : `Schedule in available ${recommendedSlot} slot`,
    action: {
      type: 'SCHEDULE_ACTIVITY',
      payload: {
        activityId: activity.id,
        date: day.date,
        timeSlot: recommendedSlot,
      },
    },
  });

  // Option 2: Keep requested slot if it's free and different from recommended
  if (requestedSlot && freeSlots.includes(requestedSlot) && requestedSlot !== recommendedSlot) {
    options.push({
      id: 'keep-requested',
      label: `Schedule in ${requestedSlot}`,
      description: `Add to requested ${requestedSlot} slot`,
      tradeoffs: availableBestTimes.length > 0 
        ? ['Activity may not be at optimal time']
        : undefined,
      action: {
        type: 'SCHEDULE_ACTIVITY',
        payload: {
          activityId: activity.id,
          date: day.date,
          timeSlot: requestedSlot,
        },
      },
    });
  }

  // Option 3+: Other available slots (only for Tier 3)
  if (tier === 3) {
    freeSlots
      .filter(slot => slot !== recommendedSlot && slot !== requestedSlot)
      .forEach((slot, index) => {
        options.push({
          id: `schedule-alt-${slot}-${index}`,
          label: `Schedule in ${slot}`,
          description: `Schedule in ${slot} slot`,
          tradeoffs: !bestTimes.includes(slot) ? ['Activity may not be at optimal time'] : undefined,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: slot,
            },
          },
        });
      });
  }

  // Build facts based on tier
  const facts: string[] = [];
  if (tier === 3 && availableBestTimes.length === 0 && bestTimes.length > 0) {
    facts.push(`Preferred time slots (${bestTimes.join(', ')}) are already occupied.`);
  } else if (availableBestTimes.length > 0) {
    facts.push(getTimingReasonText(activity.timingReason, bestTimes));
  }

  return {
    domain: 'activity',
    status: availableBestTimes.length > 0 ? 'WARNING' : 'OK',
    facts,
    risks: availableBestTimes.length === 0 && bestTimes.length > 0
      ? ['Activity may not be optimal if scheduled outside preferred time']
      : undefined,
    recommendation: availableBestTimes.length > 0
      ? `Recommended: Schedule in ${recommendedSlot} slot for optimal experience`
      : undefined,
    options,
  };
}
