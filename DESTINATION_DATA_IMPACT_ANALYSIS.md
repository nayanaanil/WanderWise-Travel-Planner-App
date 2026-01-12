# Destination Data Impact Analysis

**Date:** 2026-01-11  
**Purpose:** Assess blast radius of changing destination data structure  
**Scope:** All consumers of destination, countryCode, primaryCountryCode, imageFolder  

---

## EXECUTIVE SUMMARY

**Total Destination Consumers:** ~25 files  
**High-Risk Files:** 8  
**Medium-Risk Files:** 12  
**Low-Risk Files:** 5  

**Critical Finding:** Destination data is treated as both string AND object throughout the system, creating a contract mismatch between client state (object) and API contracts (string).

---

## PART 1: DESTINATION CONSUMERS

### 1.1 Core State Management

#### `lib/tripState.ts`
**Usage:** Type definition for TripState.destination
**Assumption:** Destination is an object with:
- `type: 'city' | 'searchPhrase'`
- `value: string`
- `city?: any` (City object with countryCode)
- `seasonalityAnchor?: { type, key }`

**Dependency Type:** HARD  
**Risk Level:** HIGH  
**Notes:** This is the source of truth. Changes here affect all consumers.

---

### 1.2 Destination Selection (Client)

#### `components/DestinationSelectionScreen.tsx`
**Functions:**
- `handleDestinationCardClick()` - Creates DestinationData object
- `validateAndContinue()` - Saves DestinationData to tripState
- `handleDestinationSelect()` - Handles city selection
- `handleDestinationChange()` - Handles text input

**Assumptions:**
- Destination is always an object (DestinationData)
- city object contains countryCode when selected from autocomplete
- Can construct seasonalityAnchor from city or destination name

**Dependency Type:** HARD  
**Risk Level:** HIGH  
**Notes:** Primary creator of destination objects. Sets structure expectation.

---

### 1.3 Draft Itinerary Generation (Client → API Bridge)

#### `lib/generateMasterItineraries.ts`
**Function:** `generateMasterItineraries()`
**Usage:**
- Reads `tripState.destination.value` (line 45, 130)
- Reads `tripState.destination.city.countryCode` (line 97-98)
- Reads `tripState.destination.type` (line 101)
- Extracts primaryCountryCode from destination.city.countryCode OR lookup
- Sends `destination: tripState.destination.value` as STRING to API

**Assumptions:**
- destination is object with `.value`, `.city`, `.type`
- destination.city.countryCode exists when city is selected
- Falls back to country lookup if type === 'searchPhrase'

**Dependency Type:** HARD  
**Risk Level:** CRITICAL  
**Notes:** This is the transformation point where object becomes string. Critical for imageFolder resolution.

---

### 1.4 Draft Itinerary API (Server)

#### `app/api/itinerary/draft/route.ts`
**Function:** POST handler
**Usage:**
- Receives `body.destination` as STRING (line 62, 187)
- Uses `body.destination` for selectImageFolder() (line 187)
- Uses `body.primaryCountryCode` (line 182, 213, 217)
- Sets `itinerary.imageFolder` and `itinerary.primaryCountryCode`

**Assumptions:**
- body.destination is a STRING (not object)
- primaryCountryCode is optional string
- Falls back to selectImageFolder(body.destination) if primaryCountryCode missing
- selectImageFolder() expects string input

**Dependency Type:** HARD  
**Risk Level:** CRITICAL  
**Notes:** This is where imageFolder gets set. If primaryCountryCode is missing and selectImageFolder() gets wrong input, imageFolder becomes "_default".

---

#### `app/api/itinerary/draft/route.ts` - selectImageFolder()
**Function:** `selectImageFolder(destination: string)`
**Usage:**
- Receives destination as STRING
- Uses AI to map destination string → imageFolder name
- Returns string from allowed list or "_default"

**Assumptions:**
- Input is a simple string (e.g., "Japan", "Tokyo", "Bali")
- No access to structured data (city, countryCode)
- Must infer country code from destination name via AI

