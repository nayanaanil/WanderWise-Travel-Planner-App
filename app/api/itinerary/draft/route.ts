import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MasterItinerariesRequest } from '@/types/itinerary';
import { registerCoordinatesFromCities } from '../../../plan/logistics/utils/coordinateRegistry';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Draft Itinerary City structure
export interface DraftCity {
  name: string;
  nights: number;
  activities: string[]; // 4-8 highlight activities
  coordinates?: { lat: number; lng: number }; // Optional coordinates from AI
}

// Draft Itinerary structure
export interface DraftItinerary {
  id: string;
  title: string;
  summary: string;
  cities: DraftCity[];
  experienceStyle?: string; // Short descriptive phrase (6-10 words)
  bestFor?: string[]; // Array of 2-4 tags describing who this suits best
  whyThisTrip?: string[]; // Array of exactly 3 differentiating bullet points
  primaryCountryCode?: string; // ISO country code for image resolution (e.g., "MA", "FR")
  imageFolder?: string; // AI-selected image folder when primaryCountryCode is missing (e.g., "FR", "european-christmas-markets", "_default")
}

interface DraftItinerariesResponse {
  itineraries: DraftItinerary[];
}

/**
 * POST /api/itinerary/draft
 * Generate 1-3 distinct draft itinerary concepts
 * Returns high-level city combinations with nights and activities (no day-by-day schedules)
 */
