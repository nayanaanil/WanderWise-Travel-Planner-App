import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
};

type FlightPriority = {
  id: 'price' | 'arrival' | 'layover';
  label: string;
  helper: string;
};

type FlightPriorityGuidanceResponse = {
  brief: string;
  priorities: FlightPriority[];
};

function buildSystemPrompt(
  differentiators: Differentiators,
  travelSignals: TravelSignals
): string {
  const activeDimensions = [
    differentiators.price && 'price',
    differentiators.arrival && 'arrival',
    differentiators.layover && 'layover',
  ].filter(Boolean) as Array<'price' | 'arrival' | 'layover'>;

  const prioritiesList = activeDimensions
    .map((id) => `    { "id": "${id}", "label": string, "helper": string }`)
    .join(',\n');

  return `You are WanderWise — a chill travel buddy helping someone pick flights. Keep it short and casual.

RULES:
- You're NOT choosing flights. Just helping them decide what matters.
- Brief: MAX 2 sentences. No filler words. Super casual.
- Priority pills: ONE sentence max each. Short and punchy.

INPUT:
- Trip context (pace, travelers, trip length)
- Flight comparison data (travel time, layovers, arrival times, prices)
- Only these dimensions differ: ${activeDimensions.join(', ')}
- Travel signals: firstDayUsability=${travelSignals.firstDayUsability}, connectionAnxiety=${travelSignals.connectionAnxiety}, sleepDisruptionRisk=${travelSignals.sleepDisruptionRisk}

OUTPUT (JSON only):
{
  "brief": "Max 2 sentences. Casual. WanderWise puns welcome.",
  "priorities": [
${prioritiesList || '    // Empty if <2 dimensions differ'}
  ]
}

BRIEF:
- 2 sentences MAX
- Super casual, no filler
- Puns on "WanderWise" are appreciated (e.g., "Wander wisely", "wise choice")
- Frame tradeoffs simply (energy, time, money)

PRIORITY PILLS:
- Label: Short, punchy (3-5 words max)
- Helper: ONE sentence max. Casual. No filler.
- Use these IDs: ${activeDimensions.map((id) => `"${id}"`).join(', ') || 'none'}

Examples (don't copy):
- Label: "Save money" → Helper: "Cheaper flights, might take longer."
- Label: "Arrive fresh" → Helper: "Land early, hit the ground running."

Be casual. Be brief. Be WanderWise.`;
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

    const { differentiators, travelSignals } = body;
    const activeDimensions = [
      differentiators.price && 'price',
      differentiators.arrival && 'arrival',
      differentiators.layover && 'layover',
    ].filter(Boolean) as Array<'price' | 'arrival' | 'layover'>;

    // Build dynamic system prompt based on which dimensions differ and travel signals
    const systemPromptContent = buildSystemPrompt(differentiators, travelSignals);

    const userContent = JSON.stringify(
      {
        tripContext: body.tripContext,
        aggregatedFacts: body.aggregatedFacts,
        differentiators: body.differentiators,
        travelSignals: body.travelSignals,
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

    // Validate brief exists
    if (!parsed.brief || typeof parsed.brief !== 'string') {
      throw new Error('Invalid guidance structure: brief is required');
    }

    // Validate priorities array exists
    if (!Array.isArray(parsed.priorities)) {
      throw new Error('Invalid guidance structure: priorities must be an array');
    }

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

    return NextResponse.json(parsed);
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


