# /plan/logistics Page Analysis & Route Optimizer Integration Points

## 1. Route File

**File:** `app/plan/logistics/page.tsx`

- Next.js App Router page component (client component)
- No server-side data fetching (uses client-side state management)

## 2. Main React Component

**Component:** `LogisticsPage` (default export in `app/plan/logistics/page.tsx`)

- Self-contained component (no separate screen component)
- Uses standard React hooks (`useState`, `useEffect`)
- No external component library dependencies for the main UI

## 3. Data-Fetching Logic

### Current Data Sources:

1. **`getTripState()`** from `@/lib/tripState`
   - Reads from `sessionStorage` (key: `'tripState'`)
   - Returns `TripState` object

2. **`getSelectedDraftItinerary()`** from `@/lib/tripState`
   - Retrieves selected draft itinerary from trip state
   - Returns `DraftItinerary | null`

### Data Flow:

```
sessionStorage ('tripState')
  ↓
getTripState() / getSelectedDraftItinerary()
  ↓
useState hooks in LogisticsPage
  ↓
Rendered UI
```

### No Current API Calls:
- No fetch/API calls to external services
- No server components or loaders
- All data comes from sessionStorage

## 4. Current Data Displayed

### Section A - Trip Header:
- **Destination**: `tripState.destination?.label || tripState.destination?.value`
- **Travel Dates**: Parsed from `tripState.dateRange` (from/to dates)
- **Total Nights**: Sum of `city.nights` from `selectedItinerary.cities`
- **Cities Count**: Length of `selectedItinerary.cities` array

### Section B - City Sequence:
- **Source**: `selectedItinerary.cities` array
- **Display**: Each city shows:
  - City name (`city.name`)
  - Nights (`city.nights`)
  - Key activities (`city.activities[]` - first 6 shown)

### Section C - Route View:
- **List View Tab**: Shows city-to-city transitions
  - Displays: `city.name → nextCity.name`
  - Shows nights for each city
- **Map View Tab**: 
  - **Currently**: Placeholder with "Map visualization coming soon"
  - **No actual map library** - just an icon and text

### Section D - Actions:
- Navigation buttons to:
  - `/bookings/transport`
  - `/bookings/accommodation`
  - `/bookings/dashboard`

## 5. City Sequence Source

**Source:** `DraftItinerary` from `selectedDraftItinerary`

**Structure:**
```typescript
interface DraftItinerary {
  id: string;
  title: string;
  summary: string;
  cities: Array<{
    name: string;
    nights: number;
    activities: string[];
  }>;
}
```

**Origin:**
- Set via `setDraftItineraries()` in `lib/tripState.ts`
- Selected via `setSelectedDraftItinerary()` 
- Stored in `tripState.draftItineraries` and `tripState.selectedDraftItineraryId`
- **Not hardcoded** - comes from draft itinerary generation (likely from `/plan/processing` page)

## 6. Map Rendering

**Current State:**
- **No map library** currently integrated
- Map tab shows placeholder:
  ```tsx
  <div className="flex flex-col items-center justify-center h-[200px] text-center">
    <Navigation className="w-12 h-12 text-gray-300 mb-3" />
    <p className="text-gray-500 text-sm">Map visualization coming soon</p>
  </div>
  ```

**Assumptions:**
- Map container is ready (`h-[200px]` fixed height)
- Tab switching mechanism exists (`activeTab` state)
- No map library dependencies in `package.json` (need to verify)

## 7. Extension Points for Route Optimizer Integration

### Point 1: Add Route Optimizer API Call
**Location:** `app/plan/logistics/page.tsx` - `useEffect` hook (around line 19-32)

**Current:**
```tsx
useEffect(() => {
  const state = getTripState();
  const itinerary = getSelectedDraftItinerary();
  // ... validation and state setting
}, [router]);
```

**Integration Point:**
- Add API call to `/api/tools/route-optimizer` after itinerary is loaded
- Transform `DraftItinerary.cities` to `RouteOptimizerInput.stops` format
- Store optimized routes in component state

### Point 2: Route Selection/Switching
**Location:** New section between Section B (City Sequence) and Section C (Route View)

**State Management:**
- Add `useState` for:
  - `optimizedRoutes: OptimizedRouteOption[] | null`
  - `selectedRouteId: string | null`
  - `isLoadingRoutes: boolean`

**UI Component:**
- Route selector dropdown/cards
- Display route summary (outbound/inbound anchors, ground route summary)

### Point 3: Replace City Sequence with Ground Route
**Location:** Section C - Route View (List View tab)

**Current:**
```tsx
{selectedItinerary.cities.map((city, index) => {
  const nextCity = selectedItinerary.cities[index + 1];
  // ... render city → nextCity
})}
```