**Dependency Type:** HARD  
**Risk Level:** HIGH  
**Notes:** This function loses all structured data. If "Japan" is passed but it should be "JP", AI must guess correctly.

---

### 1.5 Image Resolution

#### `lib/itineraryImages.ts`
**Functions:**
- `getItineraryImagePath(context, imageIndex)`
- `getItineraryImagePaths(context, count)`

**Usage:**
- Reads context.imageFolder (priority 3)
- Reads context.primaryCountryCode (priority 4, legacy)
- Falls back to "_default/1.jpg"

**Assumptions:**
- imageFolder or primaryCountryCode are optional strings
- No dependency on destination structure itself
- Works from itinerary metadata only

**Dependency Type:** SOFT  
**Risk Level:** LOW  
**Notes:** This is downstream. It only cares about imageFolder/primaryCountryCode being set correctly. Doesn't read destination.

---

### 1.6 UI Components - Draft Options Screen

#### `components/ItineraryOptionsScreen.tsx`
**Function:** `ItineraryOptionsScreen`
**Usage:**
- Reads `draftItineraries` from tripState
- Uses `itinerary.imageFolder` and `itinerary.primaryCountryCode` for images
- No direct destination access

**Assumptions:**
- DraftItinerary objects have imageFolder and primaryCountryCode
- No dependency on destination structure

**Dependency Type:** SOFT  
**Risk Level:** LOW  
**Notes:** Only reads imageFolder/primaryCountryCode from itinerary objects, not destination.

---

#### `components/ItineraryOptionsScreen.tsx` - LocalImageCarousel
**Function:** `LocalImageCarousel({ itinerary })`
**Usage:**
- Reads itinerary.imageFolder, itinerary.primaryCountryCode
- Passes to getItineraryImagePaths()

**Assumptions:**
- Same as parent component

**Dependency Type:** SOFT  
**Risk Level:** LOW  

---

### 1.7 UI Components - Final Itinerary Page

#### `app/plan/itinerary/page.tsx`
**Function:** `ItineraryPage`
**Usage:**
- Reads draftItineraries from tripState
- Uses getItineraryImagePath() with itinerary.imageFolder/primaryCountryCode
- No direct destination access

**Assumptions:**
- Same as ItineraryOptionsScreen

**Dependency Type:** SOFT  
**Risk Level:** LOW  

---

### 1.8 Seasonality Resolution

#### `app/api/seasonality/resolve/route.ts`
**Function:** `selectSeasonalityKeyAI(destination: string)`
**Usage:**
- Receives destination as STRING
- Uses AI to map destination → seasonality key
- Caches results

**Assumptions:**
- Input is string
- No structured data available
- Must infer from destination name

**Dependency Type:** DERIVED  
**Risk Level:** MEDIUM  
**Notes:** Similar pattern to selectImageFolder. Loses structured data but does inference.

---

### 1.9 Flight Search

#### `lib/phase1/flightSearch.ts`
**Function:** `searchGatewayFlights(originCity: string, gatewayCity: string, ...)`
**Usage:**
- Receives city names as STRINGS
- Resolves airport codes from city names
- No direct tripState.destination access

**Assumptions:**
- Inputs are city name strings
- No dependency on destination structure

**Dependency Type:** SOFT  
**Risk Level:** LOW  
**Notes:** Works with city names, not destination objects.

---

### 1.10 Route Optimizer

#### `lib/route-optimizer/generateStructuralRoutes.ts`
**Usage:** (Need to verify - file not fully analyzed)
**Assumptions:** TBD
**Dependency Type:** TBD
**Risk Level:** TBD

---

### 1.11 Other API Routes

#### `app/api/tools/flights/route.ts`
**Usage:** Likely receives destination as string
**Assumptions:** Standard API pattern (string input)
**Dependency Type:** SOFT
**Risk Level:** MEDIUM

