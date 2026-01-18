/**
 * AI Activity Generation API v2
 * 
 * POST /api/agent/generate-activities
 * 
 * Generates planning activities for a city with structured, rich metadata.
 * Activities are NOT bookable tickets - this is for itinerary planning only.
 * 
 * CHANGES IN V2:
 * - Expanded metadata (timing sensitivity, constraints, environment, etc.)
 * - Personalization based on user interests
 * - Relevance scoring
 * - Balanced mix: 60-70% interest-aligned, 30-40% exploratory/iconic
 * 
 * Rules:
 * - Generate 5-8 realistic, well-known activities per city
 * - Activities must reflect real-world timing
 * - No hallucinated booking info, prices, or exact opening hours
 * - Deterministic IDs (slugified name + city)
 * - Cached by city + pace + userContext
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions
type BestTime = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
type TimingSensitivity = 'low' | 'medium' | 'high';
type TimingReason = 'crowds' | 'lighting' | 'opening_hours' | 'weather' | 'access' | 'experience_quality' | 'flexible';
type Environment = 'indoor' | 'outdoor' | 'mixed';
type CrowdLevel = 'low' | 'medium' | 'high';
type PhysicalEffort = 'low' | 'medium' | 'high';
type Pace = 'relaxed' | 'moderate' | 'packed';
type DurationSlots = 1 | 2;
type RelevanceScore = 1 | 2 | 3 | 4 | 5;
type RelevanceReason = 'matches_interest' | 'iconic' | 'hidden_gem' | 'good_pace_fit';
type TripType = 'leisure' | 'romantic' | 'family' | 'adventure';

// V2: Expanded activity schema
export type GeneratedActivity = {
  id: string;
  city: string;
  name: string;
  description: string;
  
  // Timing & experience
  bestTime: BestTime[];
  timingSensitivity: TimingSensitivity;
  timingReason: TimingReason;
  durationSlots: DurationSlots;
  environment: Environment;
  crowdLevel: CrowdLevel;
  physicalEffort: PhysicalEffort;
  
  // Constraints (soft hints only)
  constraints?: {
    requiresDaylight?: boolean;
    weatherDependent?: boolean;
  };
  
  // Personalization & discovery
  interestTags: string[];
  relevanceScore: RelevanceScore;
  relevanceReason: RelevanceReason;
  isIconic?: boolean;
  
  // Legacy tags field for backward compatibility
  tags: {
    bestTime: BestTime[];
    durationSlots: DurationSlots;
    vibe: 'relaxed' | 'cultural' | 'adventurous' | 'social';
    crowdLevel: CrowdLevel;
  };
};

// V2: Extended request with user context
export type GenerateActivitiesRequest = {
  city: string;
  pace: Pace;
  userContext?: {
    interests?: string[];  // e.g. ['history', 'food', 'photography']
    groupSize?: number;
    tripType?: TripType;
  };
};

export type GenerateActivitiesResponse = {
  activities: GeneratedActivity[];
  isFallback?: boolean; // true for fallback responses, false for AI-generated
};

// In-memory cache for generated activities
// Key: SHA256 hash of city + pace + userContext
// Value: GeneratedActivity[]
const activitiesCache = new Map<string, GeneratedActivity[]>();

/**
 * Generate cache key from request parameters
 */
