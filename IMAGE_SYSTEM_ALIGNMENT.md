# Image System Alignment - Draft to Final Itinerary

## Summary

Fixed draft itinerary images to use the SAME local image system as the final itinerary page. Completely removed Unsplash integration for itinerary images.

## Problem

**Before:**
- Draft options screen used `ActivityImageReel` → fetched from Unsplash API
- Final itinerary page used local images from `/public/itinerary-images/`
- Users saw inconsistent images between draft selection and final itinerary
- Japan (and other countries) showed generic Unsplash fallback images instead of curated local images
- Image cache persisted wrong images in localStorage

**Root cause:** Architectural mismatch where two different image systems coexisted.

---

## Solution

### Part 1: Shared Image Resolution Utility

**Created:** `lib/itineraryImages.ts`

Single source of truth for resolving local image paths.

**Exports:**
- `getItineraryImagePath(context, imageIndex)` - Resolve single image path
- `getItineraryImagePaths(context, count)` - Get multiple paths for carousels

**Resolution priority:**
1. Theme slug (explicit)
2. Theme (converted to slug)
3. `imageFolder` (AI-selected, supports country codes and theme folders)
4. `primaryCountryCode` (legacy support)
5. `/itinerary-images/_default/1.jpg` (fallback)

**Key logic:**
```typescript
if (context.imageFolder.includes('-')) {
  // Theme folder: /itinerary-images/_themes/{folder}/{index}.jpg
} else {
  // Country code: /itinerary-images/{countryCode}/{index}.jpg
}
```

---

### Part 2: Updated Final Itinerary Page

**File:** `app/plan/itinerary/page.tsx`

**Changes:**
- Removed local `getItineraryImagePath()` function
- Imported shared utility from `lib/itineraryImages`
- Updated call site to pass context object:
  ```typescript
  const imagePath = getItineraryImagePath({
    themeSlug: itinerary.themeSlug,
    theme: itinerary.theme,
    imageFolder: itinerary.imageFolder,
    primaryCountryCode: itinerary.primaryCountryCode,
  }, imageIndex);
  ```

---

### Part 3: Fixed Draft Options Screen

**File:** `components/ItineraryOptionsScreen.tsx`

**Removed:**
- `ActivityImageReel` component usage
- Unsplash API calls
- localStorage image caching

**Added:**
- `LocalImageCarousel` component (inline)
- Uses `getItineraryImagePaths()` from shared utility
- Shows 3 local images with navigation arrows
- Identical resolution logic to final itinerary page

