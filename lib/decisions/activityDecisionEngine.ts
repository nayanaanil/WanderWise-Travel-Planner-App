/**
 * Activity Decision Engine
 * 
 * Deterministic evaluation of activity scheduling decisions.
 * 
 * Implements comprehensive decision matrix:
 * A. Slot mismatch (day vs night)
 * B. High-energy activity conflict
 * C. Combined conflict (slot + energy)
 * D. User override
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
    timingSensitivity?: 'low' | 'medium' | 'high';
    timingReason?: 'crowds' | 'lighting' | 'opening_hours' | 'weather' | 'access' | 'experience_quality' | 'flexible';
    constraints?: {
      requiresDaylight?: boolean;
      weatherDependent?: boolean;
    };
    physicalEffort?: 'low' | 'medium' | 'high';
    durationSlots?: 1 | 2; // Duration in slots (1 = ~2-3 hours, 2 = ~4-6 hours)
  };
  day: {
    date: string; // ISO date
    city: string;
  };
  requestedSlot?: TimeSlot; // The slot the user initially requested
  existingActivities?: Array<{
    id: string;
    name: string;
    timeSlot: TimeSlot;
    duration?: number;
    physicalEffort?: 'low' | 'medium' | 'high';
    durationSlots?: 1 | 2;
  }>;
  isArrivalDay?: boolean; // Whether the selected day is the arrival day for this city
  otherDaysInCity?: Array<{
    date: string; // ISO date
    activities: Array<{
      id: string;
      name: string;
      timeSlot: TimeSlot;
      physicalEffort?: 'low' | 'medium' | 'high';
      durationSlots?: 1 | 2;
    }>;
  }>;
  flightDurationHours?: number; // Flight duration in hours (for arrival-day fatigue check)
  allCityActivities?: Array<{
    date: string;
    day?: { id: string; name: string };
    night?: { id: string; name: string };
  }>;
  allCityActivityDetails?: Array<{
    id: string;
    name: string;
    physicalEffort?: 'low' | 'medium' | 'high';
    durationSlots?: 1 | 2;
    bestTime?: TimeSlot | TimeSlot[];
    timingSensitivity?: 'low' | 'medium' | 'high';
  }>;
};

/**
 * Normalize slot names to semantic equivalents
 */
function normalizeSlot(slot: string): 'day' | 'night' {
  const slotLower = slot.toLowerCase();
  if (['evening', 'night'].includes(slotLower)) return 'night';
  if (['early_morning', 'morning', 'afternoon', 'day'].includes(slotLower)) return 'day';
  return slotLower as 'day' | 'night';
}

/**
 * Check if user's selected slot is compatible with activity's bestTime
 */
function isSlotCompatible(
  requestedSlot: TimeSlot | undefined,
  bestTime: TimeSlot | TimeSlot[] | undefined
): boolean {
  if (!requestedSlot || !bestTime) return true;
  
  const normalizedRequested = normalizeSlot(requestedSlot);
  const bestTimes = Array.isArray(bestTime) ? bestTime : [bestTime];
  const normalizedBestSlots = bestTimes.map(normalizeSlot);
  
  return normalizedBestSlots.includes(normalizedRequested);
}

/**
 * Get the correct slot for an activity based on bestTime
 */
function getCorrectSlot(activity: { bestTime?: TimeSlot | TimeSlot[] }): TimeSlot | null {
  if (!activity.bestTime) return null;
  const bestTimes = Array.isArray(activity.bestTime) ? activity.bestTime : [activity.bestTime];
  return normalizeSlot(bestTimes[0]);
}

/**
 * Check if a slot is available on a given day
 */
function isSlotAvailable(
  date: string,
  slot: TimeSlot,
  existingActivities: Array<{ timeSlot: TimeSlot }>,
  allCityActivities?: Array<{ date: string; day?: { id: string; name: string }; night?: { id: string; name: string } }>
): boolean {
  // First check existingActivities (same day)
  if (existingActivities.some(a => a.timeSlot === slot)) return false;
  
  // Then check allCityActivities if available
  if (allCityActivities) {
    const dayData = allCityActivities.find(a => a.date === date);
    if (dayData) {
      if (slot === 'day' && dayData.day) return false;
      if (slot === 'night' && dayData.night) return false;
    }
  }
  
  return true;
}

