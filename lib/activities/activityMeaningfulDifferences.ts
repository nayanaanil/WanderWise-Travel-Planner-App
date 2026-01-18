/**
 * Activity Meaningful Differences Gate
 * 
 * Deterministic gate to decide if AI guidance should be called for activity selection.
 * Only proceeds with AI if 2+ dimensions show meaningful differences.
 * 
 * Scope: Per city/day/slot only
 * 
 * Dimensions:
 * - timingFit: Whether activities differ in timing fit (bestTime, timingSensitivity, timingReason)
 * - crowdDensity: Whether activities differ in crowd levels
 * - energyDemand: Whether activities differ in physical effort/energy requirements
 * - rigidity: Whether activities differ in flexibility/rigidity (timingSensitivity, constraints, durationSlots)
 */

import type { GeneratedActivity } from '@/app/api/agent/generate-activities/route';

/**
 * Compute meaningful differences across activity options
 * 
 * @param activities Array of activity options
 * @returns Object indicating which dimensions differ meaningfully
 */
export function computeActivityMeaningfulDifferences(
  activities: GeneratedActivity[]
): {
  timingFit: boolean;
  crowdDensity: boolean;
  energyDemand: boolean;
  rigidity: boolean;
} {
  if (activities.length === 0) {
    return { timingFit: false, crowdDensity: false, energyDemand: false, rigidity: false };
  }

  // 1. TIMING FIT DIFFERENCE CHECK
  // Check if activities differ in timing fit (bestTime, timingSensitivity, timingReason)
  let timingFitDiffers = false;

  // Collect all bestTime values across activities
  const allBestTimes = new Set<string>();
  for (const activity of activities) {
    for (const time of activity.bestTime) {
      allBestTimes.add(time);
    }
  }

  // Check if activities span different time periods
  // Meaningful difference if activities cover different time buckets
  const timeBuckets = {
    day: ['early_morning', 'morning', 'afternoon'],
    night: ['evening', 'night'],
  };
  
  const hasDayActivities = Array.from(allBestTimes).some(time => 
    timeBuckets.day.includes(time)
  );
  const hasNightActivities = Array.from(allBestTimes).some(time => 
    timeBuckets.night.includes(time)
  );

  // Check timingSensitivity variation
  const timingSensitivities = new Set<string>();
  for (const activity of activities) {
    timingSensitivities.add(activity.timingSensitivity);
  }

  // Check timingReason variation (especially flexible vs constrained)
  const timingReasons = new Set<string>();
  for (const activity of activities) {
    timingReasons.add(activity.timingReason);
  }
  const hasFlexible = timingReasons.has('flexible');
  const hasConstrained = Array.from(timingReasons).some(reason => 
    reason !== 'flexible'
  );

  // Meaningful difference: activities span day/night, OR different timing sensitivities, OR mix of flexible/constrained
  timingFitDiffers = 
    (hasDayActivities && hasNightActivities) || // Span day and night
    timingSensitivities.size >= 2 || // Different sensitivity levels
    (hasFlexible && hasConstrained); // Mix of flexible and constrained

  // 2. CROWD DENSITY DIFFERENCE CHECK
  // Check if activities differ in crowd levels
  let crowdDensityDiffers = false;

  const crowdLevels = new Set<string>();
  for (const activity of activities) {
    crowdLevels.add(activity.crowdLevel);
  }

  // Meaningful difference: activities span multiple crowd levels
  crowdDensityDiffers = crowdLevels.size >= 2;

  // 3. ENERGY DEMAND DIFFERENCE CHECK
  // Check if activities differ in physical effort/energy requirements
  let energyDemandDiffers = false;

  const physicalEfforts = new Set<string>();
  for (const activity of activities) {
    physicalEfforts.add(activity.physicalEffort);
  }

  // Meaningful difference: activities span multiple effort levels
  energyDemandDiffers = physicalEfforts.size >= 2;

  // 4. RIGIDITY DIFFERENCE CHECK
  // Check if activities differ in flexibility/rigidity (timingSensitivity, constraints, durationSlots)
  let rigidityDiffers = false;

  // Check timingSensitivity variation (already computed above)
  const hasLowSensitivity = timingSensitivities.has('low');
  const hasHighSensitivity = timingSensitivities.has('high');

  // Check constraints variation
  const hasConstraints = activities.some(a => 
    a.constraints?.requiresDaylight === true || 
    a.constraints?.weatherDependent === true
  );
  const hasNoConstraints = activities.some(a => 
    !a.constraints?.requiresDaylight && 
    !a.constraints?.weatherDependent
  );

  // Check durationSlots variation
  const durationSlots = new Set<number>();
  for (const activity of activities) {
    durationSlots.add(activity.durationSlots);
  }

  // Meaningful difference: mix of low/high sensitivity, OR mix of constrained/unconstrained, OR different durations
  rigidityDiffers = 
    (hasLowSensitivity && hasHighSensitivity) || // Mix of flexible and rigid timing
    (hasConstraints && hasNoConstraints) || // Mix of constrained and unconstrained
    durationSlots.size >= 2; // Different duration requirements

  return {
    timingFit: timingFitDiffers,
    crowdDensity: crowdDensityDiffers,
    energyDemand: energyDemandDiffers,
    rigidity: rigidityDiffers,
  };
}

