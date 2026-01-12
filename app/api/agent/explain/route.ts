/**
 * Agent Explanation API
 * 
 * POST /api/agent/explain
 * 
 * Generates AI-powered explanations for decision results.
 * Thin layer on top of deterministic decision engines.
 * 
 * Rules:
 * - Uses DecisionResult as single source of truth
 * - AI only rephrases existing facts/risks/options
 * - Never invents new options or actions
 * - Cached by hash of DecisionResult + context
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AgentExplanationInput, AgentExplanation, generateFallbackExplanation } from '@/lib/decisions/agentExplanation';
import * as crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for agent explanations
// Key: SHA256 hash of normalized DecisionResult + context
// Value: AgentExplanation
const explanationCache = new Map<string, AgentExplanation>();

/**
 * Generate a deterministic hash of the decision + context for caching
 */
function hashDecisionInput(input: AgentExplanationInput): string {
  const normalized = {
    decision: {
      domain: input.decision.domain,
      status: input.decision.status,
      facts: input.decision.facts.sort(),
      risks: input.decision.risks?.sort(),
      recommendation: input.decision.recommendation,
      options: input.decision.options.map(opt => ({
        id: opt.id,
        label: opt.label,
        description: opt.description,
        action: opt.action,
      })).sort((a, b) => a.id.localeCompare(b.id)),
    },
    context: input.context || {},
  };
  
  const jsonString = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Build prompt for OpenAI from DecisionResult
 * 
 * ACTIVITY-SPECIFIC RULES (enforced via prompt):
 * - Ban system language ("system recommends", "system identified", etc.)
 * - One concrete reason only (from timingReason metadata)
 * - Max 1 sentence, 25 words
 * - Human-friendly slot names ("Daytime" / "Evening")
 * - Filter options to at most 2
 */
function buildPrompt(input: AgentExplanationInput): string {
  const { decision, context } = input;
  
  const contextInfo = context 
    ? `\n\nTrip Context:\n${context.pace ? `- Pace: ${context.pace}\n` : ''}${context.city ? `- City: ${context.city}\n` : ''}`
    : '';
  
  const factsBlock = decision.facts.length > 0 
    ? `Facts:\n${decision.facts.map(f => `- ${f}`).join('\n')}`
    : '';
  
  const risksBlock = decision.risks && decision.risks.length > 0
    ? `\n\nRisks:\n${decision.risks.map(r => `- ${r}`).join('\n')}`
    : '';
  
  const optionsBlock = decision.options.length > 0
    ? `\n\nOptions:\n${decision.options.map(opt => `- [${opt.id}] ${opt.label}: ${opt.description}${opt.tradeoffs ? ` (Tradeoffs: ${opt.tradeoffs.join(', ')})` : ''}`).join('\n')}`
    : '';
  
  const recommendation = decision.recommendation 
    ? `\n\nRecommendation: ${decision.recommendation}`
    : '';
  
  // Special handling for activity domain
  if (decision.domain === 'activity') {
    return `You are a travel agent explaining an activity timing decision already made by deterministic logic.

Decision Context:
- Domain: ${decision.domain}
- Status: ${decision.status}
${factsBlock}${risksBlock}${recommendation}${optionsBlock}${contextInfo}

CRITICAL RULE (ABSOLUTE):
You must NEVER invent, rename, or reinterpret labels or option names.

You may ONLY reference labels and option text exactly as provided in the Options section above.
If a label is not provided, DO NOT mention it.

EXPLANATION FORMAT (MANDATORY):

Summary (if user preference exists):
"Since you prefer <preference>: <activity name> works best <one concrete reason>."

Summary (no strong preference):
"<activity name> works best <one concrete reason>."

Option summaries:
"<Option label> — <one concrete reason>."

Examples:
- "Since you're on a packed schedule: Louvre visit works best in early slots to avoid crowds."
- "Eiffel Tower works best at sunset for spectacular city views."
- "Recommended time — best lighting and fewer people."
- "Your choice — busier but still enjoyable."

STRICT CONSTRAINTS:
- Summary: EXACTLY 1 sentence, UNDER 120 characters
- Each option: EXACTLY 1 sentence, UNDER 120 characters
- NO paragraphs
- NO prose explanations

🚫 BANNED PHRASES (ABSOLUTE):
- "The system recommends"
- "The system has identified"
- "This option allows you to"
- "Based on the information provided"
- "You may want to consider"
- "Optimal time" / "Optimal"
- "Overall experience"
- "Enhance your experience"

CONTENT RULES:
- Always lead with user's dominant preference if provided (packed/relaxed)
- Reference ONE concrete reason from facts:
  * crowds → "Fewer people", "Quieter"
  * lighting → "Best views", "Sunset", "Daylight"
  * opening hours → "Closes early", "Limited hours"
  * experience_quality → "Better atmosphere"
- Use human time labels: "during the day", "in the evening" (NOT "morning", "afternoon")
- Do NOT restate obvious facts already in UI
- Be specific and sensory

TONE:
State the reason, state the label, state the winner. Stop.

Return JSON:
{
  "summary": "One sentence under 120 chars",
  "optionSummaries": {
    "${decision.options[0]?.id || 'option-1'}": "One sentence under 120 chars",
    ${decision.options.slice(1).map((opt, i) => `"${opt.id}": "One sentence under 120 chars"`).join(',\n    ')}
  }
}

FAILURE MODE:
If constraints cannot be met, return SHORTER response.`;
  }
  
  // Default prompt for other domains (hotel, etc.)
  return `You are a travel agent explaining a ${decision.domain} decision already made by deterministic logic.

Decision Context:
- Domain: ${decision.domain}
- Status: ${decision.status}
${factsBlock}${risksBlock}${recommendation}${optionsBlock}${contextInfo}

CRITICAL RULE (ABSOLUTE):
You must NEVER invent, rename, or reinterpret labels or option names.

You may ONLY reference labels and option text exactly as provided in the Options section above.
If a label is not provided, DO NOT mention it.

EXPLANATION FORMAT (MANDATORY):

Summary (if user preference exists):
"Since you prefer <preference>: <option name> — <one concrete reason>."

Summary (no strong preference):
"<option name> — best balance of <key factors>."

Option summaries:
"<Option label exactly as provided> — <one concrete reason>."

Examples:
- "Since you're budget-conscious: Hotel ABC — saves €50/night while staying central."
- "Grand Hotel — walkable to all your planned stops."
- "Apply to itinerary — confirmed availability for all dates."
- "Try different room — standard room available if suites are booked."

STRICT CONSTRAINTS:
- Summary: MAX 2 lines, UNDER 120 characters per line
- Each option: EXACTLY 1 sentence, UNDER 120 characters
- NO paragraphs
- NO prose explanations

🚫 BANNED PHRASES (ABSOLUTE):
- "The system recommends"
- "The system has identified"
- "This option allows you to"
- "Based on the information provided"
- "You may want to consider"
- "Optimal"
- "Overall experience"
- "Enhance your experience"
- Any synonym of provided labels

ONLY use exact labels from the Options section.

CONTENT RULES:
- Always lead with user's dominant preference if provided (budget/luxury/family)
- Mention ONLY ONE benefit (price OR location OR availability)
- Use exact option IDs: ${decision.options.map(o => o.id).join(', ')}
- Use concrete, specific reasoning (e.g., "Check-in 3pm", "€120/night", "500m from station")
- Do NOT restate obvious facts already in UI
- Focus on WHY, not just WHAT

TONE:
State the reason, state the label, state the winner. Stop.

Return JSON:
{
  "summary": "Max 2 lines, each under 120 chars",
  "optionSummaries": {
    "${decision.options[0]?.id || 'option-1'}": "One sentence under 120 chars",
    ${decision.options.slice(1).map((opt, i) => `"${opt.id}": "One sentence under 120 chars"`).join(',\n    ')}
  }
}

FAILURE MODE:
If constraints cannot be met, return SHORTER response.`;
}

/**
 * Post-process AI explanation to enforce quality constraints
 * 
 * Enforces:
 * - Strip banned system language
 * - Trim to character limits (120 chars per sentence)
 * - Reduce options to at most 2 for activities (recommended + "Keep my choice")
 */
function postProcessExplanation(
  explanation: AgentExplanation,
  decision: any
): AgentExplanation {
  let { summary, optionSummaries } = explanation;
  
  // Extended banned phrases list (synchronized with prompt constraints)
  const bannedPhrases = [
    /the system recommends?/gi,
    /the system has identified/gi,
    /according to the system/gi,
    /this activity is identified as/gi,
    /this option allows you to/gi,
    /based on the information provided/gi,
    /ensuring the best experience/gi,
    /this timing allows you to/gi,
    /as this is the optimal time/gi,
    /you may want to consider/gi,
    /identified as/gi,
    /this activity is typically/gi,
    /overall experience/gi,
    /enhance your experience/gi,
    /optimal time/gi,
  ];
  
  // Strip banned phrases from summary
  for (const pattern of bannedPhrases) {
    summary = summary.replace(pattern, '');
  }
  
  // Trim to first 2 sentences max
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
  summary = sentences.slice(0, 2).join(' ').trim();
  
  // Enforce 240 char limit (2 sentences * 120 chars)
  if (summary.length > 240) {
    summary = summary.substring(0, 237) + '...';
  }
  
  // Clean up whitespace
  summary = summary.replace(/\s+/g, ' ').trim();
  
  // Process option summaries
  const trimmedOptionSummaries: Record<string, string> = {};
  for (const [optionId, optionSummary] of Object.entries(optionSummaries)) {
    let trimmed = optionSummary;
    
    // Strip banned phrases from option summaries
    for (const pattern of bannedPhrases) {
      trimmed = trimmed.replace(pattern, '');
    }
    
    // Trim to first sentence
    const optSentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    trimmed = optSentences[0]?.trim() || trimmed.trim();
    
    // Enforce 120 char limit per option
    if (trimmed.length > 120) {
      trimmed = trimmed.substring(0, 117) + '...';
    }
    
    // Clean up whitespace
    trimmed = trimmed.replace(/\s+/g, ' ').trim();
    
    trimmedOptionSummaries[optionId] = trimmed;
  }
  
  // Activity-specific: Reduce to 2 options max
  if (decision.domain === 'activity' && Object.keys(trimmedOptionSummaries).length > 2) {
    const optionIds = Object.keys(trimmedOptionSummaries);
    const firstOption = optionIds[0];
    
    // Find "keep" or "override" option (user's original choice)
    const keepOption = optionIds.find(id => 
      id.includes('keep') || 
      id.includes('override') ||
      id.includes('requested')
    );
    
    const filteredSummaries: Record<string, string> = {
      [firstOption]: trimmedOptionSummaries[firstOption],
    };
    
    if (keepOption && keepOption !== firstOption) {
      filteredSummaries[keepOption] = trimmedOptionSummaries[keepOption];
    } else if (optionIds.length > 1) {
      // If no "keep" option, use second option
      filteredSummaries[optionIds[1]] = trimmedOptionSummaries[optionIds[1]];
    }
    
    return {
      summary,
      optionSummaries: filteredSummaries,
    };
  }
  
  return {
    summary,
    optionSummaries: trimmedOptionSummaries,
  };
}

/**
 * Call OpenAI to generate explanation
 */
async function generateAIExplanation(
  input: AgentExplanationInput
): Promise<AgentExplanation | null> {
  try {
    const prompt = buildPrompt(input);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel agent explaining decisions already made by the system. You may not add, remove, or change options or actions. You may only explain and rephrase.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent explanations
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      return null;
    }

    const parsed = JSON.parse(responseText);
    
    // Validate response structure
    if (typeof parsed.summary !== 'string') {
      return null;
    }
    
    if (!parsed.optionSummaries || typeof parsed.optionSummaries !== 'object') {
      return null;
    }

    // Validate all option IDs are present
    const expectedOptionIds = new Set(input.decision.options.map(o => o.id));
    const providedOptionIds = new Set(Object.keys(parsed.optionSummaries));
    
    // Check if all expected options are present
    if (expectedOptionIds.size !== providedOptionIds.size) {
      return null;
    }
    
    // Validate each expected option ID exists in provided options
    const allExpectedPresent = Array.from(expectedOptionIds).every(id => providedOptionIds.has(id));
    if (!allExpectedPresent) {
      return null;
    }

    // Post-process to enforce quality constraints
    const processedExplanation = postProcessExplanation(
      {
        summary: parsed.summary,
        optionSummaries: parsed.optionSummaries as Record<string, string>,
      },
      input.decision
    );

    return processedExplanation;
  } catch (error) {
    console.error('[AgentExplanation] OpenAI error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentExplanationInput = await request.json();

    // Validate request
    if (!body.decision || !body.decision.domain || !body.decision.status) {
      return NextResponse.json(
        { error: 'Missing or invalid field: decision is required with domain and status' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = hashDecisionInput(body);

    // Check cache
    if (explanationCache.has(cacheKey)) {
      return NextResponse.json(explanationCache.get(cacheKey));
    }

    // Generate AI explanation (with fallback)
    let explanation: AgentExplanation;
    
    const aiExplanation = await generateAIExplanation(body);
    
    if (aiExplanation) {
      explanation = aiExplanation;
    } else {
      // Fallback to deterministic explanation
      explanation = generateFallbackExplanation(body);
    }

    // Cache the result
    explanationCache.set(cacheKey, explanation);

    return NextResponse.json(explanation);
  } catch (error) {
    console.error('[AgentExplanation] API error:', error);
    
    // On error, return fallback explanation
    try {
      const body: AgentExplanationInput = await request.json();
      const fallback = generateFallbackExplanation(body);
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

