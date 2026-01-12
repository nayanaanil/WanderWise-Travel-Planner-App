/**
 * Activity Ranking Utility
 * 
 * Deterministic ranking and labeling of activities based on AI-generated metadata.
 * 
 * NO AI calls. NO mutations. Pure function only.
 * 
 * Ranking is computed at read-time and NOT persisted to storage.
 */

// Import the GeneratedActivity type from the API route
export type GeneratedActivity = {
  id: string;
  city: string;
  name: string;
  description: string;
  bestTime: Array<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>;
  timingSensitivity: 'low' | 'medium' | 'high';
  timingReason: 'crowds' | 'lighting' | 'opening_hours' | 'weather' | 'access' | 'experience_quality' | 'flexible';
  durationSlots: 1 | 2;
  environment: 'indoor' | 'outdoor' | 'mixed';
  crowdLevel: 'low' | 'medium' | 'high';
  physicalEffort: 'low' | 'medium' | 'high';
  constraints?: {
    requiresDaylight?: boolean;
    weatherDependent?: boolean;
  };
  interestTags: string[];
  relevanceScore: 1 | 2 | 3 | 4 | 5;
  relevanceReason: 'matches_interest' | 'iconic' | 'hidden_gem' | 'good_pace_fit';
  isIconic?: boolean;
  tags: {
    bestTime: Array<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>;
    durationSlots: 1 | 2;
    vibe: 'relaxed' | 'cultural' | 'adventurous' | 'social';
    crowdLevel: 'low' | 'medium' | 'high';
  };
};

export type RankedActivity = GeneratedActivity & {
  rankScore: number;
  label?: 'must_see' | 'great_fit';
};

/**
 * Compute rank score for a single activity
 * 
 * Base score: relevanceScore * 10
 * Bonuses:
 * - +8 if relevanceReason === 'matches_interest'
 * - +5 if isIconic === true
 * - +2 for each overlap between interestTags and userInterests
 * 
 * @param activity Activity to rank
 * @param userInterests User's interest tags (normalized to lowercase)
 * @returns Rank score (higher is better)
 */
function computeRankScore(
  activity: GeneratedActivity,
  userInterests: string[]
): number {
  // Base score from AI relevance score
  let rankScore = activity.relevanceScore * 10;
  
  // Bonus for matching user interests (from AI)
  if (activity.relevanceReason === 'matches_interest') {
    rankScore += 8;
  }
  
  // Bonus for iconic experiences
  if (activity.isIconic === true) {
    rankScore += 5;
  }
  
  // Bonus for interest tag overlap (direct match)
  // Normalize both activity tags and user interests to lowercase for comparison
  const normalizedActivityTags = activity.interestTags.map(tag => tag.toLowerCase().trim());
  const normalizedUserInterests = userInterests.map(interest => interest.toLowerCase().trim());
  
  const overlap = normalizedActivityTags.filter(tag =>
    normalizedUserInterests.includes(tag)
  ).length;
  
  rankScore += overlap * 2;
  
  return rankScore;
}

/**
 * Rank and label activities deterministically
 * 
 * PURE FUNCTION - no side effects, no mutations, no AI calls
 * 
 * @param activities Array of AI-generated activities
 * @param userInterests Array of user interest strings (e.g., ['food', 'photography'])
 * @returns Sorted array of activities with rankScore and optional label
 */
export function rankActivities(
  activities: GeneratedActivity[],
  userInterests: string[] = []
): RankedActivity[] {
  // Guard: empty activities
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Step 1: Compute rank scores
  const activitiesWithScores: Array<GeneratedActivity & { rankScore: number }> = activities.map(activity => ({
    ...activity,
    rankScore: computeRankScore(activity, userInterests),
  }));
  
  // Step 2: Sort by rank score DESC (highest first)
  const sorted = activitiesWithScores.sort((a, b) => b.rankScore - a.rankScore);
  
  // Step 3: Assign labels (scarce and consistent)
  const labeled: RankedActivity[] = sorted.map((activity, index) => {
    let label: 'must_see' | 'great_fit' | undefined;
    
    if (index < 2) {
      // Top 2 activities
      label = 'must_see';
    } else if (index < 4) {
      // Next 2 activities
      label = 'great_fit';
    }
    // All others: no label
    
    return {
      ...activity,
      label,
    };
  });
  
  return labeled;
}

/**
 * Get human-readable label text
 * 
 * @param label Label enum value
 * @returns Display text for UI
 */
export function getLabelText(label: 'must_see' | 'great_fit'): string {
  switch (label) {
    case 'must_see':
      return 'Must-see for you';
    case 'great_fit':
      return 'Great fit';
    default:
      return '';
  }
}

/**
 * Get label badge styling (for UI consistency)
 * 
 * @param label Label enum value
 * @returns Tailwind classes for badge styling
 */
export function getLabelBadgeClasses(label: 'must_see' | 'great_fit'): string {
  switch (label) {
    case 'must_see':
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    case 'great_fit':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    default:
      return '';
  }
}


