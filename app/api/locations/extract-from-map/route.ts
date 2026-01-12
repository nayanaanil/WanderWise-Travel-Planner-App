import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MapLocation {
  name: string;
  reason: string;
}

interface ExtractLocationsResponse {
  locations: MapLocation[];
}

/**
 * POST /api/locations/extract-from-map
 * Analyzes a map image using GPT-4 Vision API and extracts tourist locations
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const destination = formData.get('destination') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate image file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Image file size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Build prompt
    const prompt = destination
      ? `Analyze this map image and identify the top 5 tourist locations/cities visible in the map area. The user is planning a trip to ${destination}. For each location, provide:
1. Location name (city name, landmark name, or area name)
2. A one-sentence explanation of why it's a good place for tourists to visit

Return your response as a JSON object with this exact structure:
{
  "locations": [
    {
      "name": "Location Name",
      "reason": "Why this is a good tourist destination (one sentence)"
    }
  ]
}

Return at most 5 locations. Focus on locations that are clearly visible on the map and would be relevant for a tourist visiting ${destination}.`
      : `Analyze this map image and identify the top 5 tourist locations/cities visible in the map area. For each location, provide:
1. Location name (city name, landmark name, or area name)
2. A one-sentence explanation of why it's a good place for tourists to visit

Return your response as a JSON object with this exact structure:
{
  "locations": [
    {
      "name": "Location Name",
      "reason": "Why this is a good tourist destination (one sentence)"
    }
  ]
}

Return at most 5 locations. Focus on locations that are clearly visible on the map and would be relevant for tourists.`;

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o which supports vision
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from OpenAI' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let parsedResponse: { locations: MapLocation[] };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[EXTRACT_LOCATIONS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!parsedResponse.locations || !Array.isArray(parsedResponse.locations)) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI' },
        { status: 500 }
      );
    }

    // Validate and clean locations
    const validLocations: MapLocation[] = parsedResponse.locations
      .filter((loc: any) => loc.name && loc.reason)
      .slice(0, 5) // Limit to 5 locations
      .map((loc: any) => ({
        name: String(loc.name).trim(),
        reason: String(loc.reason).trim(),
      }));

    if (validLocations.length === 0) {
      return NextResponse.json(
        { error: 'No valid locations found in the map' },
        { status: 500 }
      );
    }

    const response: ExtractLocationsResponse = {
      locations: validLocations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[EXTRACT_LOCATIONS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract locations from map' },
      { status: 500 }
    );
  }
}