/**
 * Calculate day energy load (high effort + long duration activities)
 */
function calculateDayEnergyLoad(
  existingActivities: Array<{ physicalEffort?: 'low' | 'medium' | 'high'; durationSlots?: 1 | 2 }>
): { hasHighEffort: boolean; hasLongDuration: boolean; count: number } {
  const hasHighEffort = existingActivities.some(a => a.physicalEffort === 'high');
  const hasLongDuration = existingActivities.some(a => a.durationSlots === 2);
  return { hasHighEffort, hasLongDuration, count: existingActivities.length };
}

/**
 * Find nearest future day with available slot
 */
function findNearestDayWithSlot(
  currentDate: string,
  targetSlot: TimeSlot,
  otherDaysInCity: Array<{ date: string; activities: Array<{ timeSlot: TimeSlot }> }>,
  allCityActivities?: Array<{ date: string; day?: { id: string; name: string }; night?: { id: string; name: string } }>
): { date: string; slot: TimeSlot } | null {
  const current = new Date(currentDate);
  const sortedDays = [...otherDaysInCity].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const currentTime = current.getTime();
    // Prefer future days, then nearest past days
    if (dateA >= currentTime && dateB < currentTime) return -1;
    if (dateA < currentTime && dateB >= currentTime) return 1;
    return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
  });
  
  for (const otherDay of sortedDays) {
    if (isSlotAvailable(otherDay.date, targetSlot, otherDay.activities, allCityActivities)) {
      return { date: otherDay.date, slot: targetSlot };
    }
  }
  
  return null;
}

/**
 * Find a lighter day (no high-effort or long-duration activities)
 */
function findLighterDay(
  currentDate: string,
  otherDaysInCity: Array<{ date: string; activities: Array<{ timeSlot: TimeSlot; physicalEffort?: 'low' | 'medium' | 'high'; durationSlots?: 1 | 2 }> }>
): { date: string; slot: TimeSlot } | null {
  const current = new Date(currentDate);
  const sortedDays = [...otherDaysInCity].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const currentTime = current.getTime();
    if (dateA >= currentTime && dateB < currentTime) return -1;
    if (dateA < currentTime && dateB >= currentTime) return 1;
    return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
  });
  
  for (const otherDay of sortedDays) {
    const energyLoad = calculateDayEnergyLoad(otherDay.activities);
    if (!energyLoad.hasHighEffort && !energyLoad.hasLongDuration) {
      // Find first available slot
      const occupiedSlots = new Set(otherDay.activities.map(a => a.timeSlot));
      const freeSlot = !occupiedSlots.has('day') ? 'day' : !occupiedSlots.has('night') ? 'night' : null;
      if (freeSlot) {
        return { date: otherDay.date, slot: freeSlot };
      }
    }
  }
  
  return null;
}

/**
 * Find day that satisfies both slot and energy requirements
 */
function findDayWithSlotAndEnergy(
  currentDate: string,
  targetSlot: TimeSlot,
  otherDaysInCity: Array<{ date: string; activities: Array<{ timeSlot: TimeSlot; physicalEffort?: 'low' | 'medium' | 'high'; durationSlots?: 1 | 2 }> }>,
  allCityActivities?: Array<{ date: string; day?: { id: string; name: string }; night?: { id: string; name: string } }>
): { date: string; slot: TimeSlot } | null {
  const current = new Date(currentDate);
  const sortedDays = [...otherDaysInCity].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const currentTime = current.getTime();
    if (dateA >= currentTime && dateB < currentTime) return -1;
    if (dateA < currentTime && dateB >= currentTime) return 1;
    return Math.abs(dateA - currentTime) - Math.abs(dateB - currentTime);
  });
  
  for (const otherDay of sortedDays) {
    // Check slot availability
    if (!isSlotAvailable(otherDay.date, targetSlot, otherDay.activities, allCityActivities)) continue;
    
    // Check energy load
    const energyLoad = calculateDayEnergyLoad(otherDay.activities);
    if (!energyLoad.hasHighEffort && !energyLoad.hasLongDuration) {
      return { date: otherDay.date, slot: targetSlot };
    }
  }
  
  return null;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Evaluate activity scheduling decision with comprehensive decision matrix
 */