/**
 * Check if AI guidance should proceed based on meaningful differences
 * 
 * Only proceeds if 2+ dimensions show meaningful differences
 * 
 * @param differences Result from computeActivityMeaningfulDifferences
 * @returns true if AI should proceed (2+ dimensions differ)
 */
export function shouldProceedWithAI(
  differences: { timingFit: boolean; crowdDensity: boolean; energyDemand: boolean; rigidity: boolean }
): boolean {
  const count = [
    differences.timingFit,
    differences.crowdDensity,
    differences.energyDemand,
    differences.rigidity,
  ].filter(Boolean).length;
  return count >= 2;
}

/**
 * Derive fatigue risk from physical effort and duration
 * 
 * @param physicalEffort Physical effort level
 * @param durationSlots Duration slots (1 = ~2-3 hours, 2 = ~4-6 hours)
 * @returns Risk level based on effort and duration combination
 */
function deriveFatigueRisk(
  physicalEffort: 'low' | 'medium' | 'high',
  durationSlots: 1 | 2
): 'low' | 'medium' | 'high' {
  // High effort + long duration = high fatigue risk
  if (physicalEffort === 'high' && durationSlots === 2) {
    return 'high';
  }
  
  // High effort + short duration OR medium effort + long duration = medium risk
  if (
    (physicalEffort === 'high' && durationSlots === 1) ||
    (physicalEffort === 'medium' && durationSlots === 2)
  ) {
    return 'medium';
  }
  
  // Medium effort + short duration = medium risk
  if (physicalEffort === 'medium' && durationSlots === 1) {
    return 'medium';
  }
  
  // Low effort (any duration) = low fatigue risk
  return 'low';
}

/**
 * Derive crowd stress from crowd level
 * 
 * @param crowdLevel Crowd level
 * @returns Stress level (direct mapping)
 */
function deriveCrowdStress(
  crowdLevel: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  // Direct mapping: crowd level = stress level
  return crowdLevel;
}

/**
 * Derive flexibility risk from timing sensitivity
 * 
 * @param timingSensitivity Timing sensitivity level
 * @returns Risk level (inverse of flexibility: high sensitivity = high risk)
 */
function deriveFlexibilityRisk(
  timingSensitivity: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  // Inverse relationship: high sensitivity = high flexibility risk (less flexible)
  return timingSensitivity;
}

/**
 * Derive weather exposure from environment and constraints
 * 
 * @param environment Activity environment
 * @param constraints Activity constraints
 * @returns Exposure level based on environment and weather dependency
 */
function deriveWeatherExposure(
  environment: 'indoor' | 'outdoor' | 'mixed',
  constraints?: { requiresDaylight?: boolean; weatherDependent?: boolean }
): 'low' | 'medium' | 'high' {
  // High exposure: outdoor + weather dependent
  if (environment === 'outdoor' && constraints?.weatherDependent === true) {
    return 'high';
  }
  
  // Medium exposure: outdoor (without weather dependency) OR mixed + weather dependent
  if (
    (environment === 'outdoor' && constraints?.weatherDependent !== true) ||
    (environment === 'mixed' && constraints?.weatherDependent === true)
  ) {
    return 'medium';
  }
  
  // Low exposure: indoor OR mixed without weather dependency
  if (environment === 'indoor' || (environment === 'mixed' && constraints?.weatherDependent !== true)) {
    return 'low';
  }
  
  // Default to low if unclear
  return 'low';
}

/**
 * Activity travel signals type
 */
export type ActivityTravelSignals = {
  fatigueRisk: 'low' | 'medium' | 'high';
  crowdStress: 'low' | 'medium' | 'high';
  flexibilityRisk: 'low' | 'medium' | 'high';
  weatherExposure: 'low' | 'medium' | 'high';
};

/**
 * Aggregate human travel signals across all activities
 * Returns the most common (mode) or most severe signal
 * 
 * @param activities Array of activity options
 * @returns Aggregated travel signals
 */
