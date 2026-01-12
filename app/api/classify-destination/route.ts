import { NextRequest, NextResponse } from 'next/server';
import { classifyUserDestination } from '@/lib/classifyUserDestination';

/**
 * POST /api/classify-destination
 * Classify a user destination input as place or theme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'userInput is required and must be a string' },
        { status: 400 }
      );
    }

    // Call the classification function (runs on server, has access to env vars)
    const classification = await classifyUserDestination(userInput);

    return NextResponse.json(classification, { status: 200 });
  } catch (error: any) {
    console.error('Error classifying destination:', error);
    return NextResponse.json(
      {
        error: 'Failed to classify destination',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}







