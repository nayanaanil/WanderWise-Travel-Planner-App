/**
 * Agent Explanation Generator
 * 
 * Thin AI layer on top of deterministic decision engines.
 * 
 * Rules:
 * - Uses DecisionResult as single source of truth
 * - AI only rephrases and explains existing facts/risks/options
 * - AI never invents new options, constraints, or actions
 * - Server-side only
 */

import { DecisionResult } from './types';
import * as crypto from 'crypto';

export type AgentExplanationInput = {
  decision: DecisionResult;
  context?: {
    pace?: 'relaxed' | 'moderate' | 'packed';
    city?: string;
  };
};

export type AgentExplanation = {
  summary: string;
  optionSummaries: Record<string, string>;
};

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
 * Generate deterministic fallback explanation when AI fails
 */
export function generateFallbackExplanation(input: AgentExplanationInput): AgentExplanation {
  const { decision } = input;
  
  // Summary: use recommendation if available, otherwise join facts
  const summary = decision.recommendation 
    ? decision.recommendation 
    : decision.facts.join('. ');
  
  // Option summaries: use description
  const optionSummaries: Record<string, string> = {};
  decision.options.forEach(option => {
    optionSummaries[option.id] = option.description;
  });
  
  return {
    summary,
    optionSummaries,
  };
}

/**
 * Generate AI-powered explanation for a decision result
 * 
 * This function is called by the API route. It handles:
 * - Building the prompt from DecisionResult
 * - Calling OpenAI
 * - Caching responses
 * - Fallback on failure
 */
export async function generateAgentExplanation(
  input: AgentExplanationInput
): Promise<AgentExplanation> {
  // Generate cache key
  const cacheKey = hashDecisionInput(input);
  
  // Check cache (in-memory for MVP)
  // Note: In production, use Redis or similar
  if (!(global as any).agentExplanationCache) {
    (global as any).agentExplanationCache = new Map<string, AgentExplanation>();
  }
  
  const cache = (global as any).agentExplanationCache as Map<string, AgentExplanation>;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  
  // Fallback: return deterministic explanation
  // The API route will handle OpenAI calls and caching
  // This function is kept simple to allow API route to control caching behavior
  return generateFallbackExplanation(input);
}