#### `app/api/tools/hotels/route.ts`
**Usage:** Likely receives destination as string
**Assumptions:** Standard API pattern (string input)
**Dependency Type:** SOFT
**Risk Level:** MEDIUM

---

### 1.12 Other Components

#### `components/TripTimingScreen.tsx`
**Usage:** Reads tripState.destination for display
**Assumptions:** Destination exists, may access .value
**Dependency Type:** SOFT
**Risk Level:** LOW

#### `components/LocationsSelectionScreen.tsx`
**Usage:** Uses userSelectedCities (array of strings), likely no direct destination access
**Assumptions:** Works with city name strings, not destination objects
**Dependency Type:** SOFT
**Risk Level:** LOW
**Notes:** Uses userSelectedCities which is separate from destination structure

---

## PART 2: DEPENDENCY CLASSIFICATION

### HARD DEPENDENCIES (Will break if structure changes)

1. **lib/tripState.ts** - Type definition
2. **components/DestinationSelectionScreen.tsx** - Creates destination objects
3. **lib/generateMasterItineraries.ts** - Reads destination.value, destination.city.countryCode, destination.type
4. **app/api/itinerary/draft/route.ts** - Expects body.destination as string, uses for selectImageFolder
5. **app/api/itinerary/draft/route.ts - selectImageFolder()** - Expects string input

### SOFT DEPENDENCIES (Can tolerate missing data)

6. **lib/itineraryImages.ts** - Only uses imageFolder/primaryCountryCode (already derived)
7. **components/ItineraryOptionsScreen.tsx** - Only uses itinerary.imageFolder/primaryCountryCode
8. **app/plan/itinerary/page.tsx** - Only uses itinerary.imageFolder/primaryCountryCode
9. **lib/phase1/flightSearch.ts** - Works with city name strings
10. **app/api/tools/flights/route.ts** - Standard API pattern
11. **app/api/tools/hotels/route.ts** - Standard API pattern
12. **components/TripTimingScreen.tsx** - Display only

### DERIVED DEPENDENCIES (Already does inference)

13. **app/api/seasonality/resolve/route.ts** - Uses AI to infer from string

---

## PART 3: IMPLICIT ASSUMPTIONS

### 3.1 Structure Mismatch

**Critical Issue:** Destination is stored as OBJECT in tripState but sent as STRING to APIs.

**Evidence:**
- `tripState.destination` = `{ type, value, city, seasonalityAnchor }`
- `body.destination` = `tripState.destination.value` (just the string)
- `selectImageFolder(body.destination)` receives only the string

**Impact:** When destination is "Japan" (country), selectImageFolder() gets "Japan" but needs "JP" to match folder.

---

### 3.2 Country Code Extraction Logic

**Location:** `lib/generateMasterItineraries.ts` lines 93-123

**Assumptions:**
1. If `destination.city.countryCode` exists → use it (PRIORITY 1)
2. If `destination.type === 'searchPhrase'` → lookup country code from API (PRIORITY 2)
3. If lookup fails → primaryCountryCode = undefined
4. If primaryCountryCode is undefined → API calls selectImageFolder(body.destination)

**Problem:** When user selects "Japan" from dropdown:
- destination.city may be undefined (country selection, not city)
- destination.type may be 'searchPhrase'
- Lookup may fail or return wrong code
- selectImageFolder("Japan") → AI must guess "JP" correctly

---

### 3.3 Fallback Logic

**Location:** `app/api/itinerary/draft/route.ts` line 182-190

```typescript
let imageFolder: string | undefined = primaryCountryCode;
if (!imageFolder) {
  imageFolder = await selectImageFolder(body.destination);
}
// If selectImageFolder fails → imageFolder = '_default'
```

**Assumption:** selectImageFolder() will always return valid folder name OR throw (caught → '_default')

**Problem:** If primaryCountryCode is missing and selectImageFolder() gets wrong input (e.g., "Japan" instead of structured data), it may return "_default".

---

### 3.4 City Object Assumptions