export function evaluateActivityDecision(input: ActivityDecisionInput): DecisionResult {
  const { activity, day, requestedSlot, existingActivities = [], isArrivalDay = false, otherDaysInCity = [], flightDurationHours, allCityActivities, allCityActivityDetails } = input;

  // Get available slots on current day
  const occupiedSlots = new Set(existingActivities.map(a => a.timeSlot));
  const freeSlots = (['day', 'night'] as TimeSlot[]).filter(slot => !occupiedSlots.has(slot));
  const isFullyBooked = freeSlots.length === 0;

  // Check slot compatibility
  const hasSlotMismatch = requestedSlot && activity.bestTime && !isSlotCompatible(requestedSlot, activity.bestTime);
  const correctSlot = getCorrectSlot(activity);

  // Check energy conflicts
  const energyLoad = calculateDayEnergyLoad(existingActivities);
  const isHighEnergyActivity = activity.physicalEffort === 'high' || activity.durationSlots === 2;
  const hasEnergyConflict = isHighEnergyActivity && (energyLoad.hasHighEffort || energyLoad.hasLongDuration);
  const hasArrivalDayFatigue = isArrivalDay && flightDurationHours && flightDurationHours > 10 && isHighEnergyActivity;

  // ============================================
  // DECISION MATRIX IMPLEMENTATION
  // ============================================

  // A. SLOT MISMATCH HANDLING
  if (hasSlotMismatch && correctSlot) {
    // A1: Correct slot available on same day
    if (isSlotAvailable(day.date, correctSlot, existingActivities, allCityActivities)) {
      return {
        domain: 'activity',
        status: 'MOVE',
        facts: [`This activity fits better during the ${correctSlot === 'day' ? 'day' : 'evening'}.`],
        recommendation: `Move activity to ${correctSlot} slot`,
        options: [{
          id: 'move-to-correct-slot',
          label: 'Move activity to another slot on same day',
          description: `This activity fits better during the ${correctSlot === 'day' ? 'day' : 'evening'}.`,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: correctSlot,
            },
          },
        }],
      };
    }

    // A2: Correct slot unavailable on same day, available on another day
    const nearestDayWithSlot = findNearestDayWithSlot(day.date, correctSlot, otherDaysInCity, allCityActivities);
    if (nearestDayWithSlot) {
      return {
        domain: 'activity',
        status: 'MOVE',
        facts: [
          `This activity fits best during the ${correctSlot === 'day' ? 'day' : 'evening'}.`,
          'Your current day is full.',
        ],
        recommendation: `Move to ${formatDate(nearestDayWithSlot.date)}`,
        options: [{
          id: 'move-to-other-day',
          label: `Move to ${formatDate(nearestDayWithSlot.date)}`,
          description: `This activity fits best during the ${correctSlot === 'day' ? 'day' : 'evening'}. Your current day is full.`,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: nearestDayWithSlot.date,
              timeSlot: nearestDayWithSlot.slot,
            },
          },
        }],
      };
    }

    // A3: No correct slot available on any day
    const options: DecisionOption[] = [];
    
    // Option: Swap with another activity
    if (existingActivities.length > 0) {
      existingActivities.forEach((existing, idx) => {
        options.push({
          id: `swap-${existing.id}-${idx}`,
          label: `Swap with ${existing.name}`,
          description: `Replace ${existing.name} with this activity`,
          action: {
            type: 'REPLACE_ACTIVITY',
            payload: {
              removeActivityId: existing.id,
              addActivityId: activity.id,
              date: day.date,
              timeSlot: existing.timeSlot,
            },
          },
        });
      });
    }
    
    // Option: Choose different activity
    options.push({
      id: 'choose-different',
      label: 'Choose different activity',
      description: 'Cancel and select a different activity',
      action: { type: 'CANCEL' },
    });
    
    // Option: Add anyway
    options.push({
      id: 'add-anyway',
      label: 'Add anyway',
      description: 'Schedule this activity despite slot mismatch',
      tradeoffs: ['Activity may not be at optimal time'],
      action: {
        type: 'SCHEDULE_ACTIVITY',
        payload: {
          activityId: activity.id,
          date: day.date,
          timeSlot: requestedSlot,
        },
      },
    });

    return {
      domain: 'activity',
      status: 'BLOCKED',
      facts: [
        `This activity fits best during the ${correctSlot === 'day' ? 'day' : 'evening'}, but that slot is not available.`,
      ],
      risks: ['Activity may not be at optimal time'],
      recommendation: 'Consider swapping with another activity or choosing a different activity',
      options,
    };
  }

  // B. HIGH-ENERGY ACTIVITY CONFLICT HANDLING
  if (hasEnergyConflict || hasArrivalDayFatigue) {
    // B1: High-energy day available on another date
    const lighterDay = findLighterDay(day.date, otherDaysInCity);
    if (lighterDay) {
      const reason = hasArrivalDayFatigue
        ? 'This is a physically demanding activity and fits better on a lighter day after your arrival.'
        : 'This is a physically demanding activity and fits better on a lighter day.';
      
      return {
        domain: 'activity',
        status: 'MOVE',
        facts: [reason],
        recommendation: `Move to ${formatDate(lighterDay.date)}`,
        options: [{
          id: 'move-to-lighter-day',
          label: `Move to ${formatDate(lighterDay.date)}`,
          description: reason,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: lighterDay.date,
              timeSlot: lighterDay.slot,
            },
          },
        }],
      };
    }

    // B2: No suitable high-energy slot on any day
    const options: DecisionOption[] = [];
    
    // Option: Swap with lighter activity
    const lighterActivities = existingActivities.filter(
      a => a.physicalEffort !== 'high' && a.durationSlots !== 2
    );
    lighterActivities.forEach((lighter, idx) => {
      options.push({
        id: `swap-lighter-${lighter.id}-${idx}`,
        label: `Swap with ${lighter.name}`,
        description: `Replace ${lighter.name} with this activity`,
        action: {
          type: 'REPLACE_ACTIVITY',
          payload: {
            removeActivityId: lighter.id,
            addActivityId: activity.id,
            date: day.date,
            timeSlot: lighter.timeSlot,
          },
        },
      });
    });
    
    // Option: Choose different activity
    options.push({
      id: 'choose-different-energy',
      label: 'Choose different activity',
      description: 'Cancel and select a different activity',
      action: { type: 'CANCEL' },
    });
    
    // Option: Add anyway
    options.push({
      id: 'add-anyway-energy',
      label: 'Add anyway',
      description: 'Schedule this activity despite energy conflict',
      tradeoffs: ['This may feel rushed or tiring'],
      action: {
        type: 'SCHEDULE_ACTIVITY',
        payload: {
          activityId: activity.id,
          date: day.date,
          timeSlot: requestedSlot || freeSlots[0] || 'day',
        },
      },
    });

    return {
      domain: 'activity',
      status: 'WARNING',
      facts: [
        hasArrivalDayFatigue
          ? 'This is a physically demanding activity scheduled on your arrival day after a long flight.'
          : 'This high-effort activity would be scheduled on a day that already has another high-effort or long-duration activity.',
      ],
      risks: ['This may feel rushed or tiring'],
      recommendation: 'Consider swapping with a lighter activity or choosing a different activity',
      options,
    };
  }

  // C. COMBINED CONFLICT (slot + energy)
  if (hasSlotMismatch && hasEnergyConflict && correctSlot) {
    // C1: Another day satisfies both slot + energy
    const perfectDay = findDayWithSlotAndEnergy(day.date, correctSlot, otherDaysInCity, allCityActivities);
    if (perfectDay) {
      return {
        domain: 'activity',
        status: 'MOVE',
        facts: [
          'This activity fits best during the day on a lighter schedule.',
        ],
        recommendation: `Move to ${formatDate(perfectDay.date)}`,
        options: [{
          id: 'move-to-perfect-day',
          label: `Move to ${formatDate(perfectDay.date)}`,
          description: 'This activity fits best during the day on a lighter schedule.',
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: perfectDay.date,
              timeSlot: perfectDay.slot,
            },
          },
        }],
      };
    }

    // C2: Slot exists but energy overload
    if (isSlotAvailable(day.date, correctSlot, existingActivities, allCityActivities)) {
      const lighterActivities = existingActivities.filter(
        a => a.physicalEffort !== 'high' && a.durationSlots !== 2
      );
      
      if (lighterActivities.length > 0) {
        const options: DecisionOption[] = lighterActivities.map((lighter, idx) => ({
          id: `swap-combined-${lighter.id}-${idx}`,
          label: `Swap with ${lighter.name}`,
          description: `Replace ${lighter.name} with this activity`,
          action: {
            type: 'REPLACE_ACTIVITY',
            payload: {
              removeActivityId: lighter.id,
              addActivityId: activity.id,
              date: day.date,
              timeSlot: lighter.timeSlot,
            },
          },
        }));
        
        options.push({
          id: 'add-anyway-combined',
          label: 'Add anyway',
          description: 'Schedule this activity despite conflicts',
          tradeoffs: ['This may feel rushed or tiring'],
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: correctSlot,
            },
          },
        });

        return {
          domain: 'activity',
          status: 'SWAP',
          facts: ['That day already looks intense.'],
          recommendation: 'Swap activities',
          options,
        };
      }
    }

    // C3: No valid resolution
    const options: DecisionOption[] = [];
    
    // Option: Reorder activities
    options.push({
      id: 'reorder-activities',
      label: 'Reorder activities',
      description: 'See alternative arrangements',
      action: { type: 'CANCEL' },
    });
    
    // Option: Choose different activity
    options.push({
      id: 'choose-different-combined',
      label: 'Choose different activity',
      description: 'Cancel and select a different activity',
      action: { type: 'CANCEL' },
    });
    
    // Option: Add anyway
    options.push({
      id: 'add-anyway-combined',
      label: 'Add anyway',
      description: 'Schedule this activity despite conflicts',
      tradeoffs: ['This may feel rushed or tiring'],
      action: {
        type: 'SCHEDULE_ACTIVITY',
        payload: {
          activityId: activity.id,
          date: day.date,
          timeSlot: requestedSlot || freeSlots[0] || 'day',
        },
      },
    });

    return {
      domain: 'activity',
      status: 'BLOCKED',
      facts: [
        'This activity has both slot and energy conflicts that cannot be easily resolved.',
      ],
      risks: ['This may feel rushed or tiring'],
      recommendation: 'Consider reordering activities or choosing a different activity',
      options,
    };
  }

  // D. USER OVERRIDE - If no conflicts, allow scheduling
  // Also handle slot conflicts (occupied slot)
  if (requestedSlot && occupiedSlots.has(requestedSlot)) {
    const conflictingActivity = existingActivities.find(a => a.timeSlot === requestedSlot);
    if (conflictingActivity) {
      const options: DecisionOption[] = [
        {
          id: 'replace-conflicting',
          label: `Replace ${conflictingActivity.name}`,
          description: `Remove ${conflictingActivity.name} and add this activity`,
          action: {
            type: 'REPLACE_ACTIVITY',
            payload: {
              removeActivityId: conflictingActivity.id,
              addActivityId: activity.id,
              date: day.date,
              timeSlot: requestedSlot,
            },
          },
        },
      ];
      
      // Add option to use free slot if available
      if (freeSlots.length > 0) {
        options.push({
          id: 'use-free-slot',
          label: `Add to ${freeSlots[0]} slot`,
          description: `Schedule in available ${freeSlots[0]} slot`,
          action: {
            type: 'SCHEDULE_ACTIVITY',
            payload: {
              activityId: activity.id,
              date: day.date,
              timeSlot: freeSlots[0],
            },
          },
        });
      }
      
      return {
        domain: 'activity',
        status: 'WARNING',
        facts: [`The ${requestedSlot} slot is already occupied by ${conflictingActivity.name}.`],
        recommendation: 'Choose how to resolve the conflict',
        options,
      };
    }
  }

  // No conflicts - allow scheduling
  const targetSlot = requestedSlot || freeSlots[0] || 'day';
  
  return {
    domain: 'activity',
    status: 'OK',
    facts: [],
    options: [{
      id: 'schedule-activity',
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