export function aggregateActivityTravelSignals(
  activities: GeneratedActivity[]
): ActivityTravelSignals {
  if (activities.length === 0) {
    return {
      fatigueRisk: 'low',
      crowdStress: 'low',
      flexibilityRisk: 'low',
      weatherExposure: 'low',
    };
  }

  const fatigueRiskSignals: Array<'low' | 'medium' | 'high'> = [];
  const crowdStressSignals: Array<'low' | 'medium' | 'high'> = [];
  const flexibilityRiskSignals: Array<'low' | 'medium' | 'high'> = [];
  const weatherExposureSignals: Array<'low' | 'medium' | 'high'> = [];

  for (const activity of activities) {
    // Fatigue risk from physical effort + duration
    fatigueRiskSignals.push(
      deriveFatigueRisk(activity.physicalEffort, activity.durationSlots)
    );

    // Crowd stress from crowd level
    crowdStressSignals.push(deriveCrowdStress(activity.crowdLevel));

    // Flexibility risk from timing sensitivity
    flexibilityRiskSignals.push(deriveFlexibilityRisk(activity.timingSensitivity));

    // Weather exposure from environment + constraints
    weatherExposureSignals.push(
      deriveWeatherExposure(activity.environment, activity.constraints)
    );
  }

  // Aggregate: Use mode (most common) for each signal
  // For severity-ordered signals, prefer the more severe if tied
  const getMode = <T extends string>(signals: T[], severityOrder?: T[]): T => {
    const counts = new Map<T, number>();
    for (const signal of signals) {
      counts.set(signal, (counts.get(signal) || 0) + 1);
    }
    
    let maxCount = 0;
    let mode: T = signals[0];
    
    for (const [signal, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mode = signal;
      } else if (count === maxCount && severityOrder) {
        // If tied, prefer more severe
        const currentIdx = severityOrder.indexOf(mode);
        const candidateIdx = severityOrder.indexOf(signal);
        if (candidateIdx > currentIdx) {
          mode = signal;
        }
      }
    }
    
    return mode;
  };

  return {
    fatigueRisk: getMode(fatigueRiskSignals, ['low', 'medium', 'high']),
    crowdStress: getMode(crowdStressSignals, ['low', 'medium', 'high']),
    flexibilityRisk: getMode(flexibilityRiskSignals, ['low', 'medium', 'high']),
    weatherExposure: getMode(weatherExposureSignals, ['low', 'medium', 'high']),
  };
}

/**
 * Context for slot- and day-aware activity resolution
 */
export type ActivityResolutionContext = {
  slot: 'day' | 'night';
  date: string;
  dayActivities: {
    day?: { id: string; name: string };
    night?: { id: string; name: string };
  };
  // Full activity details for existing activities (for energy balancing)
  existingActivityDetails?: GeneratedActivity[];
};

/**
 * Resolve activity selection based on priority
 * 
 * Deterministically selects exactly one activity per slot based on priority:
 * - timingFit: Activities that fit naturally into schedule (flexible timing, low sensitivity)
 * - crowdDensity: Activities with lower crowd levels for relaxed experience
 * - energyDemand: Activities that match energy level (low effort for relaxed pace, high effort for packed pace)
 * - rigidity: Activities with flexible timing vs those requiring specific timing/conditions
 * 
 * Now slot- and day-aware:
 * - Slot compatibility: Penalizes activities that don't fit the selected slot
 * - Intra-day energy balancing: Penalizes high+high effort or long+long duration on same day
 * 
 * @param priority Selected priority
 * @param activities Array of activity options
 * @param pace Optional trip pace (used for energyDemand priority)
 * @param excludeActivityIds Optional array of activity IDs to exclude (for ensuring distinct recommendations)
 * @param context Optional context for slot- and day-aware scoring
 * @returns Selected activity ID or null if no suitable activity found
 */
