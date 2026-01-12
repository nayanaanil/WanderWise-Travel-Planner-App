import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Strict explainer input schema
 * Only recommended flight + optional single comparison
 */
type FlightExplainerInput = {
  recommended: {
    airline: string;
    price: number;
    durationMinutes: number;
    stops: number;
  };

  comparison?: {
    type: 'cheapest' | 'fastest';
    airline: string;
    priceDifference: number; // positive number
    timeDifferenceMinutes: number; // positive number
  };

  userPreferences: {
    budget: 'low' | 'medium' | 'high';
    pace: 'relaxed' | 'moderate' | 'packed';
    groupSize: number;
  };
};

interface FlightExplanation {
  summary: string; // 1-2 sentences explaining the recommendation
}

/**
 * Deterministic fallback based on user preferences
 */
function generateDeterministicExplanation(
  userPreferences: FlightExplainerInput['userPreferences']
): FlightExplanation {
  const { budget, pace } = userPreferences;
  
  if (budget === 'low') {
    return { summary: 'This option balances cost and travel time well.' };
  }
  
  if (pace === 'packed') {
    return { summary: 'This is the fastest way to reach your destination.' };
  }
  
  if (pace === 'relaxed') {
    return { summary: 'Fewer stops make this a more comfortable journey.' };
  }
  
  // Default
  return { summary: 'This flight offers the best balance for your trip.' };
}

/**
 * Hard verbosity guard - max 3 sentences
 */
function validateExplanation(summary: string): void {
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 3) {
    throw new Error('Explainer response too verbose');
  }
}

/**
 * POST /api/agent/explain-flights
 * 
 * Generate AI-powered explanation for the system-recommended flight.
 * AI does NOT choose, rank, or suggest - only explains the existing recommendation.
 */
export async function POST(request: NextRequest) {
  try {
    const body: FlightExplainerInput = await request.json();

    // Validate required fields
    if (!body.recommended || !body.userPreferences) {
      return NextResponse.json(
        { error: 'recommended flight and userPreferences are required' },
        { status: 400 }
      );
    }

    const { recommended, comparison, userPreferences } = body;

    // Format recommended flight details
    const hours = Math.floor(recommended.durationMinutes / 60);
    const minutes = recommended.durationMinutes % 60;
    const duration = `${hours}h ${minutes}m`;
    const stopsText = recommended.stops === 0 ? 'direct' : `${recommended.stops} stop${recommended.stops > 1 ? 's' : ''}`;

    // Build context for AI
    const recommendedInfo = `Recommended Flight:
- Airline: ${recommended.airline}
- Price: $${recommended.price}
- Duration: ${duration}
- Stops: ${stopsText}`;

    const comparisonInfo = comparison ? `

Alternative (${comparison.type}):
- Airline: ${comparison.airline}
- Price difference: $${comparison.priceDifference} ${comparison.type === 'cheapest' ? 'cheaper' : 'more expensive'}
- Time difference: ${Math.round(comparison.timeDifferenceMinutes / 60)}h ${comparison.type === 'fastest' ? 'faster' : 'slower'}` : '';

    const preferencesInfo = `User Preferences:
- Budget sensitivity: ${userPreferences.budget}
- Travel pace: ${userPreferences.pace}
- Group size: ${userPreferences.groupSize} traveler${userPreferences.groupSize > 1 ? 's' : ''}`;

    const systemPrompt = `You are a travel agent explaining a flight decision already made by deterministic logic.

CRITICAL RULE (ABSOLUTE):
You must NEVER invent, rename, or reinterpret labels.

You may ONLY reference labels that exist in the UI:
- "Recommended"
- "Cheapest"
- "Fastest"
(Exact casing required)

If a label is not provided in the input, DO NOT mention it.

EXPLANATION FORMAT (MANDATORY):

When user preference exists:
"Since you prefer <preference>:
<UI_LABEL>: <airline name> — <one concrete reason>."

Examples:
- Since you prefer a lower budget:
  Cheapest: Vietnam Airlines — saves over $300 with a longer journey.
- Since you're on a packed schedule:
  Recommended: British Airways — direct flight that cuts hours of travel time.

When no strong preference:
"Recommended: <airline name> — best balance of price, time, and convenience."

STRICT CONSTRAINTS:
- MAX 2 lines total
- MAX 1 sentence per line
- UNDER 120 characters per sentence
- NO paragraphs
- NO prose explanations

🚫 BANNED PHRASES (ABSOLUTE):
- "The system recommends"
- "Best value"
- "Most affordable"
- "Fastest option"
- Any synonym of UI labels

ONLY use exact UI labels: "Recommended", "Cheapest", "Fastest"

CONTENT RULES:
- Always lead with user's dominant preference if provided
- Mention ONLY ONE benefit (price OR time OR comfort)
- Do NOT restate information visible in the UI
- Do NOT explain what other options do unless explicitly asked

TONE:
State the reason, state the label, state the winner. Stop.

FAILURE MODE:
If constraints cannot be met:
- Return the shortest valid explanation
- Do NOT add extra context
- Do NOT apologize`;

    const userPrompt = `${recommendedInfo}${comparisonInfo}

${preferencesInfo}

Explain why this recommended flight is the best choice for this user.`;

    // Call OpenAI
    let aiResponse: FlightExplanation;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150, // Very short explanations only
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const summary = content.trim();

      // Hard verbosity guard
      try {
        validateExplanation(summary);
      } catch (verbosityError) {
        console.warn('[ExplainFlights] AI response too verbose, using fallback');
        aiResponse = generateDeterministicExplanation(userPreferences);
        return NextResponse.json(aiResponse, { status: 200 });
      }

      aiResponse = { summary };

    } catch (aiError) {
      console.error('[ExplainFlights] AI generation failed, using fallback:', aiError);
      aiResponse = generateDeterministicExplanation(userPreferences);
    }

    return NextResponse.json(aiResponse, { status: 200 });

  } catch (error) {
    console.error('[ExplainFlights] API error:', error);

    // Return deterministic fallback on any error
    return NextResponse.json(
      { summary: 'This flight offers the best balance for your trip.' },
      { status: 200 } // Don't fail - return fallback
    );
  }
}

