import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TripContext = {
  pace?: string;
  interests?: string[];
  budget?: string;
  travelers: {
    adults: number;
    kids: number;
  };
  tripDurationDays?: number;
};

type AggregatedFlightFacts = {
  priceRange?: {
    min: number;
    max: number;
  } | null;
  totalTravelTimeRangeMinutes?: {
    min: number;
    max: number;
  } | null;
  layoverPatterns?: {
    hasLongLayovers: boolean;
    typicalStops: 'nonstop' | 'one-stop' | 'multi-stop' | 'mixed';
  } | null;
  arrivalPatterns?: {
    mostlyMorning: boolean;
    mostlyLateNight: boolean;
    mixed: boolean;
  } | null;
  reliability?: {
    totalOptions: number;
    gatewaysWithAlternatives: number;
    averageStops: number;
  } | null;
};

type Differentiators = {
  price: boolean;
  arrival: boolean;
  layover: boolean;
};

type TravelSignals = {
  firstDayUsability: 'good' | 'mixed' | 'poor';
  connectionAnxiety: 'low' | 'medium' | 'high';
  sleepDisruptionRisk: 'low' | 'medium' | 'high';
};

type FlightPriorityGuidanceRequest = {
  tripContext: TripContext;
  aggregatedFacts: AggregatedFlightFacts;
  differentiators: Differentiators;
  travelSignals: TravelSignals;
  selectedPriority?: {
    priorityId: 'price' | 'arrival' | 'layover';
    selectedFlight: {
      airline: string;
      price: number;
      departureTime: string;
      arrivalTime: string;
      stops: number;
      totalDuration: string;
    };
  };
};

type FlightPriority = {
  id: 'price' | 'arrival' | 'layover';
  label: string;
  helper: string;
};

type FlightPriorityGuidanceResponse = {
  brief?: string;
  priorities?: FlightPriority[];
  explanation?: string;
  acceptedTradeoff?: string;
};

