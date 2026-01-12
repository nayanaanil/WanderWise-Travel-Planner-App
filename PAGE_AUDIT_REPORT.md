# Page Audit Report
## Travel Planner Application - Current State Analysis

**Date:** Audit conducted before cleanup/archival
**Purpose:** Identify pages in use vs. unused in current user flow

---

## 📊 SUMMARY

- **Total Pages Found:** 26 page.tsx files
- **Pages in Active Flow:** ~18-19 pages
- **Pages Not in Active Flow:** ~7-8 pages
- **Empty Directories (no page.tsx):** 13 directories

---

## ✅ PAGES IN CURRENT USER FLOW

### Home & Planning Flow (Steps 1-9)
1. **`/` (app/page.tsx)** - Home/Landing page
   - Status: ✅ ACTIVE
   - Used in: Entry point, navigation from complete page
   - Component: `HomeScreen`

2. **`/plan/destination` (app/plan/destination/page.tsx)**
   - Status: ✅ ACTIVE - Step 1
   - Used in: Home → Destination, Back navigation from timing
   - Component: `DestinationSelectionScreen`
   - Navigation: → `/plan/timing`

3. **`/plan/timing` (app/plan/timing/page.tsx)**
   - Status: ✅ ACTIVE - Step 2
   - Used in: From destination, back from duration
   - Component: `TripTimingScreen`
   - Navigation: → `/plan/duration`, ← `/plan/destination`

4. **`/plan/duration` (app/plan/duration/page.tsx)**
   - Status: ✅ ACTIVE - Step 3
   - Used in: From timing, back from pace
   - Component: `DurationParametersScreen`
   - Navigation: → `/plan/pace`, ← `/plan/timing`

5. **`/plan/pace` (app/plan/pace/page.tsx)**
   - Status: ✅ ACTIVE - Step 4
   - Used in: From duration, back from locations
   - Component: `PaceStyleParametersScreen`
   - Navigation: → `/plan/locations`, ← `/plan/duration`

6. **`/plan/locations` (app/plan/locations/page.tsx)**
   - Status: ✅ ACTIVE - Step 5
   - Used in: From pace, back from processing
   - Component: `LocationsSelectionScreen`
   - Navigation: → `/plan/processing`, ← `/plan/pace`

7. **`/plan/processing` (app/plan/processing/page.tsx)**
   - Status: ✅ ACTIVE - Step 6 (AI Processing)
   - Used in: From locations
   - Component: `AIProcessingScreen`
   - Navigation: → `/plan/itinerary` (on complete)

8. **`/plan/itinerary` (app/plan/itinerary/page.tsx)**
   - Status: ✅ ACTIVE - Step 7
   - Used in: From processing, back from building/logistics
   - Component: `DetailedItineraryScreen` (likely)
   - Navigation: → `/plan/building`, ← `/plan/processing`

9. **`/plan/building` (app/plan/building/page.tsx)**
   - Status: ✅ ACTIVE - Step 8 (Route Building)
   - Used in: From itinerary
   - Component: Route building loader/processor
   - Navigation: → `/plan/logistics` (on complete)

10. **`/plan/logistics` (app/plan/logistics/page.tsx)**
    - Status: ✅ ACTIVE - Step 9
    - Used in: From building, back from map/flights
    - Component: Logistics/daywise plan screen
    - Navigation: → `/plan/map`, → `/bookings/flights/options`, ← `/bookings/flights/options`

11. **`/plan/map` (app/plan/map/page.tsx)**
    - Status: ✅ ACTIVE - Step 6 (Map View)
    - Used in: From logistics
    - Component: Route map viewer
    - Navigation: ← `/plan/logistics`

