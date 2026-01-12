import { destinationSuggestions } from './destinationSuggestions';

/**
 * Normalize a destination key for lookup
 */
export function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '');
}

/**
 * Get all known destination keys from destinationSuggestions
 */
export function getKnownDestinations(): string[] {
  return Object.keys(destinationSuggestions);
}

/**
 * Classify a free-form destination to a known destination key
 * 
 * Deterministic rules (in order):
 * 1. Exact match (case-insensitive, normalized)
 * 2. Substring match against known destinations
 * 3. Keyword mapping
 * 
 * Returns destination key if match found, null otherwise
 */
export function classifyFreeformDestination(input: string): string | null {
  const normalizedInput = normalizeKey(input);
  const lowerInput = input.toLowerCase();
  const knownDestinations = getKnownDestinations();

  // Step 1: Exact match (case-insensitive, normalized)
  for (const destKey of knownDestinations) {
    if (normalizeKey(destKey) === normalizedInput) {
      return destKey;
    }
  }

  // Step 2: Substring match (e.g., "bali honeymoon" → "Bali")
  for (const destKey of knownDestinations) {
    const normalizedDest = normalizeKey(destKey);
    if (normalizedInput.includes(normalizedDest) || normalizedDest.includes(normalizedInput)) {
      return destKey;
    }
  }

  // Step 3: Keyword mapping
  // Order matters: more specific matches should come first
  const keywordMap: Array<{ keywords: string[]; destination: string }> = [
    { keywords: ['christmas market', 'christmas markets', 'christmas'], destination: 'Central Europe' },
    { keywords: ['european christmas', 'europe christmas'], destination: 'Central Europe' },
    { keywords: ['honeymoon', 'honeymoon destination'], destination: 'Maldives' },
    { keywords: ['beach', 'beach destination', 'beaches'], destination: 'Bali' },
    { keywords: ['uk', 'united kingdom', 'britain', 'great britain'], destination: 'UnitedKingdom' },
    { keywords: ['usa', 'united states', 'america'], destination: 'UnitedStates' },
    { keywords: ['uae', 'united arab emirates'], destination: 'UnitedArabEmirates' },
    { keywords: ['europe'], destination: 'Europe' }, // Keep general "europe" match last
  ];

  for (const mapping of keywordMap) {
    for (const keyword of mapping.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        // Verify the destination exists in our known destinations
        if (knownDestinations.includes(mapping.destination)) {
          return mapping.destination;
        }
      }
    }
  }

  return null;
}

