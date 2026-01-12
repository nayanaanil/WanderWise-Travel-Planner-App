# Logistics Page Data Structure Audit

## Summary

- **Day-wise plan**: ✅ **Possible** (frontend-derivable)
- **City thumbnails**: ⚠️ **Partially possible** (requires backend enhancement for city-specific images)
- **Hero reuse**: ✅ **Possible** (already implemented)
- **Remove transport rows**: ✅ **Possible** (already implemented)

## Data Sources

The logistics page receives data from:
1. `tripState.structuralRoute` (Phase 2 route output)
2. `tripState.draftItineraries` (for hero image via `selectedDraftItineraryId`)
3. `tripState.destination` (for city thumbnail fallback)

### Key Types

**RouteStep** (from `RouteReader.steps()`):
```typescript
type RouteStep =
  | { kind: 'OUTBOUND_FLIGHT'; from: string; to: string; date: string }
  | { kind: 'TRAVEL'; from: string; to: string; mode?: string; duration?: string }
  | { kind: 'STAY'; city: string; arrival: string; departure: string; nights: number }
  | { kind: 'INBOUND_FLIGHT'; from: string; to: string; date: string }
```

**structuralRoute**:
```typescript
{
  outboundFlight: { fromCity, toCity, date }
  inboundFlight: { fromCity, toCity, date }
  groundRoute: Array<{ fromCity, toCity, departureDayOffset, mode?, ... }>
  derived: {
    arrivalDates: Record<string, string>
    departureDates: Record<string, string>
    totalTripDays: number
    draftStayCities?: string[]
  }
}
```

**DraftItinerary**:
```typescript
{
  id, title, summary, cities: [...]
  primaryCountryCode?: string
  imageFolder?: string
  theme?: string
  themeSlug?: string
}
```

## Detailed Analysis

### A. Day-wise grouping

**Question**: Do we receive data grouped by day?

**Answer**: **NO**, but **frontend-derivable**

**Current state**:
- Steps are sequential (outbound → travel/stays → inbound)
- Each `STAY` step has:
  - `arrival: string` (ISO date)
  - `departure: string` (ISO date)
  - `nights: number`
- No explicit day index or day grouping

**Can day-wise structure be derived?** ✅ **YES**

**Frontend derivation logic**:
1. Start with `outboundFlight.date` as Day 1
2. For each STAY step:
   - Calculate day number: `(new Date(arrival) - new Date(outboundFlight.date)) / (1000 * 60 * 60 * 24) + 1`
   - Group consecutive days in same city
   - Assign day ranges per city stay

**Example**:
```
Day 1: Outbound flight
Day 2-4: City A (3 nights)
Day 5: Travel A→B
Day 5-7: City B (2 nights)
Day 8: Inbound flight
```

**Blockers**: None. Fully frontend-derivable.

---

### B. City-level structure

**Question**: For each city stop, do we have required fields?

**Answer**: ✅ **YES** - All fields present

**Current state**:
- ✅ City name: `step.city` (string)
- ✅ Start date: `step.arrival` (ISO date string)
- ✅ End date: `step.departure` (ISO date string)
- ✅ Nights: `step.nights` (number)
- ✅ Stable order: Guaranteed by `RouteReader.steps()` (strict path order)

**Data quality**:
- Dates are ISO format strings (e.g., "2024-12-15")
- Nights are calculated deterministically (departure - arrival)
- Order is immutable (outbound → groundRoute → inbound)

**Blockers**: None.

---

### C. Flights summary

**Question**: Do we receive outbound and inbound flights with required fields?

**Answer**: ✅ **YES** - Available in `structuralRoute`

**Current state**:
- ✅ Outbound: `structuralRoute.outboundFlight`
  - `fromCity: string`
  - `toCity: string`
  - `date: string` (ISO date)
- ✅ Inbound: `structuralRoute.inboundFlight`
  - `fromCity: string`
  - `toCity: string`
  - `date: string` (ISO date)

**Location**: Directly on `structuralRoute` object, accessed in logistics page.

**Blockers**: None.

---

### D. Hero image

**Question**: Can the same hero image from draft itinerary page be reused?

**Answer**: ✅ **YES** - Already implemented