function generateCacheKey(city: string, pace: Pace, userContext?: any): string {
  const normalized = {
    city: city.toLowerCase().trim(),
    pace,
    userContext: userContext || {},
  };
  const jsonString = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Slugify a string for use in IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate deterministic ID from activity name and city
 */
function generateActivityId(name: string, city: string): string {
  const nameSlug = slugify(name);
  const citySlug = slugify(city);
  return `${nameSlug}-${citySlug}`;
}

/**
 * Validate enum values in an activity (V2)
 */
function validateActivity(activity: any, city: string): GeneratedActivity | null {
  // Validate required fields
  if (!activity.name || typeof activity.name !== 'string') {
    return null;
  }
  
  if (!activity.description || typeof activity.description !== 'string') {
    return null;
  }
  
  // Validate bestTime
  const validBestTimes: BestTime[] = ['early_morning', 'morning', 'afternoon', 'evening', 'night'];
  if (!Array.isArray(activity.bestTime) || activity.bestTime.length === 0) {
    return null;
  }
  
  const bestTime = activity.bestTime.filter((t: string) => validBestTimes.includes(t as BestTime));
  if (bestTime.length === 0) {
    return null;
  }
  
  // Validate timingSensitivity
  const validTimingSensitivity: TimingSensitivity[] = ['low', 'medium', 'high'];
  if (!validTimingSensitivity.includes(activity.timingSensitivity)) {
    return null;
  }
  
  // Validate timingReason
  const validTimingReasons: TimingReason[] = ['crowds', 'lighting', 'opening_hours', 'weather', 'access', 'experience_quality', 'flexible'];
  if (!validTimingReasons.includes(activity.timingReason)) {
    return null;
  }
  
  // Validate durationSlots
  const validDurationSlots: DurationSlots[] = [1, 2];
  if (!validDurationSlots.includes(activity.durationSlots)) {
    return null;
  }
  
  // Validate environment
  const validEnvironments: Environment[] = ['indoor', 'outdoor', 'mixed'];
  if (!validEnvironments.includes(activity.environment)) {
    return null;
  }
  
  // Validate crowdLevel
  const validCrowdLevels: CrowdLevel[] = ['low', 'medium', 'high'];
  if (!validCrowdLevels.includes(activity.crowdLevel)) {
    return null;
  }
  
  // Validate physicalEffort
  const validPhysicalEffort: PhysicalEffort[] = ['low', 'medium', 'high'];
  if (!validPhysicalEffort.includes(activity.physicalEffort)) {
    return null;
  }
  
  // Validate interestTags
  if (!Array.isArray(activity.interestTags) || activity.interestTags.length === 0) {
    return null;
  }
  
  // Validate relevanceScore
  const validRelevanceScores: RelevanceScore[] = [1, 2, 3, 4, 5];
  if (!validRelevanceScores.includes(activity.relevanceScore)) {
    return null;
  }
  
  // Validate relevanceReason
  const validRelevanceReasons: RelevanceReason[] = ['matches_interest', 'iconic', 'hidden_gem', 'good_pace_fit'];
  if (!validRelevanceReasons.includes(activity.relevanceReason)) {
    return null;
  }
  
  // Generate ID
  const id = generateActivityId(activity.name, city);
  
  // Map to legacy vibe for backward compatibility
  const primaryTag = activity.interestTags[0]?.toLowerCase() || 'cultural';
  let vibe: 'relaxed' | 'cultural' | 'adventurous' | 'social' = 'cultural';
  if (primaryTag.includes('relax') || primaryTag.includes('spa') || primaryTag.includes('beach')) {
    vibe = 'relaxed';
  } else if (primaryTag.includes('adventure') || primaryTag.includes('sport') || primaryTag.includes('hiking')) {
    vibe = 'adventurous';
  } else if (primaryTag.includes('nightlife') || primaryTag.includes('social') || primaryTag.includes('food')) {
    vibe = 'social';
  }
  
  return {
    id,
    city,
    name: activity.name.trim(),
    description: activity.description.trim(),
    bestTime: bestTime as BestTime[],
    timingSensitivity: activity.timingSensitivity as TimingSensitivity,
    timingReason: activity.timingReason as TimingReason,
    durationSlots: activity.durationSlots as DurationSlots,
    environment: activity.environment as Environment,
    crowdLevel: activity.crowdLevel as CrowdLevel,
    physicalEffort: activity.physicalEffort as PhysicalEffort,
    constraints: activity.constraints || {},
    interestTags: activity.interestTags.map((tag: string) => tag.trim()),
    relevanceScore: activity.relevanceScore as RelevanceScore,
    relevanceReason: activity.relevanceReason as RelevanceReason,
    isIconic: activity.isIconic || false,
    // Legacy tags field for backward compatibility
    tags: {
      bestTime: bestTime as BestTime[],
      durationSlots: activity.durationSlots as DurationSlots,
      vibe,
      crowdLevel: activity.crowdLevel as CrowdLevel,
    },
  };
}

/**
 * Generate fallback activities (V2 with expanded metadata)
 */
function getFallbackActivities(city: string, pace: Pace): GeneratedActivity[] {
  const cityLower = city.toLowerCase();
  
  // Expanded fallback activities (6-8 activities) with variety
  const genericActivities = [
    {
      name: 'City Center Walking Tour',
      description: 'Explore the main attractions and landmarks of the city on foot.',
      bestTime: ['morning', 'afternoon'] as BestTime[],
      timingSensitivity: 'low' as TimingSensitivity,
      timingReason: 'flexible' as TimingReason,
      durationSlots: 2 as DurationSlots,
      environment: 'outdoor' as Environment,
      crowdLevel: 'medium' as CrowdLevel,
      physicalEffort: 'medium' as PhysicalEffort,
      interestTags: ['culture', 'history', 'architecture'],
      relevanceScore: 4 as RelevanceScore,
      relevanceReason: 'iconic' as RelevanceReason,
      isIconic: true,
    },
    {
      name: 'Local Market Visit',
      description: 'Experience local culture and cuisine at a traditional market.',
      bestTime: ['morning', 'afternoon'] as BestTime[],
      timingSensitivity: 'medium' as TimingSensitivity,
      timingReason: 'opening_hours' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'mixed' as Environment,
      crowdLevel: 'high' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      interestTags: ['food', 'culture', 'shopping'],
      relevanceScore: 3 as RelevanceScore,
      relevanceReason: 'good_pace_fit' as RelevanceReason,
    },
    {
      name: 'Sunset Viewpoint',
      description: 'Enjoy panoramic views of the city at sunset.',
      bestTime: ['evening'] as BestTime[],
      timingSensitivity: 'high' as TimingSensitivity,
      timingReason: 'lighting' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'outdoor' as Environment,
      crowdLevel: 'medium' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      constraints: {
        requiresDaylight: true,
        weatherDependent: true,
      },
      interestTags: ['scenic', 'photography', 'relaxation'],
      relevanceScore: 4 as RelevanceScore,
      relevanceReason: 'iconic' as RelevanceReason,
      isIconic: true,
    },
    {
      name: 'Historic Museum or Cultural Site',
      description: 'Discover the city\'s history and cultural heritage at a renowned museum or historic site.',
      bestTime: ['morning', 'afternoon'] as BestTime[],
      timingSensitivity: 'low' as TimingSensitivity,
      timingReason: 'opening_hours' as TimingReason,
      durationSlots: 2 as DurationSlots,
      environment: 'indoor' as Environment,
      crowdLevel: 'medium' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      interestTags: ['history', 'culture', 'education'],
      relevanceScore: 4 as RelevanceScore,
      relevanceReason: 'iconic' as RelevanceReason,
      isIconic: true,
    },
    {
      name: 'Evening Food District or Restaurant Street',
      description: 'Sample local cuisine and experience the city\'s food scene in a vibrant dining area.',
      bestTime: ['evening', 'night'] as BestTime[],
      timingSensitivity: 'medium' as TimingSensitivity,
      timingReason: 'opening_hours' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'mixed' as Environment,
      crowdLevel: 'high' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      interestTags: ['food', 'culture', 'nightlife'],
      relevanceScore: 4 as RelevanceScore,
      relevanceReason: 'iconic' as RelevanceReason,
      isIconic: false,
    },
    {
      name: 'Scenic Park or Garden',
      description: 'Stroll through a beautiful park or garden, perfect for a relaxed break from city exploration.',
      bestTime: ['morning', 'afternoon'] as BestTime[],
      timingSensitivity: 'low' as TimingSensitivity,
      timingReason: 'flexible' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'outdoor' as Environment,
      crowdLevel: 'low' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      interestTags: ['nature', 'relaxation', 'scenic'],
      relevanceScore: 3 as RelevanceScore,
      relevanceReason: 'good_pace_fit' as RelevanceReason,
      isIconic: false,
    },
    {
      name: 'Rooftop Bar or Observation Deck',
      description: 'Enjoy city views and evening atmosphere from a rooftop bar or observation deck.',
      bestTime: ['evening', 'night'] as BestTime[],
      timingSensitivity: 'high' as TimingSensitivity,
      timingReason: 'lighting' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'outdoor' as Environment,
      crowdLevel: 'medium' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      constraints: {
        requiresDaylight: false,
      },
      interestTags: ['scenic', 'nightlife', 'social'],
      relevanceScore: 4 as RelevanceScore,
      relevanceReason: 'iconic' as RelevanceReason,
      isIconic: true,
    },
    {
      name: 'Art Gallery or Contemporary Space',
      description: 'Explore local art and contemporary culture at a gallery or cultural center.',
      bestTime: ['afternoon', 'evening'] as BestTime[],
      timingSensitivity: 'low' as TimingSensitivity,
      timingReason: 'flexible' as TimingReason,
      durationSlots: 1 as DurationSlots,
      environment: 'indoor' as Environment,
      crowdLevel: 'low' as CrowdLevel,
      physicalEffort: 'low' as PhysicalEffort,
      interestTags: ['culture', 'art', 'education'],
      relevanceScore: 3 as RelevanceScore,
      relevanceReason: 'good_pace_fit' as RelevanceReason,
      isIconic: false,
    },
  ];
  
  // Validate and generate IDs for fallback activities
  const validated: GeneratedActivity[] = [];
  for (const activity of genericActivities) {
    const validatedActivity = validateActivity(activity, city);
    if (validatedActivity) {
      validated.push(validatedActivity);
    }
  }
  
  // Return all validated activities (should be 6-8)
  return validated.length >= 6 ? validated : validated.length > 0 ? validated : genericActivities.slice(0, 6).map(act => ({
    ...act,
    id: generateActivityId(act.name, city),
    city,
    tags: {
      bestTime: act.bestTime,
      durationSlots: act.durationSlots,
      vibe: 'cultural' as const,
      crowdLevel: act.crowdLevel,
    },
  }));
}

/**
 * Build prompt for OpenAI (V2 with personalization and capacity-aware generation)
 */
function buildPrompt(city: string, pace: Pace, userContext?: any): string {
  // Treat activity count as a MAX, not a target
  const MIN_COUNT = 5;
  const MAX_COUNT = 
    pace === 'relaxed' ? 10 :
    pace === 'packed' ? 14 :
    12; // moderate
  
  // Build personalization context
  let personalizationContext = '';
  if (userContext) {
    if (userContext.interests && userContext.interests.length > 0) {
      personalizationContext += `\nUser Interests: ${userContext.interests.join(', ')}`;
    }
    if (userContext.groupSize) {
      personalizationContext += `\nGroup Size: ${userContext.groupSize}`;
    }
    if (userContext.tripType) {
      personalizationContext += `\nTrip Type: ${userContext.tripType}`;
    }
  }
  
  return `You are a travel expert generating a daily planning list for ${city}.

Generate up to ${MAX_COUNT} realistic, well-known activities for ${city}.
${personalizationContext}

CRITICAL RULES:
1. Activities must be real, well-known attractions or experiences in ${city}
2. Generate UP TO ${MAX_COUNT} activities, but:
   - If the city is small or has limited distinct experiences, return FEWER activities (minimum ${MIN_COUNT})
   - Do NOT create near-duplicates, filler activities, or overly niche experiences just to reach a number
   - Quality over quantity: every activity must be distinct and worthwhile
3. All metadata must be CATEGORICAL only - do NOT invent specific opening hours, prices, or permits
4. Personalization balance:
   - 60-70% aligned with user interests (if provided) → relevanceScore 4-5
   - 30-40% exploratory or iconic experiences → relevanceScore 2-3
5. Metadata rules:
   - timingSensitivity: Use 'low' if uncertain, prefer 'flexible' for timingReason
   - No factual claims - only categorical hints
   - requiresDaylight/weatherDependent only when obvious

QUALITY GUIDELINES:
- Each activity must be DISTINCT (no near-duplicates by name, location, or experience)
- Avoid vague activities like "Explore the city" or "Wander around"
- Prioritize well-known, specific experiences over generic suggestions
- Small cities (5-7 activities) should feel curated, not padded
- Large cities (10-14 activities) should feel comprehensive, not repetitive

Timing guidelines (reflect real-world patterns):
- Temples, markets, museums: early_morning or morning (timingReason: 'opening_hours' or 'crowds')
- Parks, walking tours: morning or afternoon (timingReason: 'lighting' or 'flexible')
- Beaches, cafes: afternoon (timingReason: 'flexible')
- Rooftop bars, night markets, cruises: evening or night (timingReason: 'experience_quality' or 'opening_hours')

For each activity, provide ALL these fields:

Required fields:
- name: Clear, concise activity name
- description: 1-2 sentence description (no prices or booking info)
- bestTime: Array of 1-3 best times (early_morning, morning, afternoon, evening, night)
- timingSensitivity: 'low', 'medium', or 'high'
- timingReason: 'crowds', 'lighting', 'opening_hours', 'weather', 'access', 'experience_quality', or 'flexible'
- durationSlots: 1 or 2 (1 = ~2-3 hours, 2 = ~4-6 hours)
- environment: 'indoor', 'outdoor', or 'mixed'
- crowdLevel: 'low', 'medium', or 'high'
- physicalEffort: 'low', 'medium', or 'high'
- interestTags: Array of 2-4 theme tags (e.g., ['history', 'architecture'], ['food', 'culture'])
- relevanceScore: 1-5 (4-5 = strong interest match or iconic, 2-3 = exploratory, 1 = filler)
- relevanceReason: 'matches_interest', 'iconic', 'hidden_gem', or 'good_pace_fit'

Optional fields:
- constraints: { requiresDaylight?: boolean, weatherDependent?: boolean }
- isIconic: true/false (for must-see landmarks)

Return STRICT JSON only, no explanations outside JSON:
{
  "activities": [
    {
      "name": "Activity Name",
      "description": "Activity description",
      "bestTime": ["morning"],
      "timingSensitivity": "medium",
      "timingReason": "crowds",
      "durationSlots": 1,
      "environment": "outdoor",
      "crowdLevel": "medium",
      "physicalEffort": "low",
      "constraints": { "requiresDaylight": false, "weatherDependent": false },
      "interestTags": ["culture", "history"],
      "relevanceScore": 4,
      "relevanceReason": "matches_interest",
      "isIconic": false
    }
  ]
}`;
}

/**
 * Call OpenAI to generate activities (V2)
 */
async function generateAIActivities(
  city: string,
  pace: Pace,
  userContext?: any
): Promise<GeneratedActivity[] | null> {
  try {
    const prompt = buildPrompt(city, pace, userContext);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: 'You are a travel expert generating a daily planning list. You must return STRICT JSON only. All metadata must be categorical - never invent specific hours, prices, or factual claims. Balance personalization (60-70%) with exploration (30-40%). Generate UP TO the requested maximum, but return FEWER activities for smaller cities rather than inventing low-quality or repetitive ones. Quality over quantity.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500, // Increased to accommodate more activities
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      return null;
    }

    const parsed = JSON.parse(responseText);
    
    // Validate response structure
    if (!parsed.activities || !Array.isArray(parsed.activities)) {
      return null;
    }

    // Validate and filter activities
    const validated: GeneratedActivity[] = [];
    const seenNames = new Set<string>();
    
    for (const activity of parsed.activities) {
      const validatedActivity = validateActivity(activity, city);
      if (validatedActivity) {
        // Check for near-duplicates by name (case-insensitive)
        const nameLower = validatedActivity.name.toLowerCase().trim();
        if (seenNames.has(nameLower)) {
          console.warn(`[GenerateActivities] Duplicate activity skipped: ${validatedActivity.name}`);
          continue;
        }
        
        seenNames.add(nameLower);
        validated.push(validatedActivity);
      }
    }

    // Enforce minimum quality floor: at least 5 activities
    if (validated.length < 5) {
      console.warn(`[GenerateActivities] Only ${validated.length} valid activities for ${city}, falling back`);
      return null; // Trigger fallback
    }

    return validated;
  } catch (error) {
    console.error('[GenerateActivities] OpenAI error:', error);
    return null;
  }
}