function buildSystemPrompt(
  tripContext: TripContext,
  aggregatedFacts: AggregatedFlightFacts,
  differentiators: Differentiators,
  travelSignals: TravelSignals,
  selectedPriority?: FlightPriorityGuidanceRequest['selectedPriority']
): string {
  // Explanation mode: user has selected a priority
  if (selectedPriority) {
    const { priorityId, selectedFlight } = selectedPriority;
    
    return `You are WanderWise. The user just picked their flight priority. Explain why this flight matches their choice.

USER PROFILE:
- Pace: ${tripContext.pace || 'moderate'}
- Budget tier: ${tripContext.budget || 'moderate'}
- Group: ${tripContext.travelers.adults} adults, ${tripContext.travelers.kids} kids
- Trip length: ${tripContext.tripDurationDays || 'N/A'} days

THEY CHOSE: ${priorityId}
SELECTED FLIGHT:
- Airline: ${selectedFlight.airline}
- Price: $${selectedFlight.price}
- Departure: ${selectedFlight.departureTime}
- Arrival: ${selectedFlight.arrivalTime}
- Stops: ${selectedFlight.stops}
- Total duration: ${selectedFlight.totalDuration}

Generate a personalized explanation (MAX 20-25 words) for why this flight matches their priority. Reference their pace, budget, or group size naturally. Also generate a short "accepted tradeoff" (MAX 15-20 words) acknowledging what they're giving up.

OUTPUT (JSON):
{
  "explanation": "string — personalized, reference their profile, MAX 20-25 words",
  "acceptedTradeoff": "string — what they're giving up, MAX 15-20 words"
}

Be specific. Reference their actual situation. No generic advice.`;
  }

  // Normal mode: help user choose
  const activeDimensions = [
    differentiators.price && 'price',
    differentiators.arrival && 'arrival',
    differentiators.layover && 'layover',
  ].filter(Boolean) as Array<'price' | 'arrival' | 'layover'>;

  // Format arrival pattern
  const arrivalPatternText = aggregatedFacts.arrivalPatterns?.mostlyMorning 
    ? 'mostly morning' 
    : aggregatedFacts.arrivalPatterns?.mostlyLateNight 
    ? 'mostly late night' 
    : 'mixed';

  return `You are WanderWise — a chill travel buddy helping someone pick flights. Keep it short and casual.

USER PROFILE:
- Pace: ${tripContext.pace || 'moderate'}
- Interests: ${tripContext.interests?.join(', ') || 'general travel'}
- Budget tier: ${tripContext.budget || 'moderate'}
- Group: ${tripContext.travelers.adults} adults, ${tripContext.travelers.kids} kids
- Trip length: ${tripContext.tripDurationDays} days

FLIGHT OPTIONS SUMMARY:
- Price range: $${aggregatedFacts.priceRange?.min || 'N/A'} - $${aggregatedFacts.priceRange?.max || 'N/A'}
- Travel time range: ${aggregatedFacts.totalTravelTimeRangeMinutes?.min || 'N/A'}-${aggregatedFacts.totalTravelTimeRangeMinutes?.max || 'N/A'} minutes
- Layover pattern: ${aggregatedFacts.layoverPatterns?.typicalStops || 'mixed'}
- Arrival pattern: ${arrivalPatternText}

TRAVEL SIGNALS:
- First day usability: ${travelSignals.firstDayUsability}
- Connection anxiety: ${travelSignals.connectionAnxiety}
- Sleep disruption risk: ${travelSignals.sleepDisruptionRisk}

DIMENSIONS THAT DIFFER: ${activeDimensions.join(', ')}

YOUR JOB:
Generate a brief (2 sentences max) and priority pills that reference the user's specific situation.

PERSONALIZATION RULES:
- If budget='budget': emphasize savings, mention "more money for experiences"
- If budget='luxury': emphasize comfort, mention "you're not here to suffer"
- If pace='packed': emphasize arrival time, mention "maximize your first day"
- If pace='relaxed': emphasize smooth journey, mention "no rush, arrive refreshed"
- If kids > 0: emphasize layover comfort, mention "easier with little ones"
- If tripDurationDays <= 5: emphasize arrival, mention "every hour counts on a short trip"
- If tripDurationDays >= 10: emphasize price, mention "savings add up on longer trips"

OUTPUT (JSON only):
{
  "brief": "string — reference their pace or budget naturally, max 2 sentences",
  "priorities": [
    { "id": "price" | "arrival" | "layover", "label": "string 3-5 words", "helper": "string referencing user profile" }
  ]
}

EXAMPLES:
- Budget traveler, packed pace: "You want to hit the ground running without breaking the bank. Here's the tradeoff."
- Luxury traveler, relaxed pace: "No need to suffer through bad connections. The question is how much comfort is worth to you."
- Family with kids: "Layovers with kids are no joke. Let's find you something manageable."

Be specific. Reference their actual situation. No generic advice.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: FlightPriorityGuidanceRequest = await request.json();

    if (!body || !body.tripContext || !body.aggregatedFacts || !body.differentiators || !body.travelSignals) {
      return NextResponse.json(
        { error: 'tripContext, aggregatedFacts, differentiators, and travelSignals are required' },
        { status: 400 }
      );
    }

    const { tripContext, aggregatedFacts, differentiators, travelSignals, selectedPriority } = body;

    // Build dynamic system prompt based on user profile, flight facts, dimensions, and travel signals
    const systemPromptContent = buildSystemPrompt(
      tripContext,
      aggregatedFacts,
      differentiators,
      travelSignals,
      selectedPriority
    );

    const userContent = JSON.stringify(
      {
        tripContext: body.tripContext,
        aggregatedFacts: body.aggregatedFacts,
        differentiators: body.differentiators,
        travelSignals: body.travelSignals,
        selectedPriority: body.selectedPriority,
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

    let parsed: FlightPriorityGuidanceResponse;
    try {
      parsed = JSON.parse(content) as FlightPriorityGuidanceResponse;
    } catch (err) {
      throw new Error('Failed to parse AI guidance JSON');
    }

    // Explanation mode: validate explanation and acceptedTradeoff
    if (selectedPriority) {
      if (!parsed.explanation || typeof parsed.explanation !== 'string') {
        throw new Error('Invalid guidance structure: explanation is required in explanation mode');
      }
      if (!parsed.acceptedTradeoff || typeof parsed.acceptedTradeoff !== 'string') {
        throw new Error('Invalid guidance structure: acceptedTradeoff is required in explanation mode');
      }
      return NextResponse.json({
        explanation: parsed.explanation,
        acceptedTradeoff: parsed.acceptedTradeoff,
      });
    }

    // Normal mode: validate brief and priorities
    if (!parsed.brief || typeof parsed.brief !== 'string') {
      throw new Error('Invalid guidance structure: brief is required');
    }

    if (!Array.isArray(parsed.priorities)) {
      throw new Error('Invalid guidance structure: priorities must be an array');
    }

    const activeDimensions = [
      differentiators.price && 'price',
      differentiators.arrival && 'arrival',
      differentiators.layover && 'layover',
    ].filter(Boolean) as Array<'price' | 'arrival' | 'layover'>;

    // Validate priorities match expected count and IDs
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

    return NextResponse.json({
      brief: parsed.brief,
      priorities: parsed.priorities,
    });
  } catch (error) {
    console.error('[FlightPriorityGuidance] Error generating guidance', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Failure mode: surface nothing to the UI caller
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}


