import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request body interface
interface ItineraryRequest {
  origin?: string;
  destination: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  pace?: string;
  tripType?: string | string[]; // styles array
  mustSee?: string[];
  budget?: string;
  travelers?: {
    adults?: number;
    kids?: number;
  };
  budgetType?: string;
}

// Response interface
interface ItineraryResponse {
  summary: string;
  days: Array<{
    date: string; // YYYY-MM-DD format
    activities: string[];
  }>;
}

/**
 * POST /api/itinerary
 * Generate a draft itinerary using OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ItineraryRequest = await request.json();

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
    const prompt = buildItineraryPrompt(body, daysDiff);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4o-mini as specified (or gpt-4o for GPT-4.1)
      messages: [
        {
          role: 'system',
          content:
            'You are a professional travel planner. Generate detailed, realistic itineraries based on user preferences. Always return valid JSON in the exact format specified.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    let itinerary: ItineraryResponse;
    try {
      itinerary = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate response structure
    if (!itinerary.summary || !Array.isArray(itinerary.days)) {
      return NextResponse.json(
        { error: 'Invalid itinerary structure received from AI' },
        { status: 500 }
      );
    }

    // Ensure dates are in correct format and activities are arrays
    itinerary.days = itinerary.days.map((day) => ({
      date: day.date || '',
      activities: Array.isArray(day.activities) ? day.activities : [],
    }));

    // Return the itinerary
    return NextResponse.json(itinerary);
  } catch (error: any) {
    console.error('Error generating itinerary:', error);

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
        error: 'Failed to generate itinerary',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Build the prompt for OpenAI based on trip parameters
 */
function buildItineraryPrompt(
  params: ItineraryRequest,
  daysDiff: number
): string {
  const parts: string[] = [];

  parts.push(`Generate a detailed ${daysDiff}-day travel itinerary.`);

  // Origin and destination
  if (params.origin) {
    parts.push(`Traveling from: ${params.origin}`);
  }
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
    parts.push(`Travel pace: ${params.pace}`);
  }

  // Trip type/styles
  if (params.tripType) {
    const styles = Array.isArray(params.tripType)
      ? params.tripType
      : [params.tripType];
    if (styles.length > 0) {
      parts.push(`Trip style: ${styles.join(', ')}`);
    }
  }

  // Budget
  if (params.budget) {
    const budgetType = params.budgetType || 'total';
    parts.push(
      `Budget: ${params.budget} (${budgetType === 'perPerson' ? 'per person' : 'total'})`
    );
  }

  // Must-see items
  if (params.mustSee && params.mustSee.length > 0) {
    parts.push(`Must-see items: ${params.mustSee.join(', ')}`);
  }

  parts.push('\nReturn the itinerary in this exact JSON format:');
  parts.push(`{
  "summary": "A brief 2-3 sentence overview of the trip",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "activities": [
        "Morning: Activity description",
        "Afternoon: Activity description",
        "Evening: Activity description"
      ]
    }
  ]
}`);

  parts.push(
    '\nImportant: Generate activities for each day from the start date to the end date. Include realistic timing (Morning, Afternoon, Evening) and detailed activity descriptions. Make the itinerary practical and enjoyable.'
  );

  return parts.join('\n');
}







