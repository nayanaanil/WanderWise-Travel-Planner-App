import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DestinationClassification {
  type: 'place' | 'theme';
  normalizedPlace?: string; // Standardized place string if it's a place
  inferredRegion?: string; // Region to use for itinerary generation if theme
  tags?: string[]; // 2-6 keywords describing the theme
}

/**
 * Classify user destination input as either a "place" (city/country/region) 
 * or a "theme" (experience/interest/conceptual trip)
 * 
 * @param userInput - Raw destination string from user
 * @returns Classification result with type, normalized place, inferred region, and tags
 */
export async function classifyUserDestination(
  userInput: string
): Promise<DestinationClassification> {
  try {
    if (!userInput || !userInput.trim()) {
      // Safe fallback for empty input
      return {
        type: 'theme',
        inferredRegion: 'global',
        tags: ['travel', 'exploration'],
      };
    }

    // Build classification prompt
    const prompt = buildClassificationPrompt(userInput.trim());

    // Call OpenAI API with cheapest suitable model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model with good classification capability
      messages: [
        {
          role: 'system',
          content:
            'You are a travel destination classifier. Analyze user input and determine if it describes a specific place (city, country, region) or a travel theme/experience. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent classification
      max_tokens: 200,
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    let classification: DestinationClassification;
    try {
      const parsed = JSON.parse(responseContent);
      
      // Validate and normalize the response
      classification = {
        type: parsed.type === 'place' ? 'place' : 'theme',
        normalizedPlace: parsed.normalizedPlace || undefined,
        inferredRegion: parsed.inferredRegion || undefined,
        tags: Array.isArray(parsed.tags) 
          ? parsed.tags.slice(0, 6).filter((tag: any) => typeof tag === 'string')
          : undefined,
      };

      // Ensure tags exist for themes
      if (classification.type === 'theme' && (!classification.tags || classification.tags.length === 0)) {
        classification.tags = extractFallbackTags(userInput);
      }

      // Ensure inferredRegion exists for themes
      if (classification.type === 'theme' && !classification.inferredRegion) {
        classification.inferredRegion = inferRegionFromInput(userInput);
      }

      // Ensure normalizedPlace exists for places
      if (classification.type === 'place' && !classification.normalizedPlace) {
        classification.normalizedPlace = userInput.trim();
      }

    } catch (parseError) {
      console.error('Failed to parse classification response:', parseError);
      // Fallback to theme classification
      return getSafeFallback(userInput);
    }

    return classification;
  } catch (error) {
    console.error('Error classifying destination:', error);
    // Safe fallback on any error
    return getSafeFallback(userInput);
  }
}

/**
 * Build the classification prompt for OpenAI
 */
function buildClassificationPrompt(userInput: string): string {
  return `Analyze this travel destination input and classify it as either a "place" or "theme":

Input: "${userInput}"

Classification rules:
- If it's a specific city, country, or region name → type = "place"
- If it describes experiences, activities, or conceptual trips → type = "theme"

Examples:
- "Paris" → place (normalizedPlace: "Paris, France")
- "Japan" → place (normalizedPlace: "Japan")
- "South India" → place (normalizedPlace: "South India")
- "European Christmas markets" → theme (inferredRegion: "Europe", tags: ["christmas", "markets", "holiday", "cultural"])
- "African safari" → theme (inferredRegion: "Africa", tags: ["safari", "wildlife", "nature", "adventure"])
- "South Indian temples" → theme (inferredRegion: "South India", tags: ["temples", "spiritual", "architecture", "culture"])

Return JSON in this exact format:
{
  "type": "place" or "theme",
  "normalizedPlace": "standardized place name" (only if type is "place"),
  "inferredRegion": "region name" (only if type is "theme"),
  "tags": ["keyword1", "keyword2", ...] (2-6 tags, only if type is "theme")
}`;
}

/**
 * Extract fallback tags from user input when classification fails
 */
function extractFallbackTags(userInput: string): string[] {
  const lowerInput = userInput.toLowerCase();
  const tags: string[] = [];

  // Extract common travel keywords
  const keywords = [
    'christmas', 'markets', 'safari', 'beach', 'mountain', 'temple', 'temple',
    'culture', 'food', 'wine', 'adventure', 'hiking', 'diving', 'skiing',
    'festival', 'music', 'art', 'history', 'architecture', 'spiritual',
    'wellness', 'yoga', 'meditation', 'wildlife', 'nature', 'photography',
  ];

  keywords.forEach(keyword => {
    if (lowerInput.includes(keyword) && tags.length < 6) {
      tags.push(keyword);
    }
  });

  // Add generic tags if needed
  if (tags.length === 0) {
    tags.push('travel', 'exploration');
  }

  return tags.slice(0, 6);
}

/**
 * Infer region from user input when classification fails
 */
function inferRegionFromInput(userInput: string): string {
  const lowerInput = userInput.toLowerCase();

  // Check for regional keywords
  if (lowerInput.includes('europe') || lowerInput.includes('european')) {
    return 'Europe';
  }
  if (lowerInput.includes('asia') || lowerInput.includes('asian')) {
    return 'Asia';
  }
  if (lowerInput.includes('africa') || lowerInput.includes('african')) {
    return 'Africa';
  }
  if (lowerInput.includes('america') || lowerInput.includes('american')) {
    return 'Americas';
  }
  if (lowerInput.includes('south india') || lowerInput.includes('south indian')) {
    return 'South India';
  }
  if (lowerInput.includes('north india') || lowerInput.includes('north indian')) {
    return 'North India';
  }
  if (lowerInput.includes('southeast asia')) {
    return 'Southeast Asia';
  }

  // Default fallback
  return 'global';
}

/**
 * Get safe fallback classification when errors occur
 */
function getSafeFallback(userInput: string): DestinationClassification {
  return {
    type: 'theme',
    inferredRegion: inferRegionFromInput(userInput),
    tags: extractFallbackTags(userInput),
  };
}