**Assumption:** When user selects from autocomplete:
- destination.city exists
- destination.city.countryCode exists

**Reality:** When user selects a COUNTRY (not city) from dropdown:
- destination.city may be undefined OR
- destination.city may exist but represent the country
- countryCode may be missing or incorrect

**Evidence from code:**
```typescript
// DestinationSelectionScreen.tsx line 259
city: selectedDestinationCity.type === 'city' ? selectedDestinationCity : undefined,
```

This suggests countries/regions don't set destination.city!

---

### 3.5 API Contract Assumptions

**Assumption:** All APIs expect destination as string (MasterItinerariesRequest.destination: string)

**Reality:** This is correct per type definition, but creates data loss.

**Type Definition:**
```typescript
// types/itinerary.ts
export interface MasterItinerariesRequest {
  destination: string;  // STRING, not object
  primaryCountryCode?: string;  // Optional
}
```

---

## PART 4: STRUCTURED REPORT

### 4.1 Total Consumers

**Total Files Analyzing Destination Data:** ~20 source files (excluding node_modules)

**Breakdown:**
- Core state/type definitions: 2
- Client components (selection/display): 6
- Client → API bridges: 1
- API routes: 6
- Utility libraries: 3
- Route optimizer: 2

---

### 4.2 High-Risk Files (Contract Changes Will Break)

1. **lib/tripState.ts**
   - Type definition
   - All consumers depend on this

2. **components/DestinationSelectionScreen.tsx**
   - Creates destination objects
   - Sets structure expectations

3. **lib/generateMasterItineraries.ts**
   - CRITICAL: Transforms object → string
   - Extracts primaryCountryCode
   - This is the mutation point

4. **app/api/itinerary/draft/route.ts (main handler)**
   - Expects string destination
   - Uses for selectImageFolder()

5. **app/api/itinerary/draft/route.ts (selectImageFolder)**
   - Expects string input
   - Loses all structured data

6. **types/itinerary.ts**
   - MasterItinerariesRequest.destination: string
   - Defines API contract

7. **app/api/seasonality/resolve/route.ts**
   - Similar pattern to selectImageFolder
   - Expects string

8. **components/TripTimingScreen.tsx**
   - Reads destination.value and destination.seasonalityAnchor
   - Reads destination.city for seasonality

---

### 4.3 Medium-Risk Files (May Need Updates)

1. **app/api/tools/flights/route.ts** - Standard API pattern
2. **app/api/tools/hotels/route.ts** - Standard API pattern
3. **app/api/tools/transport/route.ts** - Standard API pattern
4. **app/api/itinerary/route.ts** - May use destination
5. **app/api/itinerary/styles/route.ts** - May use destination
6. **lib/route-optimizer/generateStructuralRoutes.ts** - May use destination
7. **lib/route-optimizer/flightAnchorEligibility.ts** - May use destination
8. **lib/route-optimizer/evaluateConcreteRoutes.ts** - May use destination
9. **lib/getAllowedCities.ts** - May filter by destination
10. **lib/classifyDestination.ts** - May classify destination
11. **lib/classifyUserDestination.ts** - May classify destination
12. **components/TripTimingScreen.tsx** - Display logic

---

### 4.4 Low-Risk Files (Downstream, No Direct Dependency)

1. **lib/itineraryImages.ts** - Only uses imageFolder/primaryCountryCode
2. **components/ItineraryOptionsScreen.tsx** - Only uses itinerary metadata
3. **app/plan/itinerary/page.tsx** - Only uses itinerary metadata
4. **lib/phase1/flightSearch.ts** - Works with city strings
5. **app/plan/logistics/page.tsx** - Uses itinerary data, not destination

---

### 4.5 Existing Normalization Logic

#### Normalization Point 1: generateMasterItineraries.ts
**Location:** Lines 93-123
**Purpose:** Extract primaryCountryCode from destination object
**Logic:**
1. Check destination.city.countryCode
2. If missing, lookup country by name (for searchPhrase types)
3. Pass primaryCountryCode to API

