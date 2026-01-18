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
  evaluationSummary?: string;
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
      model: 'gpt-4.1',
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
      console.error('[DRAFT_API_ERROR]', 'Invalid response format: missing itineraries array');
      return NextResponse.json(
        { error: 'Invalid response format: missing itineraries array' },
        { status: 500 }
      );
    }

    // Ensure we have 1-3 itineraries
    const itineraries = parsedResponse.itineraries.slice(0, 3);
    if (itineraries.length === 0) {
      console.error('[DRAFT_API_ERROR]', 'No itineraries generated');
      return NextResponse.json(
        { error: 'No itineraries generated' },
        { status: 500 }
      );
    }

    console.log('[DRAFT_API_ITINERARIES_PARSED]', {
      itinerariesCount: itineraries.length,
      destination: body.destination,
      primaryCountryCode,
      timestamp: Date.now(),
    });
    
    console.log('[DRAFT_API_ABOUT_TO_DETERMINE_IMAGE_FOLDER]', {
      destination: body.destination,
      primaryCountryCode,
      hasPrimaryCountryCode: !!primaryCountryCode,
      step: 'before image folder determination',
    });

    // Determine image folder: use primaryCountryCode if available, otherwise use AI fallback
    console.log('[DRAFT_IMAGE_FOLDER_START]', {
      destination: body.destination,
      primaryCountryCode,
      hasPrimaryCountryCode: !!primaryCountryCode,
      timestamp: Date.now(),
      willDetermineImageFolder: true,
    });
    
    let imageFolder: string | undefined = primaryCountryCode;
    let imageFolderSource: 'primaryCountryCode' | 'ai' | 'default' = primaryCountryCode ? 'primaryCountryCode' : 'default';
    
    console.log('[DRAFT_IMAGE_FOLDER_DECISION]', {
      destination: body.destination,
      primaryCountryCode,
      hasPrimaryCountryCode: !!primaryCountryCode,
      imageFolderBeforeAI: imageFolder,
      willCallAI: !imageFolder,
    });
    
    if (!imageFolder) {
      console.log('[DRAFT_IMAGE_FOLDER_CALLING_AI]', {
        destination: body.destination,
        reason: 'primaryCountryCode is undefined',
      });
      try {
        imageFolder = await selectImageFolder(body.destination);
        imageFolderSource = 'ai';
        console.log('[DRAFT_IMAGE_FOLDER_AI_SELECTED]', {
          destination: body.destination,
          aiSelectedFolder: imageFolder,
        });
      } catch (error) {
        console.error('[DRAFT_IMAGE_FOLDER_AI_ERROR]', {
          destination: body.destination,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        imageFolder = '_default';
        imageFolderSource = 'default';
      }
    } else {
      console.log('[DRAFT_IMAGE_FOLDER_SKIP_AI]', {
        destination: body.destination,
        reason: 'primaryCountryCode provided',
        imageFolder,
      });
    }
    
    console.log('[DRAFT_IMAGE_FOLDER_FINAL]', {
      destination: body.destination,
      primaryCountryCode,
      imageFolder,
      imageFolderSource,
    });

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
        itineraryId: itinerary.id,
        destination: itinerary.title,
        imageFolder: itinerary.imageFolder,
        primaryCountryCode: itinerary.primaryCountryCode,
        imageFolderSource,
        citiesWithCoordinates: itinerary.cities.filter(c => c.coordinates).length,
        cities: itinerary.cities.map(c => c.name),
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
      evaluationSummary: parsedResponse.evaluationSummary,
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

  parts.push(`Generate 1-3 distinct draft itinerary concepts for a trip.`);
  parts.push(`Each itinerary should feel meaningfully different in experience style, route structure, and trip depth, while remaining realistic for the user inputs.`);

  // USER-SELECTED LOCATIONS (MANDATORY) - Must appear before other instructions
  if ((planningMode === "manual" || planningMode === "map") && userSelectedCities && userSelectedCities.length > 0) {
    parts.push(`\nUSER-SELECTED LOCATIONS (HARD CONSTRAINT):`);
    parts.push(`The following cities MUST be included in every itinerary variant:`);
    userSelectedCities.forEach(city => {
      parts.push(`- ${city}`);
    });
    parts.push(`You must not omit any of the above cities.`);
    parts.push(`If 1 city is selected, you may add at most 2 additional cities.`);
    parts.push(`If 2 cities are selected, you may add at most 1 additional city.`);
  }

  parts.push(`\nTrip Details (MANDATORY CONTEXT):`);
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
  if (request.travelers?.adults) {
    parts.push(`- Travelers: ${request.travelers.adults} adult(s)`);
    if (request.travelers.kids) {
      parts.push(` and ${request.travelers.kids} kid(s)`);
    }
  }

  parts.push(`\nAll provided preferences are HARD CONSTRAINTS, not optional inspiration.`);

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

  // PERSONAL RELEVANCE
  parts.push(`\nCORE REQUIREMENT: PERSONAL RELEVANCE`);
  parts.push(`At least ONE itinerary MUST be the closest possible match to the user's stated pace, budget sensitivity, interests, and trip duration.`);
  parts.push(`This itinerary should feel like the most natural fit for this user.`);
  parts.push(`Other itineraries may explore contrasting approaches but must remain reasonable for the same user.`);

  // BEST MATCH IDENTIFICATION (REQUIRED)
  parts.push(`\nBEST MATCH IDENTIFICATION (REQUIRED):`);
  parts.push(`Exactly ONE itinerary MUST be marked as the best match for the user.`);
  parts.push(`This should be the itinerary that most closely aligns with the user’s stated pace, interests, budget sensitivity, and trip duration.`);
  parts.push(`This is NOT the best overall itinerary, only the best fit for THIS user.`);
  parts.push(`All other itineraries must be explicitly marked as not the best match.`);

// DIVERSIFICATION
  parts.push(`\nDIVERSIFICATION REQUIREMENTS:`);
  parts.push(`You MUST generate distinct options that differ in:`);
  parts.push(`1. Route structure (linear, loop, hub-and-spoke, etc.)`);
  parts.push(`2. Overall experience theme (culture, food, nature, photography, slow travel, etc.)`);
  parts.push(`3. Trip depth (number of cities, nights per city, pacing)`);

  // PACE / BUDGET / INTEREST RULES
  parts.push(`\nPACE, BUDGET, AND INTEREST RULES (NON-NEGOTIABLE):`);
  parts.push(`- Relaxed pace → fewer cities, longer stays.`);
  parts.push(`- Fast pace → more cities, shorter stays.`);
  parts.push(`- Lower budget → simpler routes, fewer transitions.`);
  parts.push(`- Higher budget → more variety or depth.`);
  parts.push(`- Interests MUST visibly affect city selection, example activities, and bestFor tags.`);
  parts.push(`If these are not reflected, the itinerary is invalid.`);

  // EXPERIENCE TRADEOFFS
  parts.push(`\nEXPERIENCE TRADEOFFS (REQUIRED):`);
  parts.push(`Each itinerary MUST clearly embody at least one experiential tradeoff such as:`);
  parts.push(`- Depth vs variety`);
  parts.push(`- Slower immersion vs broader coverage`);
  parts.push(`- Flexibility vs structure`);
  parts.push(`Do NOT mention logistics, transport, pricing, or optimization.`);

  // OUTPUT CONTENT RULES
  parts.push(`\nOUTPUT CONTENT RULES:`);
  parts.push(`- Generate 1-3 itineraries (prefer 3 if trip is 7+ days).`);
  parts.push(`- Each itinerary must have 2-6 cities depending on trip duration.`);
  parts.push(`- Assign reasonable night counts that sum to approximately ${daysDiff} nights total.`);
  parts.push(`- CRITICAL: No city may have more than 4 nights.`);
  parts.push(`- Provide 4-6 illustrative experiences per city.`);
  parts.push(`  These are examples only, not a schedule.`);
  parts.push(`  Avoid imperative verbs and avoid implying sequence or timing.`);
  parts.push(`Each itinerary object MUST include a boolean field "isBestMatch".`);
  parts.push(`Exactly one itinerary must have "isBestMatch": true.`);
  parts.push(`All other itineraries must have "isBestMatch": false.`);

  // bestFor
  parts.push(`\nbestFor RULES:`);
  parts.push(`- Provide 2-4 short tags per itinerary.`);
  parts.push(`- If user interests are provided, at least ONE tag must overlap with those interests.`);
  parts.push(`- Tags must distinguish who this itinerary suits best.`);

  // whyThisTrip
  parts.push(`\nwhyThisTrip RULES (CRITICAL):`);
  parts.push(`Each itinerary MUST include exactly 3 bullets.`);
  parts.push(`Each bullet MUST either:`);
  parts.push(`- Reference at least one user input (pace, interests, duration, budget, travelers), OR`);
  parts.push(`- Explain a clear experiential tradeoff relative to other options.`);
  parts.push(`Do NOT restate the title or theme.`);
  parts.push(`Do NOT mention logistics, transport, or optimization.`);

  // experienceStyle
  parts.push(`\nexperienceStyle (OPTIONAL BUT ENCOURAGED):`);
  parts.push(`- 6-10 words describing the emotional and experiential tone.`);

 // PAGE-LEVEL EVALUATION SUMMARY (REQUIRED)
  parts.push(`\nPAGE-LEVEL EVALUATION SUMMARY (REQUIRED):`);
  parts.push(`You MUST include a short evaluation summary explaining how these itinerary options were shaped for the user.`);
  parts.push(`This summary must:`);
  parts.push(`- Clearly refer to the itinerary marked with "isBestMatch": true as the one made specifically for the user.`);
  parts.push(`- Explain what that itinerary emphasizes in plain, everyday language.`);
  parts.push(`- Briefly explain how the other options differ.`);
  parts.push(`- Reference at least one explicit user preference (pace, interests, budget, or duration).`);
  parts.push(`- Be 100 words maximum.`);
  parts.push(`- Avoid mentioning logistics, transport, pricing, optimization, or internal labels.`);
  parts.push(`- Do NOT refer to itineraries by index or number.`);
  parts.push(`- Write in a very casual, friendly, conversational tone, like a close friend helping you decide.`);
  parts.push(`- Wordplay on "WanderWise" is allowed but should be subtle and not forced.`);
  parts.push(`- Have short sentences`);
  parts.push(`- Required tone target (implicit, enforced by rules), Second person (“you”, “your trip”), Slightly cheeky but reassuring, Sounds spoken, not analytical.`);
  parts.push(`- Example (do not follow this example exactly): You said you want to enjoy the trip, not sprint through it, so these options reflect that. This keeps things slower and more immersive, `);
  parts.push(`while the others squeeze in more places if you're feeling ambitious. Very WanderWise, Very future you will thank you.`);

  // DO NOT INCLUDE
  parts.push(`\nDO NOT INCLUDE:`);
  parts.push(`- Day-by-day schedules`);
  parts.push(`- Transport details`);
  parts.push(`- Flights`);
  parts.push(`- Hotels`);
  parts.push(`- Check-in/check-out times`);
  parts.push(`- Specific dates`);
  parts.push(`- Detailed timings`);

  parts.push(`\nRespond ONLY with JSON in this EXACT structure:`);
  parts.push(`{`);
  parts.push(`  "evaluationSummary": "2-3 sentence explanation of how WanderWise evaluated these options and which best matches the user's preferences.",`);
  parts.push(`  "itineraries": [`);
  parts.push(`    {`);
  parts.push(`      "id": "unique-id",`);
  parts.push(`      "isBestMatch": true,`);
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
          parts.push(`        }`);
  parts.push(`      ]`);
  parts.push(`      ${primaryCountryCode ? `"primaryCountryCode": "${primaryCountryCode}",` : ''}`);
  parts.push(`    }`);
  parts.push(`  ]`);
  parts.push(`}`);

  parts.push(`\nCRITICAL:`);
  parts.push(`- Output valid JSON only.`);
  parts.push(`- No markdown, no explanations.`);
  parts.push(`- Ensure all strings are escaped and parseable.`);
  parts.push(`- Ensure each itinerary is clearly distinct.`);
  parts.push(`- Ensure at least one itinerary is the closest fit to the user's preferences.`);
  
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

  const prompt = `You are an image folder resolver for a travel app.

Your task is to map a destination string to EXACTLY ONE image folder
from the allowed list below.

You MUST follow the decision process in order.
Do NOT skip steps.

--------------------------------
ALLOWED OUTPUTS (ONLY THESE):
Country codes:
${allowedCountryCodes.join(", ")}

Theme folders:
${allowedThemeFolders.join(", ")}

Default:
_default
--------------------------------

DECISION PROCESS (MANDATORY):

STEP 1 — SIGNAL EXTRACTION
- Identify ANY country, nationality, city, region, landmark, cuisine, culture, or geography mentioned or implied.
- Normalize adjectives to countries (e.g., "Indian" → India).
- Normalize regions to representative countries when applicable.

STEP 2 — COUNTRY MATCH (HIGHEST PRIORITY)
- If ANY country can be reasonably inferred, return its COUNTRY CODE.
- This includes:
  - Cities
  - Landmarks
  - Cultural references
  - Cuisine
  - Adjectives (e.g., "Japanese", "South Indian")
- If multiple countries are implied, choose the MOST REPRESENTATIVE one.

STEP 3 — THEME MATCH
- Only if NO country can be inferred:
  - Match against THEME folders.
  - Prefer specific themes over generic ones.

STEP 4 — DEFAULT (LAST RESORT)
- Return "_default" ONLY IF:
  - No country can be inferred
  - AND no theme can be inferred
- If you return "_default", you must be confident that the destination is too vague.

--------------------------------
ALIAS & NORMALIZATION RULES (APPLY BEFORE FINAL DECISION):

- "swiss alps" → alpine-scenic-route
- "mediterranean coast" → mediterranean-summer
- Any mention of "india", "indian", "south indian", "north indian" → IN
- "taj mahal", "rajasthan", "goa", "kerala", "mumbai", "delhi" → IN
- "bali" → ID
- "thai", "thailand" → TH
- "japan", "japanese" → JP
- "france", "french" → FR
- "spain", "spanish" → ES
- "italy", "italian" → IT
- "greece", "greek" → GR
- "turkey", "turkish" → TR
- "egypt", "egyptian" → EG
- "morocco", "moroccan", "marrakech" → MA
- "south america", "south american" → BR
- "patagonia" → patagonia
- "scandinavia" → scandinavia
- "himalayas", "himalayan" → himalayas

--------------------------------
CRITICAL OUTPUT RULES:
- Output EXACTLY ONE value
- Output ONLY the folder name
- No quotes, no punctuation, no explanation
- Must be an EXACT match from the allowed list
- Never invent new values

--------------------------------
EXAMPLES (CORRECT BEHAVIOR):

"South Indian Temples" → IN
"Japanese food tour" → JP
"Nordic winter lights" → scandinavia
"European Christmas Markets" → european-christmas-markets
"Ancient ruins" → _default

--------------------------------
Destination:
"${destination}"

Return ONLY the folder name:`;

  console.log('[IMAGE_FOLDER_AI_TRIGGERED]', {
    destination,
    availableFolders: allowedFolders,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
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

    const rawResult = completion.choices[0]?.message?.content?.trim() || '_default';
    
    // Remove quotes if present
    const cleanedResult = rawResult.replace(/^["']|["']$/g, '');
    
    // Normalize to uppercase for country codes (but keep themes as-is)
    const normalizedResult = allowedCountryCodes.includes(cleanedResult.toUpperCase()) 
      ? cleanedResult.toUpperCase() 
      : cleanedResult;
    
    console.log('[IMAGE_FOLDER_AI_RESULT]', {
      destination,
      rawAIResult: rawResult,
      cleanedResult,
      normalizedResult,
      promptUsed: prompt.substring(0, 200) + '...', // First 200 chars of prompt
    });
    
    console.log('[AI_IMAGE_MATCH_RESULT]', {
      destination,
      aiResult: normalizedResult,
      isAllowedCountry: allowedCountryCodes.includes(normalizedResult),
      isAllowedTheme: allowedThemeFolders.includes(normalizedResult),
      isValid: allowedFolders.includes(normalizedResult),
    });
    
    // Validate: must be in allowed list (use normalized result)
    if (allowedFolders.includes(normalizedResult)) {
      const imageFolder = normalizedResult;
      console.log('[IMAGE_FOLDER_FINAL_RESULT]', {
        destination,
        imageFolder,
        source: 'ai_valid',
      });
      console.log('[SELECT_IMAGE_FOLDER_OUTPUT]', imageFolder);
      return imageFolder;
    }
    
    // If not in allowed list, return default
    console.warn('[IMAGE_FOLDER_AI_INVALID]', {
      destination,
      aiReturned: normalizedResult,
      allowedFolders: allowedFolders.slice(0, 10) + '...', // Show first 10 for reference
      reason: 'AI result not in allowed list',
    });
    const imageFolder = '_default';
    console.log('[IMAGE_FOLDER_FINAL_RESULT]', {
      destination,
      imageFolder,
      source: 'ai_invalid_fallback',
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

