import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { selectRelevantTensions, type UserProfile, type TensionResult } from '@/lib/phase3/hotelTradeoffRules';
import type { HotelTags } from '@/lib/phase3/types';

export type { TensionResult };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TripContext = {
  pace?: string;
  interests?: string[];
  travelers: {
    adults: number;
    kids: number;
  };
  tripDurationDays?: number;
};

type StayWindow = {
  arrival: string; // ISO date
  departure: string; // ISO date
  nights: number;
};

type AggregatedHotelFacts = {
  totalHotels: number;
  availabilityMix: {
    available: number;
    limited: number;
    unavailable: number;
  };
  confidenceMix: {
    high: number;
    medium: number;
    low: number;
  };
  roomTypeMix: {
    uniqueRoomTypes: string[];
    hotelsWithRoomTypes: number;
    hotelsWithoutRoomTypes: number;
  };
  priceRange?: {
    min: number;
    max: number;
  } | null;
  exactMatchMix: {
    exactMatch: number;
    requiresAdjustment: number;
  };
};

type MeaningfulDifferences = {
  fit: boolean;
  comfort: boolean;
  availability: boolean;
};

type TravelSignals = {
  disruptionRisk: 'low' | 'medium' | 'high';
  sellOutRisk: 'low' | 'medium' | 'high';
  roomCompromiseRisk: 'low' | 'medium' | 'high';
};

type HotelPriorityGuidanceRequest = {
  city: string;
  stayWindow: StayWindow;
  groupSize: {
    adults: number;
    kids: number;
  };
  tripContext?: TripContext;
  aggregatedFacts: AggregatedHotelFacts;
  meaningfulDifferences: MeaningfulDifferences;
  travelSignals: TravelSignals;
  selectedPriority?: {
    tensionId: string;
    poleId: string;
    selectedHotel: {
      id: string;
      name: string;
      pricePerNight: number;
      tags: HotelTags;
    };
  };
  hotels?: Array<{
    id: string;
    name: string;
    pricePerNight?: number;
    tags?: HotelTags;
  }>;
};

type HotelPriority = {
  id: 'fit' | 'comfort' | 'availability';
  label: string;
  helper: string;
};

type HotelPriorityGuidanceResponse = {
  brief?: string;
  priorities?: HotelPriority[];
  tensionResults?: TensionResult[];
  explanation?: string;
  acceptedTradeoff?: string;
};

