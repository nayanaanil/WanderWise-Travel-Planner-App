/**
 * Hotel Tradeoff Rules
 * 
 * Determines relevant tension dimensions for hotel selection based on user profile.
 * Returns the top 2 most relevant tradeoffs to help users make decisions.
 */

export type TensionDimension = 'location' | 'space' | 'price' | 'vibe';

export type TensionPole = {
  location: 'central' | 'quiet';
  space: 'together' | 'separate';
  price: 'save' | 'spend';
  vibe: 'authentic' | 'reliable';
};

export interface TensionResult {
  dimension: TensionDimension;
  poleA: { id: string; label: string; description: string };
  poleB: { id: string; label: string; description: string };
}

export interface UserProfile {
  pace: 'relaxed' | 'moderate' | 'packed';
  interests: string[];
  budget: 'budget' | 'moderate' | 'premium' | 'luxury';
  groupSize: number;
}

/**
 * Pole labels and descriptions for each dimension
 */
const POLE_DEFINITIONS: Record<TensionDimension, {
  poleA: { id: string; label: string; description: string };
  poleB: { id: string; label: string; description: string };
}> = {
  location: {
    poleA: {
      id: 'central',
      label: 'Near the action',
      description: 'Walk to attractions, restaurants, and nightlife',
    },
    poleB: {
      id: 'quiet',
      label: 'Quiet retreat',
      description: 'Peaceful area, better sleep, local neighborhood',
    },
  },
  space: {
    poleA: {
      id: 'together',
      label: 'Together',
      description: 'One room that fits your whole group',
    },
    poleB: {
      id: 'separate',
      label: 'Separate but cheaper',
      description: 'Multiple rooms at lower total cost',
    },
  },
  price: {
    poleA: {
      id: 'save',
      label: 'Save for experiences',
      description: 'Basic hotel, more budget for food and activities',
    },
    poleB: {
      id: 'spend',
      label: 'Comfortable base',
      description: 'Better amenities, worth the extra cost',
    },
  },
  vibe: {
    poleA: {
      id: 'authentic',
      label: 'Boutique & unique',
      description: 'Local character, Instagram-worthy, memorable',
    },
    poleB: {
      id: 'reliable',
      label: 'Reliable & full-service',
      description: 'Trusted brand, pool, gym, consistent quality',
    },
  },
};

/**
 * Rule definition with weight, condition, dimension, and pole
 */
interface Rule {
  weight: number;
  condition: (profile: UserProfile) => boolean;
  dimension: TensionDimension;
  pole: string; // 'central' | 'quiet' | 'together' | 'separate' | 'save' | 'spend' | 'authentic' | 'reliable'
}

/**
 * All rules in priority order (higher weight = more important)
 */