### Activities Flow
12. **`/activities/select` (app/activities/select/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From logistics page (add activity cards)
    - Component: Activity selection screen
    - Navigation: ← `/plan/logistics`

### Bookings Flow (Steps 7-10)
13. **`/bookings/flights` (app/bookings/flights/page.tsx)**
    - Status: ✅ ACTIVE - Flight loader
    - Used in: From logistics (indirect)
    - Navigation: → `/bookings/flights/options`

14. **`/bookings/flights/options` (app/bookings/flights/options/page.tsx)**
    - Status: ✅ ACTIVE - Step 7
    - Used in: From logistics, back from logistics
    - Component: `FlightOptionsResultsScreen`
    - Navigation: → `/plan/building`, ← `/plan/logistics`, ← `/plan/itinerary`

15. **`/bookings/hotels` (app/bookings/hotels/page.tsx)**
    - Status: ✅ ACTIVE - Hotel loader
    - Used in: From logistics/hotel cards
    - Navigation: → `/bookings/hotels/options`

16. **`/bookings/hotels/options` (app/bookings/hotels/options/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From hotels page, from logistics
    - Component: Hotel options screen
    - Navigation: ← `/bookings/hotels`, ← `/plan/logistics`

17. **`/bookings/hotels/impact` (app/bookings/hotels/impact/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From hotel options (modal/screen)
    - Component: Hotel impact modal/screen
    - Navigation: ← `/bookings/hotels/options`

18. **`/bookings` (app/bookings/page.tsx)**
    - Status: ✅ ACTIVE - Step 10 (Bookings Dashboard)
    - Used in: From logistics, back from review
    - Component: Bookings overview/dashboard
    - Navigation: → `/bookings/review`, ← `/plan/logistics`

19. **`/bookings/review` (app/bookings/review/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From bookings dashboard
    - Component: Review screen
    - Navigation: → `/bookings/summary`, ← `/bookings`

20. **`/bookings/summary` (app/bookings/summary/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From review
    - Component: Summary screen
    - Navigation: → `/bookings/complete`, ← `/bookings/review`

21. **`/bookings/complete` (app/bookings/complete/page.tsx)**
    - Status: ✅ ACTIVE
    - Used in: From summary
    - Component: `TripCostAndBookingScreen`
    - Navigation: → `/` (home), ← `/bookings/summary`

---

## ⚠️ PAGES NOT IN CURRENT USER FLOW

### Potentially Unused Booking Pages
22. **`/bookings/customize` (app/bookings/customize/page.tsx)**
    - Status: ❌ NOT IN CURRENT FLOW
    - Component: `ItineraryCustomizationScreen`
    - Navigation: References `routes.bookings.customize` in navigation.ts
    - References: Used in `ItineraryCustomizationScreen` component
    - **Note:** Component exists but not linked in current flow (old flow?)

23. **`/bookings/transport` (app/bookings/transport/page.tsx)**
    - Status: ❌ NOT IN CURRENT FLOW
    - Component: `TransportationOptimizationScreen`
    - Navigation: Referenced in `routes.bookings.transport`
    - References: Used in customize → transport → accommodation chain
    - **Note:** Part of old booking flow (customize → transport → accommodation → summary)

24. **`/bookings/accommodation` (app/bookings/accommodation/page.tsx)**
    - Status: ❌ NOT IN CURRENT FLOW
    - Component: `AccommodationSelectionScreenV2`
    - Navigation: Referenced in `routes.bookings.accommodation`
    - References: Used in old flow (transport → accommodation → summary)
    - **Note:** Current flow uses `/bookings/hotels/options` instead

### Old Itinerary Pages (Legacy?)
25. **`/itinerary-options` (app/itinerary-options/page.tsx)**
    - Status: ❌ NOT IN CURRENT FLOW (Likely Legacy)
    - Component: `ItineraryOptionsScreen`
    - Navigation: Not in routes.ts, references `routes.plan.locations`
    - **Note:** Current flow uses `/plan/itinerary` instead
    - **Related:** Component `ItineraryOptionsScreen` may be legacy

26. **`/itinerary-details` (app/itinerary-details/page.tsx)**
    - Status: ❌ NOT IN CURRENT FLOW (Likely Legacy)
    - Component: `DetailedItineraryScreen`
    - Navigation: Not in routes.ts, references `routes.plan.itinerary`
    - **Note:** Current flow uses `/plan/itinerary` instead (which likely uses same component)
    - **Related:** May be duplicate of `/plan/itinerary` functionality

---

## 📁 EMPTY DIRECTORIES (No page.tsx files)

These directories exist but contain no `page.tsx` files:

1. **`app/explore/`** - Empty directory
   - Route: `/explore` (defined in routes.ts)
   - Status: Route exists but no page implemented
   - **Note:** Footer references `/explore` but buttons are disabled

2. **`app/trips/`** - Empty directory
   - Route: `/trips` (defined in routes.ts)
   - Status: Route exists but no page implemented
   - **Note:** Footer references `/trips` but buttons are disabled

3. **`app/profile/`** - Empty directory
   - Route: `/profile` (defined in routes.ts)
   - Status: Route exists but no page implemented
   - **Note:** Footer references `/profile` but buttons are disabled

4. **`app/bookings/flights/preferences/`** - Empty directory
   - Status: ⚠️ DELETED (confirmed in summary)
   - **Note:** Previously removed from flow, back button rewired to `/plan/itinerary`

5. **`app/bookings/flights/confirm/`** - Empty directory
   - Status: Not in routes.ts
   - **Note:** May have been part of old flow

6. **`app/bookings/flights/review/`** - Empty directory
   - Status: Not in routes.ts
   - **Note:** May have been part of old flow

7. **`app/plan/finalizing/`** - Empty directory
   - Status: Not in routes.ts
   - **Note:** Legacy/placeholder?

8. **`app/plan/itinerary/detailed/`** - Empty directory
   - Status: Not in routes.ts
   - **Note:** May have been alternative route to `/itinerary-details`

9. **`app/plan/must-see/`** - Empty directory
   - Status: Not in routes.ts
   - **Note:** Legacy/placeholder? (Must-see items may be in other screens)

10. **`app/plan/optimized-options/`** - Empty directory
    - Status: Not in routes.ts
    - **Note:** Legacy/placeholder?

11. **`app/plan/optimized-results/`** - Empty directory
    - Status: Not in routes.ts
    - **Note:** Legacy/placeholder?

12. **`app/api/itineraries/`** - Empty directory (API route)
    - Status: Not in use (may have been replaced by `/api/itinerary/draft`)

13. **`app/api/itinerary/finalize/`** - Empty directory (API route)
    - Status: Not in use (may be planned for future)

14. **`app/api/itinerary/optimized/`** - Empty directory (API route)
    - Status: Not in use (may be planned for future)

---

## 🔗 RELATIONSHIPS & DEPENDENCIES

### Old Booking Flow (Not Currently Used)
```
/bookings/customize → /bookings/transport → /bookings/accommodation → /bookings/summary
```
- **Components:** 
  - `ItineraryCustomizationScreen`
  - `TransportationOptimizationScreen`
  - `AccommodationSelectionScreenV2`
- **Status:** These components exist but are not linked in current user flow
- **Current Alternative:** `/plan/logistics` → `/bookings/hotels/options` → `/bookings`

### Legacy Itinerary Pages (Not Currently Used)
- `/itinerary-options` - Old version of `/plan/itinerary`
- `/itinerary-details` - Old version of `/plan/itinerary` (detailed view)
- **Status:** Current flow uses `/plan/itinerary` which may use the same components

### Footer Navigation (Disabled)
- `/explore` - Empty directory, button disabled
- `/trips` - Empty directory, button disabled  
- `/profile` - Empty directory, button disabled
- **Status:** Routes defined but pages not implemented, buttons have no onClick handlers

---

## 📝 RECOMMENDATIONS

### Safe to Archive/Delete
1. **`/bookings/customize`** - Not in current flow, old booking flow
2. **`/bookings/transport`** - Not in current flow, old booking flow
3. **`/bookings/accommodation`** - Not in current flow (replaced by `/bookings/hotels/options`)
4. **`/itinerary-options`** - Legacy, replaced by `/plan/itinerary`
5. **`/itinerary-details`** - Legacy, replaced by `/plan/itinerary`
6. All empty directories (13 directories) - No pages, safe to remove

### Review Before Deleting
1. **Components used by unused pages:**
   - `ItineraryCustomizationScreen` - Used only by `/bookings/customize`
   - `TransportationOptimizationScreen` - Used only by `/bookings/transport`
   - `AccommodationSelectionScreenV2` - Used only by `/bookings/accommodation`
   - `ItineraryOptionsScreen` - Used only by `/itinerary-options`
   - **Action:** Check if these components are referenced elsewhere before deleting pages

2. **Routes in navigation.ts:**
   - `routes.bookings.customize`
   - `routes.bookings.transport`
   - `routes.bookings.accommodation`
   - `routes.explore` (but page doesn't exist)
   - `routes.trips` (but page doesn't exist)
   - `routes.profile` (but page doesn't exist)
   - **Action:** Remove unused routes from navigation.ts after page deletion

### Keep (Future Use)
1. Empty directories for footer routes (`/explore`, `/trips`, `/profile`) - May be implemented later
2. Empty API directories (`/api/itinerary/finalize`, `/api/itinerary/optimized`) - May be planned features

---

## ✅ CURRENT USER FLOW SUMMARY

**Active Flow:**
```
Home (/) 
→ Destination (Step 1)
→ Timing (Step 2)
→ Duration (Step 3)
→ Pace (Step 4)
→ Locations (Step 5)
→ Processing (Step 6)
→ Itinerary (Step 7)
→ Building (Step 8)
→ Logistics (Step 9)
  ├→ Map View
  ├→ Flight Options (Step 7)
  └→ Hotel Options
→ Bookings Dashboard (Step 10)
→ Review
→ Summary
→ Complete
→ Home (/)
```

**Activities Flow (Side):**
```
Logistics → Activity Select → Logistics (back)
```

---

## 📋 FILES TO CHECK BEFORE DELETION

1. **Components to verify:**
   - `components/ItineraryCustomizationScreen.tsx`
   - `components/TransportationOptimizationScreen.tsx`
   - `components/AccommodationSelectionScreenV2.tsx`
   - `components/ItineraryOptionsScreen.tsx`

2. **Navigation file:**
   - `lib/navigation.ts` - Remove unused routes

3. **Type definitions:**
   - Check for types/interfaces specific to unused pages

---

**END OF AUDIT REPORT**