/**
 * Generate a synthetic timing-constrained activity for validation
 */
function generateSyntheticTimingActivity(
  city: string,
  requiredTiming: 'morning' | 'evening',
  pace: Pace
): GeneratedActivity {
  const cityLower = city.toLowerCase();
  
  if (requiredTiming === 'morning') {
    // Morning timing-constrained activity (early_morning or morning, timingSensitivity !== low)
    const morningActivities = [
      {
        name: 'Sunrise Viewpoint',
        description: `Experience the city at dawn from a scenic viewpoint, best visited early to avoid crowds and capture the morning light.`,
        bestTime: ['early_morning', 'morning'] as BestTime[],
        timingSensitivity: 'high' as TimingSensitivity,
        timingReason: 'lighting' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'outdoor' as Environment,
        crowdLevel: 'low' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        constraints: {
          requiresDaylight: true,
        },
        interestTags: ['scenic', 'photography', 'iconic'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
      {
        name: 'Morning Market Tour',
        description: `Explore a local market at its busiest and most authentic time, when vendors are setting up and locals are shopping.`,
        bestTime: ['early_morning', 'morning'] as BestTime[],
        timingSensitivity: 'medium' as TimingSensitivity,
        timingReason: 'opening_hours' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'mixed' as Environment,
        crowdLevel: 'medium' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        interestTags: ['culture', 'food', 'local'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
      {
        name: 'Temple or Cathedral Visit',
        description: `Visit a historic religious site during quiet morning hours before tourist crowds arrive.`,
        bestTime: ['early_morning', 'morning'] as BestTime[],
        timingSensitivity: 'medium' as TimingSensitivity,
        timingReason: 'crowds' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'indoor' as Environment,
        crowdLevel: 'low' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        interestTags: ['history', 'culture', 'architecture'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
    ];
    
    // Select based on city characteristics
    const selected = cityLower.includes('temple') || cityLower.includes('cathedral') || cityLower.includes('church')
      ? morningActivities[2]
      : cityLower.includes('market') || cityLower.includes('bazaar')
      ? morningActivities[1]
      : morningActivities[0];
    
    const validated = validateActivity(selected, city);
    if (validated) {
      return validated;
    }
    
    // Fallback if validation fails - try all morning activities
    for (const activity of morningActivities) {
      const fallbackValidated = validateActivity(activity, city);
      if (fallbackValidated) {
        return fallbackValidated;
      }
    }
    
    // Ultimate fallback - create a minimal valid activity
    const id = generateActivityId('Morning Experience', city);
    return {
      id,
      city,
      name: 'Morning Experience',
      description: `Start your day with an early morning activity in ${city}.`,
      bestTime: ['early_morning', 'morning'],
      timingSensitivity: 'medium',
      timingReason: 'crowds',
      durationSlots: 1,
      environment: 'outdoor',
      crowdLevel: 'low',
      physicalEffort: 'low',
      constraints: {},
      interestTags: ['iconic', 'culture'],
      relevanceScore: 4,
      relevanceReason: 'iconic',
      isIconic: true,
      tags: {
        bestTime: ['early_morning', 'morning'],
        durationSlots: 1,
        vibe: 'cultural',
        crowdLevel: 'low',
      },
    };
  } else {
    // Evening/night timing-constrained activity
    const eveningActivities = [
      {
        name: 'Sunset Rooftop Experience',
        description: `Enjoy panoramic city views and evening atmosphere from a rooftop bar or observation deck, best during sunset hours.`,
        bestTime: ['evening', 'night'] as BestTime[],
        timingSensitivity: 'high' as TimingSensitivity,
        timingReason: 'lighting' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'outdoor' as Environment,
        crowdLevel: 'medium' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        constraints: {
          requiresDaylight: false,
        },
        interestTags: ['scenic', 'nightlife', 'iconic'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
      {
        name: 'Evening River or Harbor Cruise',
        description: `Take a scenic cruise during golden hour or after dark to see the city from the water with evening lighting.`,
        bestTime: ['evening', 'night'] as BestTime[],
        timingSensitivity: 'high' as TimingSensitivity,
        timingReason: 'lighting' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'outdoor' as Environment,
        crowdLevel: 'medium' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        constraints: {
          requiresDaylight: false,
        },
        interestTags: ['scenic', 'romantic', 'iconic'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
      {
        name: 'Night Market or Evening Food Tour',
        description: `Experience local nightlife and cuisine at a night market or evening food district when it comes alive.`,
        bestTime: ['evening', 'night'] as BestTime[],
        timingSensitivity: 'medium' as TimingSensitivity,
        timingReason: 'opening_hours' as TimingReason,
        durationSlots: 1 as DurationSlots,
        environment: 'mixed' as Environment,
        crowdLevel: 'high' as CrowdLevel,
        physicalEffort: 'low' as PhysicalEffort,
        interestTags: ['food', 'culture', 'nightlife'],
        relevanceScore: 4 as RelevanceScore,
        relevanceReason: 'iconic' as RelevanceReason,
        isIconic: true,
      },
    ];
    
    // Select based on city characteristics
    const selected = cityLower.includes('river') || cityLower.includes('harbor') || cityLower.includes('port')
      ? eveningActivities[1]
      : cityLower.includes('market') || cityLower.includes('food')
      ? eveningActivities[2]
      : eveningActivities[0];
    
    const validated = validateActivity(selected, city);
    if (validated) {
      return validated;
    }
    
    // Fallback if validation fails - try all evening activities
    for (const activity of eveningActivities) {
      const fallbackValidated = validateActivity(activity, city);
      if (fallbackValidated) {
        return fallbackValidated;
      }
    }
    
    // Ultimate fallback - create a minimal valid activity
    const id = generateActivityId('Evening Experience', city);
    return {
      id,
      city,
      name: 'Evening Experience',
      description: `End your day with an evening activity in ${city}.`,
      bestTime: ['evening', 'night'],
      timingSensitivity: 'medium',
      timingReason: 'lighting',
      durationSlots: 1,
      environment: 'outdoor',
      crowdLevel: 'medium',
      physicalEffort: 'low',
      constraints: {},
      interestTags: ['iconic', 'nightlife'],
      relevanceScore: 4,
      relevanceReason: 'iconic',
      isIconic: true,
      tags: {
        bestTime: ['evening', 'night'],
        durationSlots: 1,
        vibe: 'social',
        crowdLevel: 'medium',
      },
    };
  }
}

/**
 * Post-generation validation: ensure timing-constrained activities exist
 */
function validateAndInjectTimingActivities(
  activities: GeneratedActivity[],
  city: string,
  pace: Pace
): GeneratedActivity[] {
  const MAX_COUNT = 
    pace === 'relaxed' ? 10 :
    pace === 'packed' ? 14 :
    12; // moderate
  
  // Check for morning timing-constrained activity
  const hasMorningConstrained = activities.some(activity => {
    const hasMorningTime = activity.bestTime.some(time => 
      time === 'early_morning' || time === 'morning'
    );
    return hasMorningTime && activity.timingSensitivity !== 'low';
  });
  
  // Check for evening timing-constrained activity
  const hasEveningConstrained = activities.some(activity => {
    const hasEveningTime = activity.bestTime.some(time => 
      time === 'evening' || time === 'night'
    );
    return hasEveningTime && activity.timingSensitivity !== 'low';
  });
  
  const result = [...activities];
  
  // Inject morning activity if missing
  if (!hasMorningConstrained && result.length < MAX_COUNT) {
    const syntheticMorning = generateSyntheticTimingActivity(city, 'morning', pace);
    // Check if we already have this activity (by ID)
    const isDuplicate = result.some(act => act.id === syntheticMorning.id);
    
    if (!isDuplicate) {
      result.push(syntheticMorning);
      console.log(`[GenerateActivities] Injected morning timing-constrained activity for ${city}`);
    }
  }
  
  // Inject evening activity if missing
  if (!hasEveningConstrained && result.length < MAX_COUNT) {
    const syntheticEvening = generateSyntheticTimingActivity(city, 'evening', pace);
    // Check if we already have this activity (by ID)
    const isDuplicate = result.some(act => act.id === syntheticEvening.id);
    
    if (!isDuplicate) {
      result.push(syntheticEvening);
      console.log(`[GenerateActivities] Injected evening timing-constrained activity for ${city}`);
    }
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  let body: GenerateActivitiesRequest;
  
  try {
    body = await request.json();
  } catch (error) {
    console.error('[GenerateActivities] JSON parse error:', error);
    // Ultimate fallback for unparseable request
    const genericFallback = getFallbackActivities('City', 'moderate');
    return NextResponse.json({ activities: genericFallback, isFallback: true });
  }

  try {
    // Validate request
    if (!body.city || typeof body.city !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid field: city must be a string' },
        { status: 400 }
      );
    }

    if (!body.pace || !['relaxed', 'moderate', 'packed'].includes(body.pace)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: pace must be "relaxed", "moderate", or "packed"' },
        { status: 400 }
      );
    }

    // userContext is optional - no validation needed

    // Generate cache key (includes userContext for personalization)
    const cacheKey = generateCacheKey(body.city, body.pace, body.userContext);

    // Check cache
    if (activitiesCache.has(cacheKey)) {
      const cached = activitiesCache.get(cacheKey)!;
      return NextResponse.json({ activities: cached, isFallback: false });
    }

    // Generate activities (with fallback)
    let activities: GeneratedActivity[];
    let isFallback = false;
    
    const aiActivities = await generateAIActivities(body.city, body.pace, body.userContext);
    
    if (aiActivities && aiActivities.length >= 3) {
      activities = aiActivities;
      isFallback = false;
    } else {
      // Fallback to hardcoded activities
      activities = getFallbackActivities(body.city, body.pace);
      isFallback = true;
    }

    // Post-generation validation: inject timing-constrained activities if missing
    activities = validateAndInjectTimingActivities(activities, body.city, body.pace);

    // Only cache AI-generated results, NOT fallback responses
    if (!isFallback) {
      activitiesCache.set(cacheKey, activities);
    }

    const response: GenerateActivitiesResponse = {
      activities,
      isFallback,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GenerateActivities] API error:', error);
    
    // On error, return fallback activities using saved body
    const fallback = getFallbackActivities(body.city || 'City', body.pace || 'moderate');
    return NextResponse.json({ activities: fallback, isFallback: true });
  }
}
