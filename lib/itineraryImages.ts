/**
 * Itinerary Image Resolution Utilities
 *
 * Single source of truth for resolving Vercel blob image URLs
 * from itineraryImageMap (Vercel blob storage)
 */
import { itineraryImageMap } from "./itineraryImageMap";

interface ItineraryImageContext {
  themeSlug?: string;
  theme?: string;
  imageFolder?: string;
  primaryCountryCode?: string;
}

/**
 * Resolve image URL from itinerary metadata using Vercel blob storage
 *
 * Priority order:
 * 1. Theme slug (explicit)
 * 2. Theme (converted to slug)
 * 3. imageFolder (AI-selected, supports both country codes and theme folders)
 * 4. primaryCountryCode (legacy support)
 * 5. Default fallback
 *
 * Returns Vercel blob URL from itineraryImageMap
 */
export function getItineraryImagePath(
  context: ItineraryImageContext,
  imageIndex: number = 1
): string {
  console.log('[IMAGE_RESOLVER_INPUT]', {
    imageIndex,
    themeSlug: context?.themeSlug,
    theme: context?.theme,
    imageFolder: context?.imageFolder,
    primaryCountryCode: context?.primaryCountryCode,
  });

  // Helper to get blob URL from map
  const getBlobUrl = (key: string, index: number): string | null => {
    const images = itineraryImageMap[key];
    if (!images || images.length === 0) {
      return null;
    }
    // imageIndex is 1-based, array is 0-based
    const arrayIndex = Math.min(index - 1, images.length - 1);
    return images[arrayIndex] || null;
  };

  // Priority 1: Theme slug (explicit)
  if (context.themeSlug) {
    const mapKey = `_themes/${context.themeSlug}`;
    const blobUrl = getBlobUrl(mapKey, imageIndex);
    if (blobUrl) {
      console.log('[IMAGE_RESOLVER_BRANCH]', 'themeSlug', context.themeSlug);
      console.log('[IMAGE_RESOLVER_OUTPUT]', blobUrl);
      return blobUrl;
    }
  }

  // Priority 2: Theme (convert to slug format)
  if (context.theme) {
    const themeSlug = context.theme.toLowerCase().replace(/\s+/g, '-');
    const mapKey = `_themes/${themeSlug}`;
    const blobUrl = getBlobUrl(mapKey, imageIndex);
    if (blobUrl) {
      console.log('[IMAGE_RESOLVER_BRANCH]', 'theme', context.theme);
      console.log('[IMAGE_RESOLVER_OUTPUT]', blobUrl);
      return blobUrl;
    }
  }

  // Priority 3: imageFolder (AI-selected folder, handles both country codes and theme folders)
  if (context.imageFolder) {
    // Check if it's a theme folder (contains hyphen and is not _default)
    if (context.imageFolder.includes('-') && context.imageFolder !== '_default') {
      const mapKey = `_themes/${context.imageFolder}`;
      const blobUrl = getBlobUrl(mapKey, imageIndex);
      if (blobUrl) {
        console.log('[IMAGE_RESOLVER_BRANCH]', 'themeFolder', context.imageFolder);
        console.log('[IMAGE_RESOLVER_OUTPUT]', blobUrl);
        return blobUrl;
      }
    }
    // Otherwise treat as country code or _default
    const mapKey = context.imageFolder === '_default' ? '_default' : context.imageFolder.toUpperCase();
    const blobUrl = getBlobUrl(mapKey, imageIndex);
    if (blobUrl) {
      console.log('[IMAGE_RESOLVER_BRANCH]', 'imageFolder', context.imageFolder);
      console.log('[IMAGE_RESOLVER_OUTPUT]', blobUrl);
      return blobUrl;
    }
  }

  // Priority 4: Country code (legacy support)
  if (context.primaryCountryCode) {
    const mapKey = context.primaryCountryCode.toUpperCase();
    const blobUrl = getBlobUrl(mapKey, imageIndex);
    if (blobUrl) {
      console.log('[IMAGE_RESOLVER_BRANCH]', 'primaryCountryCode', context.primaryCountryCode);
      console.log('[IMAGE_RESOLVER_OUTPUT]', blobUrl);
      return blobUrl;
    }
  }

  // Priority 5: Default fallback (always uses index 1)
  const defaultBlobUrl = getBlobUrl('_default', 1);
  if (defaultBlobUrl) {
    console.log('[IMAGE_RESOLVER_BRANCH]', 'DEFAULT');
    console.log('[IMAGE_RESOLVER_OUTPUT]', defaultBlobUrl);
    return defaultBlobUrl;
  }

  // Ultimate fallback if _default is not in map (should not happen)
  const ultimateFallback = 'https://hegvp3kaqm660g9n.public.blob.vercel-storage.com/_default1/1.jpg';
  console.log('[IMAGE_RESOLVER_BRANCH]', 'ULTIMATE_FALLBACK');
  console.log('[IMAGE_RESOLVER_OUTPUT]', ultimateFallback);
  return ultimateFallback;
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