**Replacement:**
- Use `selectedRoute.groundRoute` (array of `GroundLeg[]`)
- Map `GroundLeg` objects to display:
  - `fromCity → toCity`
  - `departureDayOffset`
  - `modeHint` (train, bus, car, ground-transfer, etc.)
  - `role` (BASE, EXCURSION)

### Point 4: Display Flight Anchors
**Location:** New section or integrate into Section C

**Data Source:**
- `selectedRoute.outboundFlight` (FlightAnchor)
- `selectedRoute.inboundFlight` (FlightAnchor)

**Display:**
- Outbound: `originCity → outboundAnchor.city`
- Inbound: `inboundAnchor.city → returnCity`

### Point 5: Map Visualization
**Location:** Section C - Map View tab

**Requirements:**
- Integrate map library (e.g., react-leaflet, Google Maps, Mapbox)
- Plot cities from `groundRoute` as markers
- Draw route lines between cities
- Show flight anchor cities with different styling

## 8. Files That MUST Be Modified

### Primary Changes:

1. **`app/plan/logistics/page.tsx`**
   - Add Route Optimizer API call in `useEffect`
   - Add state for optimized routes and selection
   - Add route selector UI component
   - Replace city sequence display with ground route rendering
   - Add flight anchor display
   - Integrate map library (if not already present)

### Supporting Changes:

2. **`lib/tripState.ts`** (optional enhancement)
   - Add `selectedOptimizedRouteId` to `TripState` interface
   - Add getter/setter functions for selected route
   - **Note:** May not be necessary if route selection is ephemeral

3. **`package.json`** (if map library needed)
   - Add map library dependency (react-leaflet, @react-google-maps/api, etc.)

## 9. Files That Should NOT Be Touched

### Do NOT Modify:

1. **`lib/route-optimizer/**`** (all files)
   - Route optimizer core logic
   - Gateway normalization
   - Anchor selection
   - Ground route generation
   - Validation rules

2. **`app/api/tools/route-optimizer/route.ts`**
   - API endpoint implementation
   - Request/response shape

3. **`lib/tripState.ts`** (core functions)
   - `getTripState()`, `saveTripState()` - core persistence
   - `getSelectedDraftItinerary()` - existing functionality
   - Only add new fields/functions if needed, don't modify existing

4. **Other page components:**
   - `/plan/destination`, `/plan/duration`, `/plan/pace`, `/plan/must-see`
   - `/plan/itinerary`, `/plan/processing`
   - `/bookings/**` pages

5. **Component libraries:**
   - `@/components/Header`, `@/components/Footer`, `@/components/StepHeader`
   - UI component libraries (`@/ui/**`)

## 10. Data Transformation Required

### Input: DraftItinerary → RouteOptimizerInput

**DraftItinerary format:**
```typescript
{
  cities: [
    { name: "Prague", nights: 3, activities: [...] },
    { name: "Vienna", nights: 2, activities: [...] }
  ]
}
```

**RouteOptimizerInput format:**
```typescript
{
  originCity: string,        // From tripState.fromLocation
  startDate: string,         // ISO string from tripState.dateRange.from
  endDate: string,           // ISO string from tripState.dateRange.to
  returnCity?: string,       // Optional, same as originCity if not set
  stops: [
    { city: "Prague", nights: 3, countryCode?: string },
    { city: "Vienna", nights: 2, countryCode?: string }
  ]
}
```

### Output: OptimizedRouteOption → Display Format

**OptimizedRouteOption format:**
```typescript
{
  id: string,
  structural: {
    groundRoute: GroundLeg[],
    outboundFlight: FlightAnchor,
    inboundFlight: FlightAnchor
  },
  concrete: {
    outboundFlight?: ConcreteFlight,
    inboundFlight?: ConcreteFlight
  },
  score: number,
  // ... other fields
}
```

**Display transformation:**
- Extract `groundRoute` for list/map view
- Extract `outboundFlight`/`inboundFlight` for flight display
- Use `score` for route ranking/selection

## 11. Integration Checklist

- [ ] Add Route Optimizer API call in `useEffect`
- [ ] Add state management for routes (`optimizedRoutes`, `selectedRouteId`)
- [ ] Create route selector UI component
- [ ] Transform `DraftItinerary` to `RouteOptimizerInput`
- [ ] Handle loading/error states for API call
- [ ] Replace city sequence display with ground route rendering
- [ ] Add flight anchor display section
- [ ] Integrate map library (if needed)
- [ ] Update map view to show ground route
- [ ] Add route switching functionality
- [ ] Preserve existing navigation flows
- [ ] Ensure backward compatibility if routes unavailable

## 12. Notes

- **Backward Compatibility**: Page should still work if Route Optimizer API fails or returns no routes
- **State Persistence**: Consider whether selected route should persist in `tripState` or remain ephemeral
- **Performance**: Route optimization may take time - show loading state appropriately
- **Error Handling**: Gracefully handle API errors without breaking the page
- **Map Library**: Choose based on project requirements (cost, features, bundle size)




