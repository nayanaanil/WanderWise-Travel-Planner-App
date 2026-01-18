import { NextRequest, NextResponse } from 'next/server';
import { getAllowedCities } from '@/lib/getAllowedCities';

interface CityRecommendationRequest {
  destination: string;
  destinationType?: 'city' | 'country' | 'region' | 'theme';
  tripDuration: number;
  userInterests?: string[];
  allowedCityNames: string[]; // Names only - AI must only rank from this list
}

interface RankedCity {
  name: string;
  reason: string;
}

/**
 * POST /api/cities/recommend
 * AI-assisted city ranking - only ranks from allowed cities, never invents new ones
 */
export async function POST(request: NextRequest) {
  try {
    const body: CityRecommendationRequest = await request.json();
    const { destination, destinationType, tripDuration, userInterests = [], allowedCityNames } = body;

    if (!destination || !allowedCityNames || allowedCityNames.length === 0) {
      return NextResponse.json(
        { error: 'destination and allowedCityNames are required' },
        { status: 400 }
      );
    }

    // Get max cities to recommend based on duration
    let maxCities = 10;
    if (tripDuration >= 3 && tripDuration <= 5) maxCities = 6;
    if (tripDuration >= 6 && tripDuration <= 8) maxCities = 8;
    if (tripDuration >= 9 && tripDuration <= 11) maxCities = 10;
    if (tripDuration >= 12 && tripDuration <= 15) maxCities = 12;

    // Build the prompt - explicitly restrict to allowed cities only
    const interestsText = userInterests.length > 0 
      ? `Interests: ${userInterests.join(', ')}\n`
      : '';

    const prompt = `You are a travel planning assistant.

From the following cities ONLY, recommend up to ${maxCities} cities that best fit this trip:

Destination: ${destination}
Duration: ${tripDuration} days
${interestsText}Cities (you MUST only select from this list):
${allowedCityNames.map((name, i) => `- ${name}`).join('\n')}

Return a JSON array of objects with this exact format:
[
  { "name": "City Name", "reason": "One-line reason why this city fits the trip" }
]

Rules:
1. Only include cities from the provided list
2. Do NOT invent new cities
3. Rank by relevance to destination, duration, and interests
4. Provide a concise, helpful reason (one line, max 60 characters)
5. Return exactly the city names as provided (case-sensitive)

Return ONLY the JSON array, no other text.`;

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured, falling back to deterministic ranking');
      return fallbackRanking(allowedCityNames, maxCities);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: 'You are a travel planning assistant. Always respond with valid JSON only. Never invent cities that are not in the provided list.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('No content from OpenAI');
      }

      // Parse JSON response
      let rankedCities: RankedCity[] = [];
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonContent = jsonMatch ? jsonMatch[0] : content;
        rankedCities = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', content);
        return fallbackRanking(allowedCityNames, maxCities);
      }

      // Validate: ensure all cities are from allowed list
      const allowedSet = new Set(allowedCityNames);
      const validRanked = rankedCities
        .filter((city: RankedCity) => allowedSet.has(city.name))
        .slice(0, maxCities);

      // If AI returned invalid cities, fall back
      if (validRanked.length === 0) {
        console.warn('AI returned no valid cities, falling back');
        return fallbackRanking(allowedCityNames, maxCities);
      }

      return NextResponse.json({ cities: validRanked }, { status: 200 });

    } catch (aiError: any) {
      console.error('AI recommendation failed, using fallback:', aiError.message);
      // Fall back to deterministic ranking - do not block user
      return fallbackRanking(allowedCityNames, maxCities);
    }

  } catch (error: any) {
    console.error('Error in city recommendation API:', error);
    return NextResponse.json(
      { error: 'Failed to get city recommendations', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Fallback deterministic ranking when AI fails
 * Returns cities in a reasonable order without AI
 */
function fallbackRanking(cityNames: string[], maxCities: number): NextResponse {
  // Simple deterministic ranking: alphabetical with some popular cities prioritized
  const popularCities = ['Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam', 'Vienna', 'Prague', 'Berlin', 'Madrid', 'Lisbon'];
  
  const prioritized = cityNames
    .filter(name => popularCities.includes(name))
    .concat(cityNames.filter(name => !popularCities.includes(name)))
    .slice(0, maxCities)
    .map(name => ({
      name,
      reason: 'Popular destination for this trip',
    }));

  return NextResponse.json({ cities: prioritized }, { status: 200 });
}


