/**
 * Itinerary Image Resolution Utilities
 *
 * Single source of truth for resolving itinerary image URLs
 * from the static `itineraryImageMap` (Vercel Blob URLs).
 */

import { itineraryImageMap } from './itineraryImageMap';

interface ItineraryImageContext {
  themeSlug?: string;
  theme?: string;
  imageFolder?: string;
  primaryCountryCode?: string;
}

/**
 * Resolve image URL from itinerary metadata via itineraryImageMap.
 *
 * Resolution priority:
 * 1. themeSlug → `_themes/${themeSlug}`
 * 2. theme (converted to slug) → `_themes/${slug}`
 * 3. imageFolder (used as-is as a key)
 * 4. primaryCountryCode
 * 5. `_default`
 *
 * The final index is clamped to the available images for the resolved key.
 */
export function getItineraryImagePath(
  context: ItineraryImageContext,
  imageIndex: number = 1
): string {
  const themeSlug = context?.themeSlug;
  const theme = context?.theme;
  const imageFolder = context?.imageFolder;
  const primaryCountryCode = context?.primaryCountryCode;

  // Determine the initial key based on priority
  let resolvedKey: string;

  if (themeSlug) {
    resolvedKey = `_themes/${themeSlug}`;
  } else if (theme) {
    const derivedSlug = theme.toLowerCase().replace(/\s+/g, '-');
    resolvedKey = `_themes/${derivedSlug}`;
  } else if (imageFolder) {
    resolvedKey = imageFolder;
  } else if (primaryCountryCode) {
    resolvedKey = primaryCountryCode;
  } else {
    resolvedKey = '_default';
  }

  let images = itineraryImageMap[resolvedKey];

  // If no images for resolvedKey, fall back to _default
  if (!images || images.length === 0) {
    resolvedKey = '_default';
    images = itineraryImageMap[resolvedKey] || [];
  }

  let resolvedUrl = '';

  if (images && images.length > 0) {
    // Clamp 1-based imageIndex into the valid range
    const zeroBasedIndex = Math.max(0, imageIndex - 1);
    const clampedIndex = Math.min(zeroBasedIndex, images.length - 1);
    resolvedUrl = images[clampedIndex];
  }

  console.log('[IMAGE_MAP_RESOLVE]', {
    themeSlug,
    imageFolder,
    primaryCountryCode,
    resolvedKey,
    imageIndex,
    resolvedUrl,
  });

  return resolvedUrl;
}

/**
 * Get multiple image paths for a carousel/reel
 */
export function getItineraryImagePaths(
  context: ItineraryImageContext,
  count: number = 3
): string[] {
  const paths: string[] = [];
  for (let i = 1; i <= count; i++) {
    paths.push(getItineraryImagePath(context, i));
  }
  return paths;
}

