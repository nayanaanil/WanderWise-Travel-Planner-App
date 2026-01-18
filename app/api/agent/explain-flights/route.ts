import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PreferenceLens } from '@/lib/derivePreferenceLens';
import { GatewayContext } from '@/lib/phase1/types';

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

  preferenceLens?: PreferenceLens; // Optional for backward compatibility
  
  gatewayContext?: GatewayContext; // Optional gateway context for gateway-level explanation
};

interface FlightExplanation {
  summary: string; // 1-2 sentences explaining the flight recommendation
  gatewayExplanation?: string; // 1-2 sentences explaining the gateway (if gatewayContext provided)
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

    const { recommended, comparison, userPreferences, preferenceLens } = body;

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

    const preferenceLensInfo = preferenceLens ? `
Preference Lens (PRIMARY):
- Priority: ${preferenceLens.priority}
- Stops tolerance: ${preferenceLens.tolerance.stops}
- Long journey tolerance: ${preferenceLens.tolerance.longJourneys}` : '';

    const systemPrompt = `You are a travel agent explaining a flight decision already made by deterministic logic.

CRITICAL RULE (ABSOLUTE):
You must NEVER invent, rename, or reinterpret labels.

You may ONLY reference labels that exist in the UI:
- "Recommended"
- "Cheapest"
- "Fastest"
(Exact casing required)

If a label is not provided in the input, DO NOT mention it.

PREFERENCE LENS (PRIMARY EXPLANATION FRAMEWORK):

If preferenceLens is provided, it is the PRIMARY lens for your explanation.
Raw user preferences are secondary context only.

HARD RULE: Every explanation MUST reference at least one element of preferenceLens
(priority AND/OR tolerance). This is mandatory when preferenceLens is present.

PRIORITY INTERPRETATION:
- priority === "time" → Emphasize shorter duration, fewer stops, faster arrival
- priority === "cost" → Emphasize savings, acceptable tradeoffs for lower price
- priority === "comfort" → Emphasize reliability, fewer connections, smoother journey

TOLERANCE INTERPRETATION:
- stops tolerance === "low" → Highlight fewer connections, direct flights when available
- stops tolerance === "high" → Downplay stops if price/time benefit exists, acceptable tradeoff
- stops tolerance === "medium" → Balanced mention of stops if relevant

- longJourneys tolerance === "low" → Emphasize arrival freshness, fewer total hours, efficiency
- longJourneys tolerance === "high" → Acceptable longer duration for savings or convenience
- longJourneys tolerance === "medium" → Balanced consideration of journey length

EXPLANATION FORMAT (MANDATORY):

When preferenceLens is provided:
"Since you prioritize <priority> [and have <tolerance> tolerance]:
<UI_LABEL>: <airline name> — <reason aligned with lens>."

Examples with preferenceLens:
- priority="time", stops tolerance="low":
  Recommended: British Airways — direct flight that cuts hours of travel time.
- priority="cost", stops tolerance="high":
  Cheapest: Vietnam Airlines — saves over $300 with acceptable stops.
- priority="comfort", stops tolerance="low":
  Recommended: Emirates — fewer connections for a smoother journey.

When preferenceLens is NOT provided (fallback):
"Since you prefer <raw preference>:
<UI_LABEL>: <airline name> — <one concrete reason>."

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
- When preferenceLens exists: Lead with priority and/or tolerance, then UI label
- When preferenceLens missing: Lead with raw user preference if provided
- Mention ONLY ONE benefit (price OR time OR comfort)
- Do NOT restate information visible in the UI
- Do NOT explain what other options do unless explicitly asked

TONE:
State the reason, state the label, state the winner. Stop.

FAILURE MODE:
If constraints cannot be met:
- Return the shortest valid explanation
- Do NOT add extra context
- Do NOT apologize

GATEWAY EXPLANATION (if gatewayContext provided):

You must also explain why this gateway city works well for this user.

CRITICAL RULES:
- The gateway is ALREADY recommended by the system - you are explaining why, not choosing it
- NEVER imply you chose or ranked the gateway
- NEVER reference gateway rank numbers (1, 2, 3)
- NEVER mention other gateways by index or position
- NEVER mention algorithms, weights, or scoring

MANDATORY REASONING:
- MUST reference at least one element of preferenceLens (priority AND/OR tolerance)
- Emphasize gateway strengths that align with user's priority:
  * priority === "time" → emphasize "best" or "good" time strength
  * priority === "cost" → emphasize price strength
  * priority === "comfort" → emphasize reliability strength
- Mention the tradeoff only once, in plain language

TONE & STYLE:
- Very casual, friendly, conversational
- Second-person ("you", "your trip")
- Slightly cheeky WanderWise tone is allowed
- No technical language, no scoring terms

LENGTH RULES:
- 2 sentences MAX
- No paragraphs
- Keep it brief and punchy

FAILURE MODE (Gateway):
- If gateway explanation cannot clearly reference user preference → return empty string
- Do NOT invent explanations if preferenceLens is missing or unclear`;

