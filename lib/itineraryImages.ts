/**
 * Itinerary Image Resolution Utilities
 * 
 * Single source of truth for resolving local image paths
 * from /public/itinerary-images/
 */

interface ItineraryImageContext {
  themeSlug?: string;
  theme?: string;
  imageFolder?: string;
  primaryCountryCode?: string;
}

/**
 * Resolve image path from itinerary metadata
 * 
 * Priority order:
 * 1. Theme slug (explicit)
 * 2. Theme (converted to slug)
 * 3. imageFolder (AI-selected, supports both country codes and theme folders)
 * 4. primaryCountryCode (legacy support)
 * 5. Default fallback
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

  // Priority 1: Theme slug (explicit)
  if (context.themeSlug) {
    const resolvedPath = `/itinerary-images/_themes/${context.themeSlug}/${imageIndex}.jpg`;
    console.log('[IMAGE_RESOLVER_BRANCH]', 'themeSlug', context.themeSlug);
    console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
    return resolvedPath;
  }

  // Priority 2: Theme (convert to slug format)
  if (context.theme) {
    const themeSlug = context.theme.toLowerCase().replace(/\s+/g, '-');
    const resolvedPath = `/itinerary-images/_themes/${themeSlug}/${imageIndex}.jpg`;
    console.log('[IMAGE_RESOLVER_BRANCH]', 'theme', context.theme);
    console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
    return resolvedPath;
  }

  // Priority 3: imageFolder (AI-selected folder, handles both country codes and theme folders)
  if (context.imageFolder) {
    // Check if it's a theme folder (contains hyphen and is not _default)
    if (context.imageFolder.includes('-') && context.imageFolder !== '_default') {
      const resolvedPath = `/itinerary-images/_themes/${context.imageFolder}/${imageIndex}.jpg`;
      console.log('[IMAGE_RESOLVER_BRANCH]', 'themeFolder', context.imageFolder);
      console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
      return resolvedPath;
    }
    // Otherwise treat as country code or _default
    const resolvedPath = `/itinerary-images/${context.imageFolder}/${imageIndex}.jpg`;
    console.log('[IMAGE_RESOLVER_BRANCH]', 'imageFolder', context.imageFolder);
    console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
    return resolvedPath;
  }

  // Priority 4: Country code (legacy support)
  if (context.primaryCountryCode) {
    const resolvedPath = `/itinerary-images/${context.primaryCountryCode}/${imageIndex}.jpg`;
    console.log('[IMAGE_RESOLVER_BRANCH]', 'primaryCountryCode', context.primaryCountryCode);
    console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
    return resolvedPath;
  }

  // Priority 5: Default fallback (always uses index 1)
  const resolvedPath = `/itinerary-images/_default/1.jpg`;
  console.log('[IMAGE_RESOLVER_BRANCH]', 'DEFAULT');
  console.log('[IMAGE_RESOLVER_OUTPUT]', resolvedPath);
  return resolvedPath;
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