export function resolveActivityByPriority(
  priority: 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity',
  activities: GeneratedActivity[],
  pace?: 'relaxed' | 'moderate' | 'packed',
  excludeActivityIds: string[] = [],
  context?: ActivityResolutionContext
): {
  activityId: string;
  priorityUsed: 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity';
} | null {
  if (activities.length === 0) {
    return null;
  }

  // Filter out excluded activities
  const availableActivities = activities.filter(
    activity => !excludeActivityIds.includes(activity.id)
  );

  if (availableActivities.length === 0) {
    return null; // No valid alternatives after exclusion
  }

  /**
   * Compute slot compatibility score (additive penalty/bonus)
   * Returns a score adjustment: negative = bonus, positive = penalty
   */
  const computeSlotCompatibilityScore = (activity: GeneratedActivity): number => {
    if (!context) return 0;

    const slot = context.slot;
    const dayTimeSlots = ['early_morning', 'morning', 'afternoon'];
    const nightTimeSlots = ['evening', 'night'];

    const hasDayTimes = activity.bestTime.some(time => dayTimeSlots.includes(time));
    const hasNightTimes = activity.bestTime.some(time => nightTimeSlots.includes(time));

    if (slot === 'day') {
      // Penalize if activity only supports night times
      if (!hasDayTimes && hasNightTimes) {
        return 50; // Penalty for night-only activity in day slot
      }
      // Bonus if activity explicitly supports day times
      if (hasDayTimes) {
        return -10; // Bonus for day-compatible activity
      }
    } else if (slot === 'night') {
      // Penalize if activity only supports day times
      if (hasDayTimes && !hasNightTimes) {
        return 50; // Penalty for day-only activity in night slot
      }
      // Bonus if activity explicitly supports night times
      if (hasNightTimes) {
        return -10; // Bonus for night-compatible activity
      }
    }

    return 0; // Neutral if activity supports both or unclear
  };

  /**
   * Compute intra-day energy balancing score (additive penalty/bonus)
   * Returns a score adjustment: negative = bonus, positive = penalty
   * Only considers activities from the OTHER slot (not the current slot being selected)
   */
  const computeEnergyBalancingScore = (activity: GeneratedActivity): number => {
    if (!context || !context.existingActivityDetails || context.existingActivityDetails.length === 0) {
      return 0; // No existing activities, no balancing needed
    }

    // Filter to only consider activities from the OTHER slot
    const otherSlot = context.slot === 'day' ? 'night' : 'day';
    const otherSlotActivityId = otherSlot === 'day' 
      ? context.dayActivities.day?.id 
      : context.dayActivities.night?.id;

    if (!otherSlotActivityId) {
      return 0; // No activity in the other slot, no balancing needed
    }

    // Find the other slot's activity details
    const otherSlotActivity = context.existingActivityDetails.find(
      existing => existing.id === otherSlotActivityId
    );

    if (!otherSlotActivity) {
      return 0; // Couldn't find full details for other slot activity
    }

    let score = 0;

    // Check for high + high effort on same day
    if (otherSlotActivity.physicalEffort === 'high' && activity.physicalEffort === 'high') {
      score += 40; // Penalty for high + high effort
    } else if (otherSlotActivity.physicalEffort === 'high' && activity.physicalEffort === 'low') {
      score -= 15; // Bonus for high + low (complementary pairing)
    }

    // Check for long + long duration on same day
    if (otherSlotActivity.durationSlots === 2 && activity.durationSlots === 2) {
      score += 30; // Penalty for long + long duration
    } else if (otherSlotActivity.durationSlots === 2 && activity.durationSlots === 1) {
      score -= 10; // Bonus for long + short (complementary pairing)
    }

    return score;
  };

  if (priority === 'timingFit') {
    // Prefer activities with flexible timing (low sensitivity, flexible reason)
    let bestActivity: GeneratedActivity | null = null;
    let bestScore = Number.MAX_SAFE_INTEGER; // Lower score = better

    for (const activity of availableActivities) {
      let score = 0;

      // Lower sensitivity = better fit (lower score)
      if (activity.timingSensitivity === 'high') {
        score += 100; // Penalty for high sensitivity
      } else if (activity.timingSensitivity === 'medium') {
        score += 50; // Medium penalty
      }
      // Low sensitivity = 0 penalty

      // Flexible timing reason = better fit
      if (activity.timingReason !== 'flexible') {
        score += 30; // Penalty for constrained timing
      }

      // Prefer activities with multiple bestTime options (more flexible)
      const timeOptionsCount = activity.bestTime.length;
      score -= timeOptionsCount * 5; // Bonus for more time options (subtract from score)

      // Add slot compatibility and energy balancing scores
      score += computeSlotCompatibilityScore(activity);
      score += computeEnergyBalancingScore(activity);

      if (score < bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    // Fallback: if no activity selected (shouldn't happen), return first available
    if (!bestActivity && availableActivities.length > 0) {
      bestActivity = availableActivities[0];
    }

    if (bestActivity) {
      return {
        activityId: bestActivity.id,
        priorityUsed: 'timingFit',
      };
    }
  } else if (priority === 'crowdDensity') {
    // Prefer activities with lower crowd levels
    let bestActivity: GeneratedActivity | null = null;
    let bestScore = Number.MAX_SAFE_INTEGER; // Lower score = better

    for (const activity of availableActivities) {
      let score = 0;

      // Lower crowd level = better (lower score)
      if (activity.crowdLevel === 'high') {
        score = 100; // High penalty for high crowds
      } else if (activity.crowdLevel === 'medium') {
        score = 50; // Medium penalty
      } else {
        score = 0; // Low crowds = best
      }

      // Add slot compatibility and energy balancing scores
      score += computeSlotCompatibilityScore(activity);
      score += computeEnergyBalancingScore(activity);

      if (score < bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    // Fallback: if no activity selected (shouldn't happen), return first available
    if (!bestActivity && availableActivities.length > 0) {
      bestActivity = availableActivities[0];
    }

    if (bestActivity) {
      return {
        activityId: bestActivity.id,
        priorityUsed: 'crowdDensity',
      };
    }
  } else if (priority === 'energyDemand') {
    // Prefer activities that match energy level based on pace
    let bestActivity: GeneratedActivity | null = null;
    let bestScore = -1; // Higher score = better

    // Determine target effort level based on pace
    const targetEffort: 'low' | 'medium' | 'high' = 
      pace === 'relaxed' ? 'low' :
      pace === 'packed' ? 'high' :
      'medium'; // moderate pace = medium effort

    for (const activity of availableActivities) {
      let score = 0;

      // Match target effort level
      if (activity.physicalEffort === targetEffort) {
        score = 100; // Perfect match
      } else {
        // Partial match: adjacent effort levels get partial score
        const effortOrder: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
        const targetIdx = effortOrder.indexOf(targetEffort);
        const activityIdx = effortOrder.indexOf(activity.physicalEffort);
        const distance = Math.abs(targetIdx - activityIdx);
        
        if (distance === 1) {
          score = 50; // One level away = partial match
        } else {
          score = 0; // Two levels away = poor match
        }
      }

      // Bonus for shorter duration (less fatigue)
      if (activity.durationSlots === 1) {
        score += 10; // Bonus for shorter activities
      }

      // Add slot compatibility and energy balancing scores
      // Note: For energyDemand, these are penalties (subtract from score) or bonuses (add to score)
      const slotScore = computeSlotCompatibilityScore(activity);
      const energyScore = computeEnergyBalancingScore(activity);
      // Convert to additive: negative slot/energy scores become bonuses, positive become penalties
      score -= slotScore; // Invert because lower slotScore is better
      score -= energyScore; // Invert because lower energyScore is better

      if (score > bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    // Fallback: if no good match, pick first available activity
    if (!bestActivity && availableActivities.length > 0) {
      bestActivity = availableActivities[0];
    }

    if (bestActivity) {
      return {
        activityId: bestActivity.id,
        priorityUsed: 'energyDemand',
      };
    }
  } else if (priority === 'rigidity') {
    // Prefer activities with flexible timing (low sensitivity, no constraints)
    let bestActivity: GeneratedActivity | null = null;
    let bestScore = Number.MAX_SAFE_INTEGER; // Lower score = better (more flexible)

    for (const activity of availableActivities) {
      let score = 0;

      // Lower sensitivity = more flexible (lower score)
      if (activity.timingSensitivity === 'high') {
        score += 100; // Heavy penalty for high sensitivity
      } else if (activity.timingSensitivity === 'medium') {
        score += 50; // Medium penalty
      }
      // Low sensitivity = 0 penalty

      // Constraints = less flexible
      if (activity.constraints?.requiresDaylight === true) {
        score += 50; // Penalty for daylight requirement
      }
      if (activity.constraints?.weatherDependent === true) {
        score += 50; // Penalty for weather dependency
      }

      // Longer duration = less flexible (harder to fit in schedule)
      if (activity.durationSlots === 2) {
        score += 20; // Penalty for long duration
      }

      // Flexible timing reason = bonus (subtract from score)
      if (activity.timingReason === 'flexible') {
        score -= 30; // Bonus for flexible timing
      }

      // Add slot compatibility and energy balancing scores
      score += computeSlotCompatibilityScore(activity);
      score += computeEnergyBalancingScore(activity);

      if (score < bestScore) {
        bestScore = score;
        bestActivity = activity;
      }
    }

    // Fallback: if no activity selected (shouldn't happen), return first available
    if (!bestActivity && availableActivities.length > 0) {
      bestActivity = availableActivities[0];
    }

    if (bestActivity) {
      return {
        activityId: bestActivity.id,
        priorityUsed: 'rigidity',
      };
    }
  }

  return null;
}