    const gatewayContextInfo = body.gatewayContext ? `

Gateway Context:
- City: ${body.gatewayContext.city}
- Strengths: price=${body.gatewayContext.strengths.price}, time=${body.gatewayContext.strengths.time}, reliability=${body.gatewayContext.strengths.reliability}
- Tradeoff: ${body.gatewayContext.tradeoff.description} (compared to ${body.gatewayContext.tradeoff.comparedTo})
- Resolution: ${body.gatewayContext.resolution.type}${body.gatewayContext.resolution.originalCity ? ` (from ${body.gatewayContext.resolution.originalCity})` : ''}` : '';

    const userPrompt = `${recommendedInfo}${comparisonInfo}

${preferencesInfo}${preferenceLensInfo}${gatewayContextInfo}

${body.gatewayContext 
  ? `Explain why this recommended flight and gateway city work well for this user.

Provide your response in this exact format:
FLIGHT: [1-2 sentences explaining the flight recommendation]
GATEWAY: [1-2 sentences explaining why ${body.gatewayContext.city} works well for this user based on their preferences]`
  : 'Explain why this recommended flight is the best choice for this user.'}`;

    // Call OpenAI
    let aiResponse: FlightExplanation;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1',
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

      const contentTrimmed = content.trim();

      // Parse flight and gateway explanations
      let summary = contentTrimmed;
      let gatewayExplanation: string | undefined;

      if (body.gatewayContext) {
        // Parse structured response format: "FLIGHT: ... GATEWAY: ..."
        const flightMatch = contentTrimmed.match(/FLIGHT:\s*([\s\S]+?)(?=GATEWAY:|$)/i);
        const gatewayMatch = contentTrimmed.match(/GATEWAY:\s*([\s\S]+?)$/i);
        
        if (flightMatch) {
          summary = flightMatch[1].trim();
        }
        
        if (gatewayMatch) {
          gatewayExplanation = gatewayMatch[1].trim();
          
          // Validate gateway explanation length (2 sentences max)
          const gatewaySentences = gatewayExplanation.match(/[^.!?]+[.!?]+/g) || [];
          if (gatewaySentences.length > 2) {
            // Too verbose, truncate to first 2 sentences
            gatewayExplanation = gatewaySentences.slice(0, 2).join(' ').trim();
          }
          
          // Check if gateway explanation references preferenceLens
          // If preferenceLens is required but not clearly referenced, return empty string
          if (body.preferenceLens) {
            const explanationLower = gatewayExplanation.toLowerCase();
            const priority = body.preferenceLens.priority;
            
            // Check for priority references
            const hasPriorityRef = 
              explanationLower.includes(priority) ||
              (priority === 'time' && (explanationLower.includes('time') || explanationLower.includes('fast') || explanationLower.includes('quick'))) ||
              (priority === 'cost' && (explanationLower.includes('price') || explanationLower.includes('cost') || explanationLower.includes('cheap') || explanationLower.includes('affordable'))) ||
              (priority === 'comfort' && (explanationLower.includes('comfort') || explanationLower.includes('reliable') || explanationLower.includes('smooth') || explanationLower.includes('fewer')));
            
            // Check for tolerance references
            const hasToleranceRef = 
              explanationLower.includes('stop') ||
              explanationLower.includes('connection') ||
              explanationLower.includes('journey') ||
              explanationLower.includes('duration') ||
              explanationLower.includes('long') ||
              explanationLower.includes('short');
            
            if (!hasPriorityRef && !hasToleranceRef) {
              // Cannot clearly reference user preference, return empty string
              gatewayExplanation = '';
            }
          } else {
            // If no preferenceLens, still allow gateway explanation but it should be minimal
            // Keep it as is for now
          }
        } else {
          // No gateway explanation found in structured format, set to empty string
          gatewayExplanation = '';
        }
      }

      // Hard verbosity guard for flight explanation
      try {
        validateExplanation(summary);
      } catch (verbosityError) {
        console.warn('[ExplainFlights] AI response too verbose, using fallback');
        aiResponse = generateDeterministicExplanation(userPreferences);
        if (body.gatewayContext) {
          aiResponse.gatewayExplanation = '';
        }
        return NextResponse.json(aiResponse, { status: 200 });
      }

      aiResponse = { summary };
      if (body.gatewayContext) {
        aiResponse.gatewayExplanation = gatewayExplanation || '';
      }

    } catch (aiError) {
      console.error('[ExplainFlights] AI generation failed, using fallback:', aiError);
      aiResponse = generateDeterministicExplanation(userPreferences);
      if (body.gatewayContext) {
        aiResponse.gatewayExplanation = '';
      }
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