export async function POST(request: NextRequest) {
  try {
    const body: MasterItinerariesRequest = await request.json();

    console.log('[DRAFT_API_INPUT]', body.destination || body);

    // Extract planning mode, selected cities, and primary country code
    const { planningMode, userSelectedCities: rawUserSelectedCities, primaryCountryCode } = body;
    
    // Defensive normalization: clean city names (remove prefixes, normalize format)
    const normalizeCityName = (input: string): string => {
      return input
        .replace(/^city-/, "")
        .replace(/^area-/, "")
        .replace(/^region-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    };
    
    const userSelectedCities = rawUserSelectedCities?.map(normalizeCityName);

    // Validate required fields
    if (!body.destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Validate date format and order
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO date strings (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Calculate number of days
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Trip duration cannot exceed 30 days' },
        { status: 400 }
      );
    }

    if (daysDiff < 1) {
      return NextResponse.json(
        { error: 'Trip duration must be at least 1 day' },
        { status: 400 }
      );
    }

    // Build prompt for OpenAI (includes manual mode constraints if applicable)
    const prompt = buildDraftItinerariesPrompt(body, daysDiff, planningMode, userSelectedCities, primaryCountryCode);

    // System prompt - strict JSON enforcement
    const systemPrompt = `You are a travel itinerary planner that ONLY returns raw JSON.

You NEVER return explanations, markdown, lists, or commentary.

You NEVER include line breaks inside JSON strings that would break JSON.

You NEVER include quotes inside text unless escaped.

If you need to express quotes inside a string, escape them using \\".

If you need to include apostrophes, use normal apostrophes — do not terminate strings.

Your entire response MUST be valid JSON that can be parsed by JSON.parse().

Do not include a preamble or follow-up text.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Higher temperature for more diverse options
    });

    // Parse response
    let parsedResponse: DraftItinerariesResponse;
    try {
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse itinerary response' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!parsedResponse.itineraries || !Array.isArray(parsedResponse.itineraries)) {
      return NextResponse.json(
        { error: 'Invalid response format: missing itineraries array' },
        { status: 500 }
      );
    }

    // Ensure we have 1-3 itineraries
    const itineraries = parsedResponse.itineraries.slice(0, 3);
    if (itineraries.length === 0) {
      return NextResponse.json(
        { error: 'No itineraries generated' },
        { status: 500 }
      );
    }

    // Determine image folder: use primaryCountryCode if available, otherwise use AI fallback
    let imageFolder: string | undefined = primaryCountryCode;
    if (!imageFolder) {
      try {
        imageFolder = await selectImageFolder(body.destination);
      } catch (error) {
        console.error('Failed to select image folder via AI, using _default:', error);
        imageFolder = '_default';
      }
    }

    // Validate each itinerary structure and add metadata
    for (const itinerary of itineraries) {
      if (!itinerary.id || !itinerary.title || !itinerary.summary || !Array.isArray(itinerary.cities)) {
        return NextResponse.json(
          { error: 'Invalid itinerary structure' },
          { status: 500 }
        );
      }

      // Validate cities
      for (const city of itinerary.cities) {
        if (!city.name || typeof city.nights !== 'number' || !Array.isArray(city.activities)) {
          return NextResponse.json(
            { error: 'Invalid city structure' },
            { status: 500 }
          );
        }
        // Validate coordinates if provided
        if (city.coordinates) {
          if (
            typeof city.coordinates.lat !== 'number' ||
            typeof city.coordinates.lng !== 'number' ||
            city.coordinates.lat < -90 ||
            city.coordinates.lat > 90 ||
            city.coordinates.lng < -180 ||
            city.coordinates.lng > 180
          ) {
            console.warn(`Invalid coordinates for city ${city.name}, ignoring:`, city.coordinates);
            delete city.coordinates; // Remove invalid coordinates
          }
        }
      }

      // Add primaryCountryCode to each itinerary if provided in request
      if (primaryCountryCode) {
        itinerary.primaryCountryCode = primaryCountryCode;
      }
      
      // Add imageFolder to each itinerary (always set, either from primaryCountryCode or AI fallback)
      itinerary.imageFolder = imageFolder;
      
      // Register coordinates from this itinerary's cities
      registerCoordinatesFromCities(itinerary.cities);
      
      console.log('[DRAFT_ITINERARY_CREATED]', {
        destination: itinerary.title,
        imageFolder: itinerary.imageFolder,
        primaryCountryCode: itinerary.primaryCountryCode,
        citiesWithCoordinates: itinerary.cities.filter(c => c.coordinates).length,
      });
    }

    // Validate manual/map mode: ensure all selected cities are included
    if ((planningMode === 'manual' || planningMode === 'map') && userSelectedCities && userSelectedCities.length > 0) {
      const normalizedSelected = userSelectedCities.map(c => c.toLowerCase().trim());
      const invalidItineraries: string[] = [];

      for (const itinerary of itineraries) {
        const itineraryCityNames = itinerary.cities.map(c => c.name.toLowerCase().trim());
        const missingCities = normalizedSelected.filter(
          selected => !itineraryCityNames.some(city => city === selected || city.includes(selected) || selected.includes(city))
        );

        if (missingCities.length > 0) {
          invalidItineraries.push(itinerary.id);
          console.warn(`Itinerary ${itinerary.id} is missing selected cities: ${missingCities.join(', ')}`);
        }
      }

      // If some itineraries are invalid, log warning but don't block
      // In a production system, you might want to retry with a stricter prompt
      if (invalidItineraries.length > 0 && invalidItineraries.length === itineraries.length) {
        console.warn('All itineraries are missing selected cities. Returning as-is (fallback behavior).');
      } else if (invalidItineraries.length > 0) {
        console.warn(`${invalidItineraries.length} itinerary(ies) missing selected cities, but some are valid. Returning all.`);
      }
    }

    return NextResponse.json({
      itineraries,
    });
  } catch (error: any) {
    console.error('Error generating draft itineraries:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate draft itineraries',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Build prompt for draft itinerary generation
 */
function buildDraftItinerariesPrompt(
  request: MasterItinerariesRequest,
  daysDiff: number,
  planningMode?: "auto" | "manual" | "map",
  userSelectedCities?: string[],
  primaryCountryCode?: string
): string {
  const parts: string[] = [];

  parts.push(`Generate 1-3 completely distinct draft itinerary concepts for a trip.`);
  parts.push(`Each itinerary must have DIFFERENT city combinations, route structures, themes, and trip depth.`);

  // USER-SELECTED LOCATIONS (MANDATORY) - Must appear before other instructions
  if ((planningMode === "manual" || planningMode === "map") && userSelectedCities && userSelectedCities.length > 0) {
    parts.push(`\nUSER-SELECTED LOCATIONS (MANDATORY):`);
    parts.push(`The following cities MUST be included in every itinerary variant:`);
    userSelectedCities.forEach(city => {
      parts.push(`- ${city}`);
    });
    parts.push(`\nYou may include additional cities if needed, but you must not omit any of the above.`);
    parts.push(`All selected cities are hard constraints and must appear in each itinerary's cities array.`);
  }

  parts.push(`\nTrip Details:`);
  parts.push(`- Destination: ${request.destination}`);
  if (request.origin) {
    parts.push(`- Origin: ${request.origin}`);
  }
  parts.push(`- Duration: ${daysDiff} days`);
  if (request.pace) {
    parts.push(`- Pace: ${request.pace}`);
  }
  if (request.budget) {
    parts.push(`- Budget: ${request.budget}`);
  }
  if (request.interests && request.interests.length > 0) {
    parts.push(`- Interests: ${request.interests.join(', ')}`);
  }
  if (request.mustSee && request.mustSee.length > 0) {
    parts.push(`- Must-see items: ${request.mustSee.join(', ')}`);
  }
  if (request.travelers?.adults) {
    parts.push(`- Travelers: ${request.travelers.adults} adult(s)`);
    if (request.travelers.kids) {
      parts.push(` and ${request.travelers.kids} kid(s)`);
    }
  }

  // Determine if destination is a theme or place (ephemeral classification, not persisted)
  // Check if destination looks like a theme (e.g., "African safari", "European Christmas markets")
  const isLikelyTheme = 
    request.destination.toLowerCase().includes('safari') ||
    request.destination.toLowerCase().includes('christmas') ||
    request.destination.toLowerCase().includes('markets') ||
    request.destination.toLowerCase().includes('temples') ||
    request.destination.toLowerCase().includes('beaches') ||
    request.destination.toLowerCase().includes('adventure') ||
    (request.destination.split(' ').length <= 3 && 
     !request.destination.includes(',') && 
     !request.destination.match(/^[A-Z][a-z]+$/)); // Not a simple city name

  if (isLikelyTheme) {
    parts.push(`\nThis appears to be a THEME-BASED trip request.`);
    parts.push(`- Theme: ${request.destination}`);
    parts.push(`- DO NOT treat "${request.destination}" as a physical location.`);
    parts.push(`- Infer an appropriate region and use theme keywords to determine suitable cities.`);
  }

  parts.push(`\nDIVERSIFICATION REQUIREMENTS:`);
  if (planningMode === "manual" && userSelectedCities && userSelectedCities.length > 0) {
    parts.push(`You MUST generate DISTINCT options that differ in:`);
    parts.push(`1. Route structures (linear, loop, hub-and-spoke, etc.)`);
    parts.push(`2. Themes (culture, food, adventure, nature, photography, history, etc.)`);
    parts.push(`3. Trip depth (nights per city, pacing)`);
    parts.push(`Note: In manual mode, users can select a maximum of 2 cities. These selected cities must be included in every variant.`);
    parts.push(`If only 1 city is selected, you may suggest 1 additional city. If 2 cities are selected, use only those 2 cities.`);
  } else {
    parts.push(`You MUST generate DISTINCT options that differ in:`);
    parts.push(`1. City combinations (different cities or different routes)`);
    parts.push(`2. Route structures (linear, loop, hub-and-spoke, etc.)`);
    parts.push(`3. Themes (culture, food, adventure, nature, photography, history, etc.)`);
    parts.push(`4. Trip depth (number of cities: 2-6, number of nights per city)`);
  }

  parts.push(`\nDiversification Rules:`);
  if (request.destination.toLowerCase().includes('europe') || 
      request.destination.toLowerCase().includes('asia') ||
      request.destination.toLowerCase().includes('india') ||
      request.destination.toLowerCase().length > 20) {
    parts.push(`- Destination is BROAD. Propose different REGIONS or SUB-REGIONS.`);
    parts.push(`- Example: If "Europe", propose "Western Europe", "Eastern Europe", "Scandinavia", etc.`);
  } else if (request.destination.split(',').length === 1 && 
             !request.destination.toLowerCase().includes('state') &&
             !request.destination.toLowerCase().includes('province')) {
    parts.push(`- Destination appears to be a CITY. Propose different nearby city COMBINATIONS.`);
    parts.push(`- Example: If "Paris", propose "Paris + Loire Valley", "Paris + Normandy", "Paris + Lyon", etc.`);
  } else {
    parts.push(`- Destination is a REGION or STATE. Propose different THEMATIC ROUTES within it.`);
    parts.push(`- Example: If "Karnataka", propose "Temple Trail", "Hill Stations", "Coastal Karnataka", etc.`);
  }

  parts.push(`\nOutput Requirements:`);
  parts.push(`- Generate 1-3 itineraries (prefer 3 if trip is 7+ days, 1-2 if shorter)`);
  if ((planningMode === "manual" || planningMode === "map") && userSelectedCities && userSelectedCities.length > 0) {
    parts.push(`- In manual/map mode, users can select a maximum of 2 cities. Each itinerary must respect this limit.`);
    if (userSelectedCities.length === 1) {
      parts.push(`- Current selection: 1 city. You may suggest 1 additional city to create a complete itinerary.`);
    } else {
      parts.push(`- Current selection: 2 cities. Use only these 2 cities in all itinerary variants.`);
    }
  } else {
    parts.push(`- Each itinerary must have 2-6 cities depending on trip duration`);
  }
  parts.push(`- Assign reasonable night counts that sum to approximately ${daysDiff} nights total`);
  parts.push(`- CRITICAL: No city should have more than 4 nights. If a trip requires more time in one location, split it across multiple cities or redistribute nights.`);
  parts.push(`- Provide 4-6 example experiences per city to illustrate the type of experiences this version offers.`);
  parts.push(`  These are illustrative highlights, not a fixed plan.`);
  parts.push(`  Guidelines:`);
  parts.push(`  - Avoid imperative verbs like "Visit", "Attend", "Tour"`);
  parts.push(`  - Prefer descriptive nouns or phrases`);
  parts.push(`  - Do NOT imply a schedule or sequence`);
  parts.push(`- For each city, include coordinates (latitude and longitude) in decimal degrees.`);
  parts.push(`  Coordinates should represent the city center.`);
  parts.push(`  Latitude must be between -90 and 90, longitude between -180 and 180.`);
  parts.push(`- Titles must be human-friendly (e.g., "Cultural Japan Highlights", "Eastern Europe Adventure Loop")`);
  parts.push(`- For each itinerary, also include:`);
  parts.push(`  1. bestFor: An array of 2-4 short tags describing who this version suits best`);
  parts.push(`     Examples: "culture", "nature", "photography", "nightlife", "slow travel", "food"`);
  parts.push(`     Prefer tags aligned with the user's stated interests when possible`);
  parts.push(`  2. whyThisTrip: An array of exactly 3 short bullet points`);
  parts.push(`     Explain what differentiates this version from the other options`);
  parts.push(`     Focus on experience style, pace, and overall feel`);
  parts.push(`     Do NOT mention optimization, logistics, or transport`);
  parts.push(`  3. experienceStyle (optional but encouraged): A short descriptive phrase (6-10 words max)`);
  parts.push(`     Example: "Quiet nature-focused Bali with coastal villages"`);

  parts.push(`\nDO NOT include:`);
  parts.push(`- Day-by-day schedules`);
  parts.push(`- Transport details`);
  parts.push(`- Flights`);
  parts.push(`- Hotels`);
  parts.push(`- Check-in/check-out times`);
  parts.push(`- Detailed timings`);
  parts.push(`- Specific dates`);

  parts.push(`\nRespond ONLY with JSON in this EXACT structure:`);
  parts.push(`{`);
  parts.push(`  "itineraries": [`);
  parts.push(`    {`);
  parts.push(`      "id": "unique-id",`);
  parts.push(`      "title": "Human-friendly title",`);
  parts.push(`      "experienceStyle": "Short descriptive phrase",`);
  parts.push(`      "bestFor": ["tag1", "tag2", "tag3"],`);
  parts.push(`      "whyThisTrip": [`);
  parts.push(`        "Reason 1",`);
  parts.push(`        "Reason 2",`);
  parts.push(`        "Reason 3"`);
  parts.push(`      ],`);
  parts.push(`      "summary": "2-3 sentence high-level description",`);
  parts.push(`      "cities": [`);
  parts.push(`        {`);
  parts.push(`          "name": "City Name",`);
  parts.push(`          "nights": 2,`);
  parts.push(`          "activities": [`);
          parts.push(`            "Example experience 1",`);
          parts.push(`            "Example experience 2",`);
          parts.push(`            "Example experience 3"`);
          parts.push(`          ],`);
          parts.push(`          "coordinates": { "lat": 48.8566, "lng": 2.3522 }`);
          parts.push(`        }`);
  parts.push(`      ]`);
  parts.push(`      ${primaryCountryCode ? `"primaryCountryCode": "${primaryCountryCode}",` : ''}`);
  parts.push(`    }`);
  parts.push(`  ]`);
  parts.push(`}`);

  parts.push(`\nCRITICAL: Your response MUST be valid JSON only. No markdown, no explanations, no code blocks.`);
  parts.push(`Ensure all strings are properly escaped and the JSON is complete and parseable.`);
  parts.push(`Ensure each itinerary is DISTINCT from the others.`);

  return parts.join('\n');
}

/**
 * Lightweight AI fallback to choose an image folder when primaryCountryCode is missing
 * Returns exactly one folder name from the allowed list
 */
async function selectImageFolder(destination: string): Promise<string> {
  console.log('[IMAGE_FOLDER_SELECTION_START]', {
    destination,
    incomingImageFolder: undefined, // No incoming value - this function always uses AI
  });

  // Final country codes list (all folders in /public/itinerary-images/)
  const allowedCountryCodes = ["AE","AR","AT","AU","BE","BG","BR","CA","CH","CL","CN","CZ","DE","EG","ES","FI","FR","GB","GE","GR","HR","HU","ID","IE","IL","IN","IS","IT","JO","JP","KE","KH","KR","LA","LK","MA","MM","MV","MX","MY","NA","NL","NO","NP","NZ","PE","PH","PL","PT","RO","SA","SE","SG","SI","SK","TH","TR","TZ","US","VN","ZA"];
  // Final theme folders list (all folders in /public/itinerary-images/_themes/)
  const allowedThemeFolders = ["adventure-and-outdoors","african-safari","alpine-scenic-route","european-christmas-markets","greek-islands","himalayas","japan-cherry-blossom","mediterranean-summer","middle-east-luxury","northern-lights","patagonia","romantic-europe","scandinavia","south-east-asia","USA-road-trip"];
  const allowedFolders = [...allowedCountryCodes, ...allowedThemeFolders, "_default"];

  // No direct match check - this function always uses AI
  console.log('[IMAGE_FOLDER_DIRECT_MATCH_CHECK]', {
    destination,
    resolvedFolder: undefined,
    isResolvedFolderAllowed: false,
  });

  console.log('[IMAGE_FOLDER_AI_CHECK]', {
    reason: 'about to decide whether AI fallback is needed',
    resolvedFolder: undefined,
    isResolvedFolderAllowed: false,
  });

  const prompt = `Given a travel destination, return EXACTLY ONE image folder name from this allowed list:

Country codes: ${allowedCountryCodes.join(", ")}
Theme folders: ${allowedThemeFolders.join(", ")}
Default: _default

CRITICAL RULES:
- Return ONLY the folder name as a plain string
- Do NOT return explanations, quotes, or extra text
- Do NOT invent new values - only return values from the allowed list above
- Do NOT return country names - only return country codes (e.g., "FR" not "France")
- Do NOT return aliases - use the canonical folder names only
- Must be an exact match from the allowed list above
- If unsure, return "_default"

ALIAS MAPPINGS (apply these BEFORE choosing final answer):
- "swiss alps" or "swiss-alps" → alpine-scenic-route
- "mediterranean coast" or "mediterranean-coast" → mediterranean-summer

Examples:
Input: "European Christmas Markets" → Output: european-christmas-markets
Input: "Scandinavia" → Output: scandinavia
Input: "Himalayan Region" → Output: himalayas
Input: "Himalayas" → Output: himalayas
Input: "Greek Islands" → Output: greek-islands
Input: "Swiss Alps" → Output: alpine-scenic-route
Input: "Mediterranean Coast" → Output: mediterranean-summer
Input: "Middle East luxury" → Output: middle-east-luxury
Input: "France" → Output: FR
Input: "Marrakech" → Output: MA
Input: "Japan" → Output: JP

Destination: "${destination}"

Return only the folder name:`;

  console.log('[IMAGE_FOLDER_AI_TRIGGERED]', {
    destination,
    availableFolders: allowedFolders,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helper that returns ONLY a single folder name string. No explanations, no markdown, no quotes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more deterministic results
      max_tokens: 50,
    });

    const result = completion.choices[0]?.message?.content?.trim() || '_default';
    
    // Remove quotes if present
    const cleanedResult = result.replace(/^["']|["']$/g, '');
    
    console.log('[IMAGE_FOLDER_AI_RESULT]', {
      destination,
      aiResult: cleanedResult,
    });
    
    console.log('[AI_IMAGE_MATCH_RESULT]', {
      destination,
      aiResult: cleanedResult,
      isAllowedCountry: allowedCountryCodes.includes(cleanedResult),
      isAllowedTheme: allowedThemeFolders.includes(cleanedResult),
    });
    
    // Validate: must be in allowed list
    if (allowedFolders.includes(cleanedResult)) {
      const imageFolder = cleanedResult;
      console.log('[IMAGE_FOLDER_FINAL_RESULT]', {
        destination,
        imageFolder,
      });
      console.log('[SELECT_IMAGE_FOLDER_OUTPUT]', imageFolder);
      return imageFolder;
    }
    
    // If not in allowed list, return default
    console.warn(`AI returned invalid folder "${cleanedResult}" for destination "${destination}", falling back to _default`);
    const imageFolder = '_default';
    console.log('[IMAGE_FOLDER_FINAL_RESULT]', {
      destination,
      imageFolder,
    });
    console.log('[SELECT_IMAGE_FOLDER_OUTPUT]', imageFolder);
    return imageFolder;
  } catch (error) {
    console.error('Error selecting image folder:', error);
    const imageFolder = '_default';
    console.log('[IMAGE_FOLDER_FINAL_RESULT]', {
      destination,
      imageFolder,
    });
    console.log('[SELECT_IMAGE_FOLDER_OUTPUT]', imageFolder);
    return imageFolder;
  }
}