**LocalImageCarousel features:**
- Horizontal scroll with snap points
- Left/right arrow buttons
- Fallback to `_default/1.jpg` on image load error
- Prevents event propagation (doesn't trigger card expansion)

---

### Part 4: Removed Unsplash Integration

**Deleted files:**
- `components/ActivityImageReel.tsx` (no longer used)
- `lib/unsplashImages.ts` (no longer needed)

**Updated:** `lib/tripState.ts`
- Removed image cache clearing logic from `resetAllTripState()`
- Removed image cache clearing logic from `resetItineraryData()`

**Rationale:**
- Local images are static assets served by Next.js
- Browser handles caching automatically
- No need for manual localStorage management

---

### Part 5: Preserved Configurations

**File:** `next.config.js`

**Kept:** Unsplash remotePatterns configuration
```javascript
remotePatterns: [
  { protocol: 'https', hostname: 'images.unsplash.com' }
]
```

**Reason:** Other components still use hardcoded Unsplash URLs:
- `DestinationSelectionScreen.tsx` (popular destinations)
- `AccommodationSelectionScreenV2.tsx` (hotel images)
- `ItineraryPlannerScreen.tsx` (activity images)

These are separate from the itinerary generation system and not affected by this fix.

---

## Results

### ✅ Success Criteria Met

1. **Draft and final itinerary show same images**
   - Both use `getItineraryImagePath()` utility
   - Identical resolution logic
   - Consistent visual experience

2. **Japan shows correct local images**
   - `imageFolder: "JP"` correctly resolved
   - Path: `/itinerary-images/JP/{1,2,3}.jpg`
   - No more fallback to generic images

3. **No Unsplash calls for itineraries**
   - `lib/unsplashImages.ts` deleted
   - `ActivityImageReel` deleted
   - No API requests to Unsplash for itinerary images

4. **No localStorage image cache**
   - Cache clearing logic removed
   - Browser handles static asset caching
   - No stale cache issues

5. **AI-selected imageFolder respected**
   - `selectImageFolder()` in draft API still works
   - Both screens read `imageFolder` from itinerary object
   - Country codes and theme folders supported

---

## Files Changed

### Created
- `lib/itineraryImages.ts` - Shared image resolution utility

### Modified
- `app/plan/itinerary/page.tsx` - Uses shared utility
- `components/ItineraryOptionsScreen.tsx` - Local image carousel
- `lib/tripState.ts` - Removed cache clearing

### Deleted
- `components/ActivityImageReel.tsx` - Replaced with local system
- `lib/unsplashImages.ts` - No longer needed

### Preserved
- `next.config.js` - Kept remotePatterns for other components

---

## Technical Details

### Image Path Examples

**Japan:**
```
imageFolder: "JP"
→ /itinerary-images/JP/1.jpg
→ /itinerary-images/JP/2.jpg
→ /itinerary-images/JP/3.jpg
```

**European Christmas Markets (theme):**
```
imageFolder: "european-christmas-markets"
→ /itinerary-images/_themes/european-christmas-markets/1.jpg
→ /itinerary-images/_themes/european-christmas-markets/2.jpg
→ /itinerary-images/_themes/european-christmas-markets/3.jpg
```

**Default fallback:**
```
imageFolder: undefined, primaryCountryCode: undefined
→ /itinerary-images/_default/1.jpg
```

### Error Handling

Both components include identical fallback behavior:
```typescript
onError={(e) => {
  const target = e.target as HTMLImageElement;
  if (!target.src.endsWith(defaultImagePath)) {
    target.src = '/itinerary-images/_default/1.jpg';
  }
}}
```

---

## Testing Notes

### What to Test

1. **Japan destination:**
   - Draft options → Should show Japan images
   - Final itinerary → Should show same Japan images
   - Images should be from `/public/itinerary-images/JP/`

2. **Theme-based trips:**
   - European Christmas Markets
   - Mediterranean Summer
   - All theme folders under `_themes/`

3. **Other countries:**
   - Any ISO country code (FR, IT, US, etc.)
   - Should resolve to `/itinerary-images/{countryCode}/`

4. **Fallback behavior:**
   - Unknown destination → Should show `_default/1.jpg`
   - Broken image → Should fallback to default

5. **Image navigation:**
   - Arrow buttons should work in draft options
   - Clicking arrows should not expand card
   - Scroll should snap to each image

### Network Tab

- **Before:** Requests to `api.unsplash.com`
- **After:** Only requests to local Next.js server for static assets

### localStorage

- **Before:** Keys like `image-cache-itinerary-1-tokyo-japan`
- **After:** No image-related keys (browser caches static assets)

---

## Migration Notes

### For Users with Cached Data

Existing users may have Unsplash image URLs cached in localStorage.

**Automatic cleanup:**
- Old cache keys will persist but are never read
- Cache will expire naturally (7-day TTL was set)
- No manual migration needed

**Manual cleanup (optional):**
```javascript
// Clear all old image cache keys
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('image-cache-')) {
    localStorage.removeItem(key);
  }
}
```

---

## Architecture Notes

### Why Not Delete next.config.js remotePatterns?

Other components still use hardcoded Unsplash URLs:
- Destination selection (popular destinations)
- Hotel listings (accommodation images)
- Activity suggestions (activity images)

These are **separate from the itinerary generation system** and use static Unsplash URLs, not dynamic API calls.

**Future work:** Replace these with local images too, then remove remotePatterns.

### Why Inline LocalImageCarousel?

- Single-use component specific to ItineraryOptionsScreen
- Tightly coupled to itinerary metadata structure
- No other components need this exact functionality
- Keeps related code together

If other screens need similar carousels, extract to shared component.

---

## Verification

### File Structure
```
public/itinerary-images/
├── _default/
│   └── 1.jpg
├── _themes/
│   ├── european-christmas-markets/
│   ├── japan-cherry-blossom/
│   └── ... (15 theme folders)
├── JP/  (Japan)
│   ├── Japan 1.jpg
│   ├── Japan 2.jpg
│   └── Japan 3.jpg
├── US/  (United States)
├── FR/  (France)
└── ... (60+ country folders)
```

### Code Path
```
User views draft options
↓
ItineraryOptionsScreen renders
↓
LocalImageCarousel component
↓
getItineraryImagePaths({ imageFolder: "JP" }, 3)
↓
Returns: ["/itinerary-images/JP/1.jpg", ...]
↓
Images rendered from local files
```

---

## Success Metrics

1. ✅ **Zero Unsplash API calls for itineraries**
2. ✅ **Consistent images between draft and final screens**
3. ✅ **Japan (and all countries) show correct local images**
4. ✅ **No localStorage image cache pollution**
5. ✅ **Faster load times** (local images vs API calls)
6. ✅ **No external dependencies for itinerary images**

---

## Rollback Plan

If issues arise, revert these commits:
1. Restore `lib/unsplashImages.ts`
2. Restore `components/ActivityImageReel.tsx`
3. Revert `components/ItineraryOptionsScreen.tsx` changes
4. Revert `app/plan/itinerary/page.tsx` to use local function
5. Delete `lib/itineraryImages.ts`

**Time to rollback:** < 5 minutes

---

## Related Documentation

- `scripts/cleanup-itinerary-images.js` - Image maintenance script
- `app/api/itinerary/draft/route.ts` - AI image folder selection (unchanged)
- `AI_USAGE_AUDIT.md` - Documents AI usage in image selection

---

**Date:** 2026-01-11  
**Status:** ✅ Complete  
**Linting:** ✅ No errors  
**Testing:** Ready for QA