function buildSystemPrompt(
  meaningfulDifferences: MeaningfulDifferences,
  travelSignals: TravelSignals,
  userProfile: UserProfile,
  tensionResults: TensionResult[],
  hotels?: Array<{ id: string; name: string; pricePerNight?: number; tags?: HotelTags }>,
  selectedPriority?: {
    tensionId: string;
    poleId: string;
    selectedHotel: {
      id: string;
      name: string;
      pricePerNight: number;
      tags: HotelTags;
    };
  }
): string {
  // Explanation mode: user has selected a priority
  if (selectedPriority) {
    const tensionResult = tensionResults.find(t => t.dimension === selectedPriority.tensionId);
    const poleLabel = tensionResult?.poleA.id === selectedPriority.poleId
      ? tensionResult.poleA.label
      : tensionResult?.poleB.id === selectedPriority.poleId
      ? tensionResult.poleB.label
      : selectedPriority.poleId;

    return `You are WanderWise. The user just made a choice. Explain why this hotel is perfect for them.

USER PROFILE:
- Pace: ${userProfile.pace}
- Interests: ${userProfile.interests.join(', ')}
- Budget tier: ${userProfile.budget}
- Group: ${userProfile.groupSize} people

THEY CHOSE: ${selectedPriority.poleId} (${poleLabel})
SELECTED HOTEL: ${selectedPriority.selectedHotel.name} at $${selectedPriority.selectedHotel.pricePerNight}/night
HOTEL TAGS: ${JSON.stringify(selectedPriority.selectedHotel.tags)}

Generate a personalized explanation (MAX 20-25 words) for why this hotel matches their choice. Reference their specific interests, pace, or group size. Also generate a short "accepted tradeoff" (MAX 15-20 words) acknowledging what they're giving up.

OUTPUT JSON:
{
  "explanation": "string — MAX 20-25 words, simple phrase-like conversation",
  "acceptedTradeoff": "string — MAX 15-20 words, what they're giving up"
}

RULES:
- Keep it conversational and simple
- No filler words
- Be specific but brief
- Reference their actual preferences naturally`;
  }

  // Normal mode: help user choose
  const activeDimensions = [
    meaningfulDifferences.fit && 'fit',
    meaningfulDifferences.comfort && 'comfort',
    meaningfulDifferences.availability && 'availability',
  ].filter(Boolean) as Array<'fit' | 'comfort' | 'availability'>;

  const prioritiesList = activeDimensions
    .map((id) => `    { "id": "${id}", "label": string, "helper": string }`)
    .join(',\n');

  // Build hotel summaries with tags
  const hotelSummariesWithTags = hotels && hotels.length > 0
    ? hotels.map(h => {
        const price = h.pricePerNight ? `$${h.pricePerNight}/night` : 'Price TBD';
        const tags = h.tags
          ? `Tags: ${h.tags.priceCategory}, ${h.tags.vibeMatch.join('/')}, ${h.tags.locationVibe}, ${h.tags.groupFit.join('/')}`
          : 'No tags';
        return `- ${h.name} (${price}) - ${tags}`;
      }).join('\n')
    : 'Hotel details provided in aggregatedFacts';

  // Get primary tension (first one)
  const primaryTension = tensionResults.length > 0 ? tensionResults[0] : null;

  return `You are WanderWise — a travel buddy helping someone pick hotels.

USER PROFILE:
- Pace: ${userProfile.pace}
- Interests: ${userProfile.interests.join(', ')}
- Budget tier: ${userProfile.budget}
- Group: ${userProfile.groupSize} people

${primaryTension ? `RELEVANT TRADEOFF FOR THIS USER:
${primaryTension.poleA.label} vs ${primaryTension.poleB.label}` : ''}

HOTELS AVAILABLE:
${hotelSummariesWithTags}

Generate a brief (MAX 20-25 words) that frames this tradeoff specifically for this user's interests and pace. Then generate 2 priority pills.

Reference their actual preferences naturally. For example:
- If they're a foodie: mention walking to restaurants
- If they're relaxed pace: mention sleeping in, no rush
- If they're a family: mention kids, space, convenience

OUTPUT JSON:
{
  "brief": "string — MAX 20-25 words, simple phrase-like conversation",
  "priorities": [
    { "id": "poleA-id", "label": "string", "helper": "string referencing user profile" },
    { "id": "poleB-id", "label": "string", "helper": "string referencing user profile" }
  ]
}

BRIEF:
- MAX 20-25 words
- Simple phrase-like conversation
- Super casual, no filler
- Reference their specific interests, pace, or group size
- Frame the tradeoff in terms they care about

PRIORITY PILLS:
- Use the tension poles: "${primaryTension?.poleA.id || 'poleA'}" and "${primaryTension?.poleB.id || 'poleB'}"
- Label: Short, punchy (3-5 words max) - use the pole labels
- Helper: MAX 15-20 words. Reference their profile (pace, interests, group size)

Be casual. Be brief. Be WanderWise.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: HotelPriorityGuidanceRequest = await request.json();

    if (!body || !body.city || !body.stayWindow || !body.groupSize || !body.aggregatedFacts || !body.meaningfulDifferences || !body.travelSignals) {
      return NextResponse.json(
        { error: 'city, stayWindow, groupSize, aggregatedFacts, meaningfulDifferences, and travelSignals are required' },
        { status: 400 }
      );
    }

    // Build user profile from request
    const groupSize = body.groupSize.adults + (body.groupSize.kids || 0);
    const pace = (body.tripContext?.pace || 'moderate') as 'relaxed' | 'moderate' | 'packed';
    const interests = body.tripContext?.interests || [];
    
    // Map budget from tripContext or default
    let budget: 'budget' | 'moderate' | 'premium' | 'luxury' = 'moderate';
    // Note: tripContext doesn't have budget, so we'll need to infer or default
    // For now, we'll use a default. In production, this should come from tripState
    
    const userProfile: UserProfile = {
      pace,
      interests,
      budget,
      groupSize,
    };

    // Get relevant tensions
    const tensionResults = selectRelevantTensions(userProfile);

    const { meaningfulDifferences, travelSignals, selectedPriority, hotels } = body;

    // Explanation mode: selectedPriority is provided
    if (selectedPriority) {
      const systemPromptContent = buildSystemPrompt(
        meaningfulDifferences,
        travelSignals,
        userProfile,
        tensionResults,
        hotels,
        selectedPriority
      );

      const userContent = JSON.stringify(
        {
          city: body.city,
          stayWindow: body.stayWindow,
          groupSize: body.groupSize,
          tripContext: body.tripContext || {},
          selectedPriority,
        },
        null,
        2
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPromptContent,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      let parsed: { explanation?: string; acceptedTradeoff?: string };
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        throw new Error('Failed to parse AI guidance JSON');
      }

      // Validate explanation mode response
      if (!parsed.explanation || typeof parsed.explanation !== 'string') {
        throw new Error('Invalid guidance structure: explanation is required');
      }
      if (!parsed.acceptedTradeoff || typeof parsed.acceptedTradeoff !== 'string') {
        throw new Error('Invalid guidance structure: acceptedTradeoff is required');
      }

      return NextResponse.json(parsed);
    }

    // Normal mode: help user choose
    const activeDimensions = [
      meaningfulDifferences.fit && 'fit',
      meaningfulDifferences.comfort && 'comfort',
      meaningfulDifferences.availability && 'availability',
    ].filter(Boolean) as Array<'fit' | 'comfort' | 'availability'>;

    // Only proceed if 2+ dimensions differ
    if (activeDimensions.length < 2) {
      return NextResponse.json({
        brief: `Here are your hotel options for ${body.city}. Consider what matters most for your ${body.stayWindow.nights}-night stay.`,
        priorities: [],
      });
    }

    // Build dynamic system prompt based on which dimensions differ and travel signals
    const systemPromptContent = buildSystemPrompt(
      meaningfulDifferences,
      travelSignals,
      userProfile,
      tensionResults,
      hotels
    );

    const userContent = JSON.stringify(
      {
        city: body.city,
        stayWindow: body.stayWindow,
        groupSize: body.groupSize,
        tripContext: body.tripContext || {},
        aggregatedFacts: body.aggregatedFacts,
        meaningfulDifferences: body.meaningfulDifferences,
        travelSignals: body.travelSignals,
        userProfile,
        tensionResults,
        hotels: hotels || [],
      },
      null,
      2
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPromptContent,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    let parsed: HotelPriorityGuidanceResponse;
    try {
      parsed = JSON.parse(content) as HotelPriorityGuidanceResponse;
    } catch (err) {
      throw new Error('Failed to parse AI guidance JSON');
    }

    // Validate brief exists
    if (!parsed.brief || typeof parsed.brief !== 'string') {
      throw new Error('Invalid guidance structure: brief is required');
    }

    // Validate priorities array exists
    if (!Array.isArray(parsed.priorities)) {
      throw new Error('Invalid guidance structure: priorities must be an array');
    }

    // Validate priorities - now based on tension poles
    const primaryTension = tensionResults.length > 0 ? tensionResults[0] : null;
    
    if (primaryTension) {
      // Expect 2 priorities based on tension poles
      if (parsed.priorities.length !== 2) {
        throw new Error(
          `Invalid guidance structure: expected 2 priorities (tension poles), got ${parsed.priorities.length}`
        );
      }

      // Validate that priorities match tension pole IDs
      const returnedIds = parsed.priorities.map((p) => p.id).sort();
      const expectedIds = [primaryTension.poleA.id, primaryTension.poleB.id].sort();
      if (JSON.stringify(returnedIds) !== JSON.stringify(expectedIds)) {
        throw new Error(
          `Invalid guidance priorities: expected IDs [${expectedIds.join(', ')}], got [${returnedIds.join(', ')}]`
        );
      }

      // Validate each priority has required fields
      for (const priority of parsed.priorities) {
        if (!priority.id || !priority.label || !priority.helper) {
          throw new Error('Invalid priority structure: each priority must have id, label, and helper');
        }
      }
    } else {
      // No tension results - fallback to old system validation
      const expectedCount = activeDimensions.length;
      
      // Special case: If only 1 dimension differs, AI should return empty priorities array
      if (expectedCount === 1 && parsed.priorities.length === 0) {
        // Valid: 1 dimension differs, empty priorities (brief only, no question)
        // Continue without validating IDs
      } else {
        // Normal case: 2+ dimensions differ, must match expected count
        if (parsed.priorities.length !== expectedCount) {
          throw new Error(
            `Invalid guidance structure: expected ${expectedCount} priorities, got ${parsed.priorities.length}`
          );
        }

        // Validate that only expected IDs are present
        const returnedIds = parsed.priorities.map((p) => p.id).sort();
        const expectedIds = [...activeDimensions].sort();
        if (JSON.stringify(returnedIds) !== JSON.stringify(expectedIds)) {
          throw new Error(
            `Invalid guidance priorities: expected IDs [${expectedIds.join(', ')}], got [${returnedIds.join(', ')}]`
          );
        }

        // Validate each priority has required fields
        for (const priority of parsed.priorities) {
          if (!priority.id || !priority.label || !priority.helper) {
            throw new Error('Invalid priority structure: each priority must have id, label, and helper');
          }
        }
      }
    }

    return NextResponse.json({
      brief: parsed.brief,
      priorities: parsed.priorities,
      tensionResults: tensionResults, // Add this
    });
  } catch (error) {
    console.error('[HotelPriorityGuidance] Error generating guidance', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Failure mode: surface nothing to the UI caller
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}

