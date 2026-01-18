/**
 * Seasonality Resolution API
 * 
 * POST /api/seasonality/resolve
 * 
 * AI fallback for seasonality selection when no direct match exists.
 * Returns the most appropriate existing seasonality key from allowed list.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CITY_SEASONALITY } from '../../../../public/data/seasonality/cities';
import { COUNTRY_SEASONALITY } from '../../../../public/data/seasonality/countries';
import { REGION_SEASONALITY } from '../../../../public/data/seasonality/regions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract all allowed seasonality keys from existing data sources
const CITY_KEYS = Object.keys(CITY_SEASONALITY);
const COUNTRY_KEYS = Object.keys(COUNTRY_SEASONALITY);
const REGION_KEYS = Object.keys(REGION_SEASONALITY);

// Combined list of all allowed seasonality keys
const ALLOWED_SEASONALITY_KEYS = [
  ...CITY_KEYS,
  ...COUNTRY_KEYS,
  ...REGION_KEYS,
];

// In-memory cache for AI results (per destination)
const aiCache = new Map<string, string>();

/**
 * AI helper to select the best matching seasonality key from allowed list
 */
async function selectSeasonalityKeyAI(destination: string): Promise<string | null> {
  // Check cache first
  if (aiCache.has(destination)) {
    const cached = aiCache.get(destination)!;
    console.log('[SeasonalityFallback] Cache hit', { destination, selectedKey: cached, source: 'ai-cached' });
    return cached === '__NONE__' ? null : cached;
  }

  const prompt = `Given a travel destination, return EXACTLY ONE seasonality key from this allowed list, or "__NONE__" if no suitable match exists.

Allowed keys (cities, countries, regions):
${ALLOWED_SEASONALITY_KEYS.map(key => `- ${key}`).join('\n')}

Rules:
- Return ONLY the key name as a plain string
- Do NOT return explanations, quotes, or extra text
- Must be an exact match from the allowed list above
- Prefer region matches for multi-country areas (e.g., "Scandinavia" for Nordic countries)
- Prefer country matches for specific countries
- Prefer city matches for specific major cities
- If truly no match exists, return "__NONE__"

Examples:
Input: "Central Europe" → Output: European Christmas Markets
Input: "Nordic countries" → Output: Scandinavia
Input: "Bali" → Output: Indonesia
Input: "Tokyo" → Output: Japan
Input: "Thailand islands" → Output: South East Asia
Input: "Unknown destination XYZ" → Output: __NONE__

Destination: "${destination}"

Return only the key name or "__NONE__":`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: 'You select the best matching seasonality profile from a fixed list. You must return EXACTLY one key from the allowed list, or "__NONE__".',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const result = completion.choices[0]?.message?.content?.trim() || '__NONE__';
    
    // Remove quotes if present
    const cleanedResult = result.replace(/^["']|["']$/g, '');
    
    // Validate: must be in allowed list or "__NONE__"
    if (cleanedResult === '__NONE__') {
      aiCache.set(destination, '__NONE__');
      console.log('[SeasonalityFallback]', { destination, selectedKey: null, source: 'ai' });
      return null;
    }
    
    if (ALLOWED_SEASONALITY_KEYS.includes(cleanedResult)) {
      aiCache.set(destination, cleanedResult);
      console.log('[SeasonalityFallback]', { destination, selectedKey: cleanedResult, source: 'ai' });
      return cleanedResult;
    }
    
    // If not in allowed list, treat as "__NONE__"
    console.warn(`[SeasonalityFallback] AI returned invalid key "${cleanedResult}" for destination "${destination}", treating as __NONE__`);
    aiCache.set(destination, '__NONE__');
    return null;
  } catch (error) {
    console.error('[SeasonalityFallback] Error calling AI:', error);
    // On error, return null to fall back to default behavior
    aiCache.set(destination, '__NONE__');
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination } = body;

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid field: destination must be a string' },
        { status: 400 }
      );
    }

    // Try to find direct match first (for validation/caching purposes, but AI will also check)
    // This is just for logging - the actual resolution logic is in the frontend
    const selectedKey = await selectSeasonalityKeyAI(destination);

    return NextResponse.json({
      destination,
      selectedKey,
      source: selectedKey ? 'ai' : 'fallback',
    });
  } catch (error) {
    console.error('[SeasonalityFallback] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