const RULES: Rule[] = [
  // Weight 100: groupSize >= 4 → space
  {
    weight: 100,
    condition: (profile) => profile.groupSize >= 4,
    dimension: 'space',
    pole: 'together',
  },
  // Weight 90: groupSize === 3 AND budget !== 'luxury' → space
  {
    weight: 90,
    condition: (profile) => profile.groupSize === 3 && profile.budget !== 'luxury',
    dimension: 'space',
    pole: 'together',
  },
  // Weight 85: budget === 'budget' → price
  {
    weight: 85,
    condition: (profile) => profile.budget === 'budget',
    dimension: 'price',
    pole: 'save',
  },
  // Weight 80: interests includes 'foodie' → location (central)
  {
    weight: 80,
    condition: (profile) => profile.interests.includes('foodie'),
    dimension: 'location',
    pole: 'central',
  },
  // Weight 80: interests includes 'shopping' → location (central)
  {
    weight: 80,
    condition: (profile) => profile.interests.includes('shopping'),
    dimension: 'location',
    pole: 'central',
  },
  // Weight 75: interests includes 'culture' → location (central)
  {
    weight: 75,
    condition: (profile) => profile.interests.includes('culture'),
    dimension: 'location',
    pole: 'central',
  },
  // Weight 75: pace === 'packed' → location (central)
  {
    weight: 75,
    condition: (profile) => profile.pace === 'packed',
    dimension: 'location',
    pole: 'central',
  },
  // Weight 70: interests includes 'relaxation' → location (quiet)
  {
    weight: 70,
    condition: (profile) => profile.interests.includes('relaxation'),
    dimension: 'location',
    pole: 'quiet',
  },
  // Weight 70: interests includes 'photography' AND pace === 'relaxed' → location (quiet)
  {
    weight: 70,
    condition: (profile) => profile.interests.includes('photography') && profile.pace === 'relaxed',
    dimension: 'location',
    pole: 'quiet',
  },
  // Weight 65: pace === 'relaxed' → location (quiet)
  {
    weight: 65,
    condition: (profile) => profile.pace === 'relaxed',
    dimension: 'location',
    pole: 'quiet',
  },
  // Weight 60: budget === 'luxury' → vibe (reliable)
  {
    weight: 60,
    condition: (profile) => profile.budget === 'luxury',
    dimension: 'vibe',
    pole: 'reliable',
  },
  // Weight 55: budget === 'premium' → vibe
  {
    weight: 55,
    condition: (profile) => profile.budget === 'premium',
    dimension: 'vibe',
    pole: 'reliable', // Premium typically leans reliable, but could be flexible
  },
  // Weight 50: interests includes 'adventure' → price (save)
  {
    weight: 50,
    condition: (profile) => profile.interests.includes('adventure'),
    dimension: 'price',
    pole: 'save',
  },
  // Weight 45: groupSize === 1 AND budget !== 'budget' → vibe (authentic)
  {
    weight: 45,
    condition: (profile) => profile.groupSize === 1 && profile.budget !== 'budget',
    dimension: 'vibe',
    pole: 'authentic',
  },
];

/**
 * Selects the top 2 most relevant tension dimensions based on user profile.
 * 
 * If multiple rules point to the same dimension with different poles,
 * that dimension becomes a tradeoff (both poles shown).
 * 
 * @param profile User profile with pace, interests, budget, and group size
 * @returns Array of up to 2 tension results with human-readable labels
 */
export function selectRelevantTensions(profile: UserProfile): TensionResult[] {
  // Track scores and poles for each dimension
  type DimensionScore = {
    dimension: TensionDimension;
    totalScore: number;
    poles: Set<string>;
  };

  const dimensionScores = new Map<TensionDimension, DimensionScore>();

  // Apply all matching rules
  for (const rule of RULES) {
    if (rule.condition(profile)) {
      const existing = dimensionScores.get(rule.dimension);
      if (existing) {
        existing.totalScore += rule.weight;
        existing.poles.add(rule.pole);
      } else {
        dimensionScores.set(rule.dimension, {
          dimension: rule.dimension,
          totalScore: rule.weight,
          poles: new Set([rule.pole]),
        });
      }
    }
  }

  // Convert to array and sort by total score (descending)
  const scoredDimensions = Array.from(dimensionScores.values())
    .sort((a, b) => b.totalScore - a.totalScore);

  // Select top 2 dimensions
  const topDimensions = scoredDimensions.slice(0, 2);

  // Build tension results
  const results: TensionResult[] = [];

  for (const scored of topDimensions) {
    const poleDefs = POLE_DEFINITIONS[scored.dimension];
    const poles = Array.from(scored.poles);

    // If dimension has both poles (tradeoff), show both
    // Otherwise, show the matched pole vs. the opposite pole
    if (poles.length >= 2) {
      // Tradeoff: show both poles
      // Determine which pole is poleA and which is poleB based on dimension
      const poleAId = poleDefs.poleA.id;
      const poleBId = poleDefs.poleB.id;

      results.push({
        dimension: scored.dimension,
        poleA: poleDefs.poleA,
        poleB: poleDefs.poleB,
      });
    } else if (poles.length === 1) {
      // Single pole matched: show matched pole as poleA, opposite as poleB
      const matchedPole = poles[0];
      const isPoleA = matchedPole === poleDefs.poleA.id;

      results.push({
        dimension: scored.dimension,
        poleA: isPoleA ? poleDefs.poleA : poleDefs.poleB,
        poleB: isPoleA ? poleDefs.poleB : poleDefs.poleA,
      });
    }
  }

  return results;
}
