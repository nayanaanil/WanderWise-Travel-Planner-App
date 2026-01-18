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

type AggregatedActivityFacts = {
  totalActivities: number;
  timingMix: {
    early_morning: number;
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  timingSensitivityMix: {
    low: number;
    medium: number;
    high: number;
  };
  crowdLevelMix: {
    low: number;
    medium: number;
    high: number;
  };
  physicalEffortMix: {
    low: number;
    medium: number;
    high: number;
  };
  durationMix: {
    short: number; // durationSlots === 1
    long: number; // durationSlots === 2
  };
  environmentMix: {
    indoor: number;
    outdoor: number;
    mixed: number;
  };
  constraintsMix: {
    requiresDaylight: number;
    weatherDependent: number;
    noConstraints: number;
  };
};

type MeaningfulDifferences = {
  timingFit: boolean;
  crowdDensity: boolean;
  energyDemand: boolean;
  rigidity: boolean;
};

type TravelSignals = {
  fatigueRisk: 'low' | 'medium' | 'high';
  crowdStress: 'low' | 'medium' | 'high';
  flexibilityRisk: 'low' | 'medium' | 'high';
  weatherExposure: 'low' | 'medium' | 'high';
};

type ActivityPriorityGuidanceRequest = {
  city: string;
  pace: 'relaxed' | 'moderate' | 'packed';
  tripContext?: TripContext;
  aggregatedFacts: AggregatedActivityFacts;
  meaningfulDifferences: MeaningfulDifferences;
  travelSignals: TravelSignals;
};

type ActivityPriority = {
  id: 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity';
  label: string;
  helper: string;
};

type ActivityPriorityGuidanceResponse = {
  brief: string;
  priorities: ActivityPriority[];
};

function buildSystemPrompt(
  meaningfulDifferences: MeaningfulDifferences,
  travelSignals: TravelSignals
): string {
  const activeDimensions = [
    meaningfulDifferences.timingFit && 'timingFit',
    meaningfulDifferences.crowdDensity && 'crowdDensity',
    meaningfulDifferences.energyDemand && 'energyDemand',
    meaningfulDifferences.rigidity && 'rigidity',
  ].filter(Boolean) as Array<'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity'>;

  const prioritiesList = activeDimensions
    .map((id) => `    { "id": "${id}", "label": string, "helper": string }`)
    .join(',\n');

  return `You are WanderWise — a chill travel buddy helping someone pick activities. Keep it short and casual.

RULES:
- You're NOT choosing activities. Just helping them decide what matters.
- Brief: MAX 2 sentences. No filler words. Super casual.
- Priority pills: ONE sentence max each. Short and punchy.

INPUT:
- City, trip pace
- Activity comparison data (timing, crowds, effort, duration, flexibility)
- Only these dimensions differ: ${activeDimensions.join(', ')}
- Travel signals: fatigueRisk=${travelSignals.fatigueRisk}, crowdStress=${travelSignals.crowdStress}, flexibilityRisk=${travelSignals.flexibilityRisk}, weatherExposure=${travelSignals.weatherExposure}

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
- Frame tradeoffs simply (timing, crowds, energy, flexibility)

PRIORITY PILLS:
- Label: Short, punchy (3-5 words max)
- Helper: ONE sentence max. Casual. No filler.
- Use these IDs: ${activeDimensions.map((id) => `"${id}"`).join(', ') || 'none'}

Examples (don't copy):
- Label: "Flexible timing" → Helper: "Activities you can do anytime."
- Label: "Avoid crowds" → Helper: "Less busy spots for a chill vibe."

Be casual. Be brief. Be WanderWise.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ActivityPriorityGuidanceRequest = await request.json();

    if (!body || !body.city || !body.pace || !body.aggregatedFacts || !body.meaningfulDifferences || !body.travelSignals) {
      return NextResponse.json(
        { error: 'city, pace, aggregatedFacts, meaningfulDifferences, and travelSignals are required' },
        { status: 400 }
      );
    }

    const { meaningfulDifferences, travelSignals } = body;
    const activeDimensions = [
      meaningfulDifferences.timingFit && 'timingFit',
      meaningfulDifferences.crowdDensity && 'crowdDensity',
      meaningfulDifferences.energyDemand && 'energyDemand',
      meaningfulDifferences.rigidity && 'rigidity',
    ].filter(Boolean) as Array<'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity'>;

    // Only proceed if 2+ dimensions differ
    if (activeDimensions.length < 2) {
      return NextResponse.json({
        brief: `Here are your activity options for ${body.city}. Consider what matters most for your day.`,
        priorities: [],
      });
    }

    // Build dynamic system prompt based on which dimensions differ and travel signals
    const systemPromptContent = buildSystemPrompt(meaningfulDifferences, travelSignals);

    const userContent = JSON.stringify(
      {
        city: body.city,
        pace: body.pace,
        tripContext: body.tripContext || {},
        aggregatedFacts: body.aggregatedFacts,
        meaningfulDifferences: body.meaningfulDifferences,
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

    let parsed: ActivityPriorityGuidanceResponse;
    try {
      parsed = JSON.parse(content) as ActivityPriorityGuidanceResponse;
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
    console.error('[ActivityPriorityGuidance] Error generating guidance', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Failure mode: surface nothing to the UI caller
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}
