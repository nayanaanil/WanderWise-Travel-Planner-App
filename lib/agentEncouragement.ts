/**
 * Deterministic encouragement copy for agent-assisted decisions
 * Progressive trust system without AI calls
 */

export type AgentPriority = 
  | 'price' | 'arrival' | 'layover' // Flight priorities
  | 'fit' | 'comfort' | 'availability' // Hotel priorities
  | 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity'; // Activity priorities

export type AgentDomain = 'flight' | 'hotel' | 'activity';

/**
 * Get encouragement message based on priority and success count
 * Returns null if no message should be shown
 */
export function getEncouragementMessage(
  domain: AgentDomain,
  priority: AgentPriority,
  successCount: number
): string | null {
  // Base messages (first 2 successes)
  const baseMessages: Record<AgentDomain, Record<string, string>> = {
    flight: {
      price: 'Good call. This avoids unnecessary spending.',
      arrival: 'Nice choice — this should make your first day much smoother.',
      layover: 'Good call. This avoids a lot of unnecessary waiting.',
    },
    hotel: {
      fit: 'Nice choice — this keeps your itinerary on track.',
      comfort: 'Good call. This should work well for your group.',
      availability: 'Nice choice — this reduces booking stress.',
    },
    activity: {
      timingFit: 'Good call. This fits naturally into your schedule.',
      crowdDensity: 'Nice choice — this should be more relaxed.',
      energyDemand: 'Good call. This matches your energy level.',
      rigidity: 'Nice choice — this keeps your schedule flexible.',
    },
  };

  // Stronger messages (after 2+ successes)
  const strongerMessages: Record<AgentDomain, Record<string, string>> = {
    flight: {
      price: 'Smart move. This keeps your budget in check.',
      arrival: 'Great choice. Your first day will be much more productive.',
      layover: 'Smart move. You\'ll spend less time waiting around.',
    },
    hotel: {
      fit: 'Great choice. Your itinerary stays intact.',
      comfort: 'Smart move. This should work perfectly for your group.',
      availability: 'Great choice. This minimizes booking uncertainty.',
    },
    activity: {
      timingFit: 'Smart move. This slots in naturally.',
      crowdDensity: 'Great choice. This should be much more peaceful.',
      energyDemand: 'Smart move. This matches your pace well.',
      rigidity: 'Great choice. This keeps your options open.',
    },
  };

  const messages = successCount >= 2 ? strongerMessages : baseMessages;
  return messages[domain]?.[priority] || null;
}

/**
 * Get the "I'll keep an eye out" message (shown after 4+ successes)
 */
export function getWatchfulMessage(): string {
  return 'I\'ll keep an eye out for similar decisions ahead.';
}

/**
 * Check if watchful message has already been shown in this session
 */
export function hasWatchfulMessageBeenShown(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('watchfulMessageShown') === 'true';
}

/**
 * Mark watchful message as shown in this session
 */
export function markWatchfulMessageAsShown(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('watchfulMessageShown', 'true');
}

/**
 * Check if watchful message should be shown (after 4+ successes and not yet shown)
 */
export function shouldShowWatchfulMessage(successCount: number): boolean {
  return successCount >= 4 && !hasWatchfulMessageBeenShown();
}

/**
 * Track successful agent-assisted decision
 * Increments the counter in tripState
 */
export function trackAgentDecisionSuccess(): number {
  if (typeof window === 'undefined') return 0;
  
  const { getTripState, saveTripState } = require('@/lib/tripState');
  const tripState = getTripState();
  const currentCount = tripState.agentDecisionSuccessCount || 0;
  const newCount = currentCount + 1;
  
  saveTripState({
    agentDecisionSuccessCount: newCount,
  });
  
  return newCount;
}

/**
 * Get current agent decision success count
 */
export function getAgentDecisionSuccessCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const { getTripState } = require('@/lib/tripState');
  const tripState = getTripState();
  return tripState.agentDecisionSuccessCount || 0;
}
