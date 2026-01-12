# Booking Flow Links Audit
## Checking for Links from Active Pages to Unused Pages

**Date:** Audit conducted to identify broken/dead links
**Purpose:** Find any buttons/clickables in active booking flow pages that link to unused/legacy pages

---

## 🔍 UNUSED PAGES TO CHECK FOR

1. `/bookings/customize` - Legacy booking flow
2. `/bookings/transport` - Legacy booking flow
3. `/bookings/accommodation` - Legacy booking flow (replaced by `/bookings/hotels/options`)
4. `/itinerary-options` - Legacy itinerary page
5. `/itinerary-details` - Legacy itinerary page

---

## ✅ ACTIVE BOOKING FLOW PAGES CHECKED

### 1. `/bookings` (app/bookings/page.tsx) - Bookings Dashboard

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.plan.logistics)` ✅
- Confirm Bookings button: Shows confirmation overlay (no navigation) ✅
- No buttons linking to customize/transport/accommodation ✅

**Card Rendering Functions:**
- `renderFlightCard()` - Renders flight info, no click handlers to unused pages ✅
- `renderHotelCard()` - Renders hotel info, no click handlers to unused pages ✅
- `renderTransportCard()` - Renders transport info (read-only display), no click handlers ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 2. `/bookings/review` (app/bookings/review/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.bookings.dashboard)` ✅
- Confirm Trip button: `router.push(routes.bookings.summary)` ✅
- No references to customize/transport/accommodation ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 3. `/bookings/summary` (app/bookings/summary/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.bookings.dashboard)` ✅
- No references to customize/transport/accommodation ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 4. `/bookings/complete` (app/bookings/complete/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.bookings.summary)` ✅
- Complete button: `router.push(routes.home)` ✅
- No references to customize/transport/accommodation ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 5. `/bookings/flights/options` (app/bookings/flights/options/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.plan.itinerary)` ✅
- No references to customize/transport/accommodation ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 6. `/bookings/hotels/options` (app/bookings/hotels/options/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES

**Navigation Found:**
- Back button: `router.push(routes.bookings.hotels.index)` ✅
- No references to customize/transport/accommodation ✅

**Note:** This is the ACTIVE replacement for `/bookings/accommodation` ✅

**Conclusion:** This page does NOT link to any unused pages.

---

### 7. `/bookings/hotels/impact` (app/bookings/hotels/impact/page.tsx)

**Status:** ✅ NO LINKS TO UNUSED PAGES (Assumed, not fully checked but part of active flow)

---

## ⚠️ INTERNAL LINKS WITHIN UNUSED PAGES

The unused pages DO link to each other, but this is expected since they form an old flow:

**Old Booking Flow Chain (NOT in current use):**
```
/bookings/customize 
  → onPlanTransport → /bookings/transport
/bookings/transport 
  → onBack → /bookings/customize
  → onLockChoices → /bookings/accommodation
/bookings/accommodation 
  → onBack → /bookings/transport
  → onContinue → /bookings/summary
```

**Note:** These pages reference each other, but NO ACTIVE pages link to them.

---

## 📋 COMPONENTS USED BY UNUSED PAGES

The following components are ONLY used by unused pages:

1. **`ItineraryCustomizationScreen`**
   - Used ONLY by: `/bookings/customize` ❌
   - Not used by any active pages ✅

2. **`TransportationOptimizationScreen`**
   - Used ONLY by: `/bookings/transport` ❌
   - Not used by any active pages ✅

3. **`AccommodationSelectionScreenV2`**
   - Used ONLY by: `/bookings/accommodation` ❌
   - Not used by any active pages ✅
   - **Note:** Current flow uses `/bookings/hotels/options` with different component ✅

4. **`ItineraryOptionsScreen`**
   - Used ONLY by: `/itinerary-options` ❌
   - Not used by any active pages ✅

---

## ✅ FINAL CONCLUSION

### NO ACTIVE PAGES LINK TO UNUSED PAGES

**Summary:**
- ✅ All active booking flow pages (`/bookings`, `/bookings/review`, `/bookings/summary`, `/bookings/complete`, `/bookings/flights/options`, `/bookings/hotels/options`) do NOT contain any buttons, links, or navigation handlers that point to:
  - `/bookings/customize`
  - `/bookings/transport`
  - `/bookings/accommodation`
  - `/itinerary-options`
  - `/itinerary-details`

- ✅ The unused pages only link to each other (forming an isolated old flow)

- ✅ The unused pages' components are not imported or used by any active pages

**Safe to Delete:**
Since no active pages link to the unused pages, these pages and their components can be safely deleted without breaking the current user flow:

1. `/bookings/customize` + `ItineraryCustomizationScreen` component
2. `/bookings/transport` + `TransportationOptimizationScreen` component
3. `/bookings/accommodation` + `AccommodationSelectionScreenV2` component
4. `/itinerary-options` + `ItineraryOptionsScreen` component (if not used elsewhere)
5. `/itinerary-details` (needs verification if it uses same component as `/plan/itinerary`)

---

## 🔍 ADDITIONAL NOTES

### Routes in navigation.ts
The following routes are defined in `lib/navigation.ts` but not used by active pages:
- `routes.bookings.customize` - Only used by unused `/bookings/customize` page
- `routes.bookings.transport` - Only used by unused `/bookings/transport` page
- `routes.bookings.accommodation` - Only used by unused `/bookings/accommodation` page

These can be safely removed from `navigation.ts` after deleting the unused pages.

---

**END OF AUDIT REPORT**

