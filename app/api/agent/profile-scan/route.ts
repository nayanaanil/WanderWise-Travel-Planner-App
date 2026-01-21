import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ProfileScanRequest = {
  extractedText: string;
};

type ProfileScanResponse = {
  inferredFrom: string; // Description of what was inferred from
  confidence: 'low' | 'medium' | 'high';
  traits: Array<{
    name: string;
    value: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  evidenceSnippets: Array<{
    text: string;
    trait: string;
  }>;
};

const SYSTEM_PROMPT = `You are a travel agent inferring travel preferences from user-provided inspiration. 
Do not assume facts. 
Return structured inferences with low/medium confidence.

Analyze the provided text and infer travel preferences, style, and traits. Be conservative with confidence levels - only use "high" confidence when the evidence is very clear and explicit.

Return a JSON object with this exact structure:
{
  "inferredFrom": "Brief description of what type of content was analyzed (e.g., 'Travel blog post about European cities', 'Travel journal entries', 'Pinterest board descriptions')",
  "confidence": "low" | "medium" | "high",
  "traits": [
    {
      "name": "trait name (e.g., 'pace', 'interests', 'budget_sensitivity', 'accommodation_style')",
      "value": "inferred value",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "evidenceSnippets": [
    {
      "text": "exact quote or paraphrase from the source text",
      "trait": "which trait this evidence supports"
    }
  ]
}

Guidelines:
- Only infer traits that have clear evidence in the text
- Use "low" confidence when inference is speculative or based on weak signals
- Use "medium" confidence when there's reasonable evidence but not explicit
- Use "high" confidence only when the text explicitly states or strongly implies the trait
- Include evidence snippets that directly support each trait
- Do not make assumptions about preferences not mentioned in the text
- Keep trait names consistent and descriptive`;

export async function POST(request: NextRequest) {
  try {
    const body: ProfileScanRequest = await request.json();

    if (!body.extractedText || typeof body.extractedText !== 'string') {
      return NextResponse.json(
        { error: 'extractedText is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'extractedText cannot be empty' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this text and infer travel preferences:\n\n${body.extractedText}`,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    let parsed: ProfileScanResponse;
    try {
      parsed = JSON.parse(content) as ProfileScanResponse;
    } catch (err) {
      console.error('[ProfileScan] JSON parse error:', err);
      throw new Error('Failed to parse AI response JSON');
    }

    // Strict JSON validation
    if (!parsed.inferredFrom || typeof parsed.inferredFrom !== 'string') {
      throw new Error('Invalid response structure: inferredFrom is required and must be a string');
    }

    if (!parsed.confidence || !['low', 'medium', 'high'].includes(parsed.confidence)) {
      throw new Error('Invalid response structure: confidence must be "low", "medium", or "high"');
    }

    if (!Array.isArray(parsed.traits)) {
      throw new Error('Invalid response structure: traits must be an array');
    }

    // Validate each trait
    for (const trait of parsed.traits) {
      if (!trait.name || typeof trait.name !== 'string') {
        throw new Error('Invalid trait structure: name is required and must be a string');
      }
      if (!trait.value || typeof trait.value !== 'string') {
        throw new Error('Invalid trait structure: value is required and must be a string');
      }
      if (!trait.confidence || !['low', 'medium', 'high'].includes(trait.confidence)) {
        throw new Error('Invalid trait structure: confidence must be "low", "medium", or "high"');
      }
    }

    if (!Array.isArray(parsed.evidenceSnippets)) {
      throw new Error('Invalid response structure: evidenceSnippets must be an array');
    }

    // Validate each evidence snippet
    for (const snippet of parsed.evidenceSnippets) {
      if (!snippet.text || typeof snippet.text !== 'string') {
        throw new Error('Invalid evidence snippet structure: text is required and must be a string');
      }
      if (!snippet.trait || typeof snippet.trait !== 'string') {
        throw new Error('Invalid evidence snippet structure: trait is required and must be a string');
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[ProfileScan] Error scanning profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan travel profile' },
      { status: 500 }
    );
  }
}