**Gap:** If lookup fails or country selected without city object, primaryCountryCode = undefined

#### Normalization Point 2: API Route Handler
**Location:** app/api/itinerary/draft/route.ts line 182-190
**Purpose:** Set imageFolder from primaryCountryCode or AI fallback
**Logic:**
1. Use primaryCountryCode if available
2. Otherwise call selectImageFolder(body.destination)
3. Fallback to "_default" on error

**Gap:** selectImageFolder() receives only string, loses structured data

#### Normalization Point 3: selectImageFolder()
**Location:** app/api/itinerary/draft/route.ts lines 452-523
**Purpose:** Map destination string → imageFolder name
**Logic:**
1. Use AI to match destination string to allowed folder list
2. Validate result is in allowed list
3. Return folder name or "_default"

**Gap:** No access to countryCode, must infer from destination name

---

## PART 5: KEY FINDINGS

### 5.1 Root Cause of imageFolder = "_default" Issue

**Chain of Events:**
1. User selects "Japan" from dropdown
2. DestinationSelectionScreen creates destination object (type: 'searchPhrase', value: "Japan", city: undefined for countries)
3. generateMasterItineraries.ts reads destination.city.countryCode → undefined
4. Tries country lookup → may fail or return wrong code
5. primaryCountryCode = undefined
6. API receives body.destination = "Japan" (string only)
7. selectImageFolder("Japan") called
8. AI must guess "JP" from "Japan"
9. If AI fails or returns invalid → imageFolder = "_default"

### 5.2 Data Loss Points

1. **generateMasterItineraries.ts line 130:** `destination: tripState.destination.value`
   - Loses: city object, type, seasonalityAnchor
   - Only sends string value

2. **selectImageFolder() function:** Receives only string
   - Loses: All structured data
   - Must infer from name only

### 5.3 Structural Assumptions

1. **destination.city exists for cities but not countries**
2. **destination.type distinguishes cities from searchPhrases**
3. **countryCode is only in destination.city.countryCode**
4. **API contracts expect strings, not objects**

---

## PART 6: RECOMMENDATIONS (ANALYSIS ONLY)

### Safe Change Strategies

1. **Option A: Pass structured data to selectImageFolder()**
   - Change selectImageFolder() to accept object with countryCode
   - Requires API contract change
   - High risk (affects API signature)

2. **Option B: Ensure primaryCountryCode is always set**
   - Fix country code extraction in generateMasterItineraries.ts
   - Handle country selections properly
   - Medium risk (affects one file primarily)

3. **Option C: Send countryCode in API request body**
   - Add countryCode field to MasterItinerariesRequest
   - Populate from destination.city.countryCode
   - Low risk (additive change)

4. **Option D: Fix destination object structure for countries**
   - Ensure destination.city exists for countries with countryCode
   - Fix DestinationSelectionScreen to set city object for countries
   - Medium risk (affects selection logic)

---

## APPENDIX: FILE REFERENCE

### Files Analyzed (Source Code Only)

1. lib/tripState.ts
2. components/DestinationSelectionScreen.tsx
3. lib/generateMasterItineraries.ts
4. app/api/itinerary/draft/route.ts
5. lib/itineraryImages.ts
6. components/ItineraryOptionsScreen.tsx
7. app/plan/itinerary/page.tsx
8. app/api/seasonality/resolve/route.ts
9. lib/phase1/flightSearch.ts
10. types/itinerary.ts
11. components/TripTimingScreen.tsx
12. app/api/tools/flights/route.ts (partial)
13. app/api/tools/hotels/route.ts (partial)

### Files Requiring Further Analysis

- lib/route-optimizer/* (3 files)
- components/LocationsSelectionScreen.tsx
- lib/getAllowedCities.ts
- lib/classifyDestination.ts
- lib/classifyUserDestination.ts
- app/api/tools/transport/route.ts
- app/api/itinerary/route.ts
- app/api/itinerary/styles/route.ts

---

**END OF REPORT**