**Current state**:
- `selectedDraftItinerary` is fetched from `tripState.draftItineraries[selectedDraftItineraryId]`
- Contains image resolution fields:
  - `primaryCountryCode?: string`
  - `imageFolder?: string`
  - `theme?: string`
  - `themeSlug?: string`
- Same `getItineraryImagePath()` helper function is used
- Fallback to `_default/1.jpg` if missing

**Implementation**: ✅ Already working (lines 122-129, 350-364 in logistics page)

**Blockers**: None.

---

### E. Map / route data

**Question**: Do we receive lat/lng per city and ordered route information?

**Answer**: ⚠️ **PARTIALLY** - Static coordinates available, not in route structure

**Current state**:
- ✅ Ordered route: Yes, via `RouteReader.steps()` (strict sequence)
- ⚠️ Coordinates: Not in `structuralRoute` itself
- ✅ Helper function: `getCityCoordinates(cityName: string)` exists in `./utils/cityCoordinates.ts`
  - Returns `{ lat: number, lng: number } | null`
  - Uses static city database
- ✅ Map cities extraction: Already implemented (lines 192-272)

**Limitations**:
- Coordinates are looked up by city name match (could fail for unusual spellings)
- No guarantee of coordinate availability for all cities
- Static database, not dynamic geocoding

**Blockers**: None for current functionality. City name matching is sufficient.

---

## Additional Considerations

### City Thumbnails

**Current implementation**:
- Uses `getCityThumbnailPath(cityName, tripState)`
- Falls back to destination country code or `_default`
- **Limitation**: All cities use same image (country-level, not city-specific)

**To enable city-specific thumbnails**:
- ❌ **Requires backend change**: Add city-to-image mapping
- ⚠️ **Frontend-derivable**: Could map known cities to existing image folders, but incomplete
- 💡 **Recommendation**: Use country-level images (current approach) OR extend backend to include city-level image paths in draft itinerary `cities` array

### Removing Transport Rows

**Current state**: ✅ **Already implemented**
- `TRAVEL` steps are rendered but can be hidden/removed
- Mode information (`step.mode`) is optional
- No blocker to removing these rows from display

### Day-wise Grouping Implementation

**Frontend algorithm** (pseudo-code):
```typescript
function groupStepsByDay(steps: RouteStep[], outboundDate: string): DayGroup[] {
  const dayGroups: DayGroup[] = [];
  let currentDay = 1; // Day 1 = outbound flight day
  
  for (const step of steps) {
    if (step.kind === 'OUTBOUND_FLIGHT') {
      dayGroups.push({ day: 1, steps: [step] });
    } else if (step.kind === 'STAY') {
      const arrivalDay = daysBetween(outboundDate, step.arrival) + 1;
      const departureDay = daysBetween(outboundDate, step.departure) + 1;
      
      // Create day group spanning arrival to departure
      dayGroups.push({
        day: arrivalDay,
        endDay: departureDay,
        city: step.city,
        steps: [step],
        nights: step.nights
      });
    }
    // TRAVEL steps can be omitted or grouped with next city
  }
  
  return dayGroups;
}
```

---

## Blockers Summary

### ✅ No Blockers (Frontend-Derivable)
1. Day-wise grouping - Can derive from dates
2. City structure - All fields present
3. Flights summary - Available in structuralRoute
4. Hero image - Already implemented
5. Removing transport rows - Already possible

### ⚠️ Partial Blockers (Enhancement Opportunities)
1. **City-specific thumbnails**: Currently uses country-level fallback. City-specific images would require:
   - Backend: Include city→image mapping in draft itinerary
   - OR Frontend: Maintain static city→imageFolder mapping (limited coverage)

### ❌ No Missing Critical Data
All required data for day-wise plan layout exists in current data structures.

---

## Recommendations

1. **Day-wise grouping**: ✅ **Go ahead** - Fully frontend-derivable from existing dates
2. **City thumbnails**: ⚠️ **Use country-level** (current approach) unless city-specific mapping is added to backend
3. **Hero image**: ✅ **Already working** - No changes needed
4. **Transport removal**: ✅ **Already implemented** - No blocker

---

**Conclusion**: The logistics page has sufficient data to support day-wise plan layout. All critical data points are present and can be derived on the frontend without backend changes.


