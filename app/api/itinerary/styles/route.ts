import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request body interface
interface ItineraryStylesRequest {
  destination: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  budget?: string;
  pace?: string; // slow / moderate / fast
  interests?: string[]; // e.g., ['culture', 'photography', 'food', 'nature']
  mustSee?: string[];
  travelers?: {
    adults?: number;
    kids?: number;
  };
  tripType?: string | string[]; // e.g., ['romantic', 'family', 'solo', 'adventure']
}

// Response interface
interface ItineraryStyle {
  id: string;
  title: string;
  description: string;
  whyItMatches: string;
  idealFor: string[];
  highlights: string[];
}

interface ItineraryStylesResponse {
  styles: ItineraryStyle[];
}

/**
 * POST /api/itinerary/styles
 * Generate personalized itinerary style options using OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ItineraryStylesRequest = await request.json();

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

    // Build prompt for OpenAI
    const prompt = buildStylesPrompt(body, daysDiff);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional travel planner specializing in creating personalized itinerary styles. Generate 2-4 unique itinerary style options that match the user\'s preferences, pace, interests, and budget. Each style should be distinct and tailored to different aspects of their trip. Always return valid JSON in the exact format specified.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Slightly higher for more creative/unique style options
      max_tokens: 2000,
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    let response: ItineraryStylesResponse;
    try {
      response = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate response structure
    if (!response.styles || !Array.isArray(response.styles)) {
      return NextResponse.json(
        { error: 'Invalid response structure: styles array is required' },
        { status: 500 }
      );
    }

    // Validate each style has required fields
    for (const style of response.styles) {
      if (
        !style.id ||
        !style.title ||
        !style.description ||
        !style.whyItMatches ||
        !Array.isArray(style.idealFor) ||
        !Array.isArray(style.highlights)
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid style structure: each style must have id, title, description, whyItMatches, idealFor (array), and highlights (array)',
          },
          { status: 500 }
        );
      }
    }

    // Ensure we have 2-4 styles
    if (response.styles.length < 2 || response.styles.length > 4) {
      // If we got more than 4, take first 4; if less than 2, it's an error
      if (response.styles.length < 2) {
        return NextResponse.json(
          { error: 'Expected 2-4 style options, received less than 2' },
          { status: 500 }
        );
      }
      response.styles = response.styles.slice(0, 4);
    }

    // Return the styles
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error generating itinerary styles:', error);

    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          message: error.message,
          status: error.status,
        },
        { status: 500 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Failed to generate itinerary styles',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Build the prompt for OpenAI based on trip parameters
 */
function buildStylesPrompt(
  params: ItineraryStylesRequest,
  daysDiff: number
): string {
  const parts: string[] = [];

  parts.push(
    `Generate ${daysDiff === 1 ? '2' : daysDiff <= 3 ? '3' : '4'} personalized itinerary style options for a ${daysDiff}-day trip.`
  );

  // Destination
  parts.push(`Destination: ${params.destination}`);

  // Dates
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);
  parts.push(
    `Travel dates: ${startDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })} to ${endDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`
  );

  // Travelers
  if (params.travelers) {
    const totalTravelers =
      (params.travelers.adults || 0) + (params.travelers.kids || 0);
    if (totalTravelers > 0) {
      const travelerDetails: string[] = [];
      if (params.travelers.adults) {
        travelerDetails.push(`${params.travelers.adults} adult(s)`);
      }
      if (params.travelers.kids) {
        travelerDetails.push(`${params.travelers.kids} child(ren)`);
      }
      parts.push(`Travelers: ${travelerDetails.join(', ')}`);
    }
  }

  // Pace
  if (params.pace) {
    parts.push(`Travel pace preference: ${params.pace}`);
  }

  // Interests
  if (params.interests && params.interests.length > 0) {
    parts.push(`Interests: ${params.interests.join(', ')}`);
  }

  // Trip type
  if (params.tripType) {
    const types = Array.isArray(params.tripType)
      ? params.tripType
      : [params.tripType];
    if (types.length > 0) {
      parts.push(`Trip type: ${types.join(', ')}`);
    }
  }

  // Budget
  if (params.budget) {
    parts.push(`Budget: ${params.budget}`);
  }

  // Must-see items
  if (params.mustSee && params.mustSee.length > 0) {
    parts.push(`Must-see items: ${params.mustSee.join(', ')}`);
  }

  parts.push('\nGenerate 2-4 distinct itinerary style options. Each style should:');
  parts.push(
    '- Be uniquely tailored to different aspects of the trip (e.g., cultural immersion, adventure, relaxation, luxury, budget-friendly, family-oriented, romantic, etc.)'
  );
  parts.push(
    '- Match the user\'s pace preference (slow = leisurely, moderate = balanced, fast = action-packed)'
  );
  parts.push(
    '- Align with their stated interests and trip type when provided'
  );
  parts.push(
    '- Consider budget constraints when specified (budget-friendly vs. premium experiences)'
  );
  parts.push(
    '- Include must-see items when relevant to that style'
  );
  parts.push(
    '- Be suitable for the number of travelers (family-friendly options if kids are present)'
  );

  parts.push('\nReturn the styles in this exact JSON format:');
  parts.push(`{
  "styles": [
    {
      "id": "unique-style-id-1",
      "title": "Style Name (e.g., 'Cultural Explorer', 'Adventure Seeker', 'Relaxed Wanderer')",
      "description": "A 2-3 sentence description of what this itinerary style offers and its overall approach",
      "whyItMatches": "A 1-2 sentence explanation of why this style matches the user's preferences, pace, interests, or constraints",
      "idealFor": ["traveler type 1", "traveler type 2", "situation 1"],
      "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"]
    },
    {
      "id": "unique-style-id-2",
      "title": "Another Style Name",
      "description": "Description...",
      "whyItMatches": "Why it matches...",
      "idealFor": ["...", "..."],
      "highlights": ["...", "...", "..."]
    }
  ]
}`);

  parts.push(
    '\nImportant: Generate 2-4 distinct styles that offer different approaches to experiencing the destination. Make each style unique and compelling. The styles should complement each other, giving the user meaningful choices based on their preferences.'
  );

  return parts.join('\n');
}







