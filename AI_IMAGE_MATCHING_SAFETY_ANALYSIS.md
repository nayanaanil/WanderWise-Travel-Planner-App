# AI Image Matching Layer Safety Analysis

**Date:** 2026-01-11  
**Purpose:** Assess whether AI-based image folder selection is safe and scoped, or risks corrupting core itinerary data  
**Scope:** selectImageFolder() function and all imageFolder usage  

---

## EXECUTIVE SUMMARY

**AI Image Matching Entry Points:** 1 function  
**Scope of Influence:** Visual-only (image rendering)  
**Risk Level:** LOW  
**Core Data Contamination:** None detected  

**Finding:** The AI image matching layer is properly scoped. `imageFolder` is only used for image path resolution and never affects core itinerary logic, routing, or business rules.

---

## PART 1: AI IMAGE MATCHING LOGIC LOCATION

### 1.1 Primary AI Matching Function

#### `app/api/itinerary/draft/route.ts`
**Function:** `selectImageFolder(destination: string): Promise<string>`

**Location:** Lines 452-533

**Inputs:**
- `destination: string` - Destination name as string (e.g., "Japan", "Bali", "Tokyo")
- Internal: `allowedCountryCodes` array (26 country codes)
- Internal: `allowedThemeFolders` array (11 theme folders)
- Internal: `allowedFolders` array (combines above + "_default")

**Output:**
- `string` - Single folder name from allowed list
- Always returns a value (either matched folder or "_default")

**AI Model:** `gpt-4o-mini`  
**Temperature:** 0.3 (lower = more deterministic)  
**Max Tokens:** 50  

**Logic Flow:**
1. Constructs prompt with destination and allowed folder list
2. Calls OpenAI API to match destination → folder name
3. Validates result is in allowed list
4. Returns matched folder OR "_default" if invalid/error

**Fallback Behavior:**
- If AI returns invalid folder → `"_default"`
- If API call fails → `"_default"`
- If validation fails → `"_default"`

---

## PART 2: OUTPUT USAGE TRACE

### 2.1 Where selectImageFolder() Output is Stored

#### Storage Location 1: Draft Itinerary Objects
**File:** `app/api/itinerary/draft/route.ts`  
**Function:** POST handler (main route handler)  
**Lines:** 184-219

**Assignment:**
```typescript
let imageFolder: string | undefined = primaryCountryCode;
if (!imageFolder) {
  imageFolder = await selectImageFolder(body.destination);
}

// Later, for each itinerary:
itinerary.imageFolder = imageFolder;
itinerary.primaryCountryCode = primaryCountryCode; // Set separately, not from AI
```

**Storage Structure:**
- Stored in: `DraftItinerary` object
- Field: `itinerary.imageFolder`
- Type: `string | undefined`
- Persisted: Yes (in API response, then saved to tripState.draftItineraries)

**Key Observation:**
- `imageFolder` and `primaryCountryCode` are stored SEPARATELY
- `imageFolder` is NEVER assigned to `primaryCountryCode`
- `primaryCountryCode` comes from request body or destination.city.countryCode (deterministic)
- AI output ONLY goes to `imageFolder`, never to `primaryCountryCode`

---

### 2.2 DraftItinerary Type Definition

**File:** `lib/tripState.ts`  
**Lines:** 285-299

```typescript
export interface DraftItinerary {
  id: string;
  title: string;
  summary: string;
  cities: Array<{...}>;
  experienceStyle?: string;
  bestFor?: string[];
  whyThisTrip?: string[];
  primaryCountryCode?: string;  // SEPARATE field
  imageFolder?: string;          // SEPARATE field (AI output goes here)
}
```

**Key Observation:**
- `imageFolder` is optional and separate from `primaryCountryCode`
- No other fields reference `imageFolder`
- Structure clearly separates visual metadata from core data

---

### 2.3 API Response Structure

**File:** `app/api/itinerary/draft/route.ts`  
**Response:** Returns `{ itineraries: DraftItinerary[] }`

**What Gets Returned:**
- Full itinerary objects with `imageFolder` field populated
- Each itinerary gets the SAME `imageFolder` value (set once, applied to all)
- `primaryCountryCode` is also set (from deterministic source)

**Storage Path:**
1. API response → client
2. Client calls `saveTripState({ draftItineraries: response.itineraries })`
3. Stored in `tripState.draftItineraries[]`
4. Each itinerary object contains `imageFolder` field

---

### 2.4 Is This Output Visual-Only or Shared System State?

**Answer:** Visual-only metadata stored in shared state structure

**Explanation:**
- `imageFolder` is stored in `DraftItinerary` objects (which are in tripState)
- However, `imageFolder` is ONLY ever read for image path resolution
- It is NEVER used for:
  - Routing logic
  - Flight search
  - Hotel search
  - Activity generation
  - Seasonality calculations
  - Business rules
  - Decision making

**Scope:** Visual rendering only, despite being stored in state objects.

---

## PART 3: MUTATION BOUNDARIES CHECK

### 3.1 Image Folder Consumers (Read-Only Usage)

#### Consumer 1: Image Resolution Utility
**File:** `lib/itineraryImages.ts`  
**Function:** `getItineraryImagePath(context, imageIndex)`

**Usage:**
- Reads `context.imageFolder` (line 55)
- Uses ONLY for constructing image path string
- No mutations, no side effects
- Returns: `/itinerary-images/{imageFolder}/{index}.jpg`

**Scope:** Visual rendering only

---

#### Consumer 2: Draft Options Screen
**File:** `components/ItineraryOptionsScreen.tsx`  
**Function:** `LocalImageCarousel({ itinerary })`

**Usage:**
- Reads `itinerary.imageFolder` (line 40)
- Passes to `getItineraryImagePaths()` utility
- Uses ONLY for displaying images in carousel
- No mutations, no side effects

**Scope:** Visual rendering only

---

#### Consumer 3: Final Itinerary Page
**File:** `app/plan/itinerary/page.tsx`  
**Function:** `ItineraryPage`

**Usage:**
- Reads `itinerary.imageFolder` (line 173)
- Passes to `getItineraryImagePath()` utility
- Uses ONLY for displaying images
- No mutations, no side effects

**Scope:** Visual rendering only

---

### 3.2 Non-Image Consumers (Searched, None Found)

**Searched For:**
- `imageFolder` used in routing logic → NOT FOUND
- `imageFolder` used in flight search → NOT FOUND
- `imageFolder` used in hotel search → NOT FOUND
- `imageFolder` used in activity generation → NOT FOUND
- `imageFolder` used in seasonality → NOT FOUND
- `imageFolder` used in business rules → NOT FOUND
- `imageFolder` assigned to primaryCountryCode → NOT FOUND
- `imageFolder` assigned to destination → NOT FOUND
- `imageFolder` used in API requests → NOT FOUND
- `imageFolder` sent to backend → NOT FOUND

**Result:** `imageFolder` is ONLY consumed by image rendering logic.

---

### 3.3 Persistence Boundaries

**Where imageFolder is Persisted:**
1. ✅ API response (JSON) → Client
2. ✅ tripState.draftItineraries[] (sessionStorage)
3. ❌ NOT persisted to backend/database
4. ❌ NOT sent in API requests (except in response)
5. ❌ NOT part of final itinerary export
6. ❌ NOT used in booking logic

**Scope:** Client-side session storage only, visual metadata.

---

### 3.4 Assignment Boundaries

**Where imageFolder is Assigned:**
1. ✅ `itinerary.imageFolder = imageFolder;` (API route handler, line 219)
2. ❌ NEVER assigned to `primaryCountryCode`
3. ❌ NEVER assigned to `destination`
4. ❌ NEVER assigned to any core itinerary fields
5. ❌ NEVER mutated after initial assignment

**Safety:** Clear separation from core data fields.

---

## PART 4: FAILURE MODES

### 4.1 AI Returns Wrong but Plausible Match

**Scenario:** AI returns "FR" for "Japan" (wrong but valid folder)

**Validation:**
- Code checks: `if (allowedFolders.includes(cleanedResult))`
- If "FR" is in allowed list → Returns "FR"
- No confidence threshold exists
- No semantic validation exists

**Impact:**
- ❌ Wrong images displayed (France images for Japan trip)
- ✅ No impact on routing, flights, hotels, activities
- ✅ No impact on business logic
- ✅ User sees wrong images but trip planning works correctly

**Risk Level:** LOW (visual only)

---

### 4.2 AI Returns Invalid Folder Name

**Scenario:** AI returns "invalid-folder" (not in allowed list)

**Validation:**
- Code checks: `if (allowedFolders.includes(cleanedResult))`
- If not in list → Logs warning, returns "_default"

**Impact:**
- ✅ Fallback to default images (safe)
- ✅ No data corruption
- ✅ No impact on core logic

**Risk Level:** LOW (safe fallback)

---

### 4.3 AI API Call Fails

**Scenario:** OpenAI API times out or returns error

**Handling:**
- Try/catch block catches error
- Returns "_default"
- Logs error to console

**Impact:**
- ✅ Safe fallback to default images
- ✅ No data corruption
- ✅ Trip generation continues normally

**Risk Level:** LOW (safe fallback)

---

### 4.4 AI Returns Nonexistent Folder

**Scenario:** AI returns "JP" but folder doesn't exist on filesystem

**Validation:**
- Code only validates against ALLOWED LIST (not filesystem)
- No filesystem check exists
- Image will fail to load, browser shows broken image or fallback

**Impact:**
- ❌ Broken/missing images (visual issue)
- ✅ No impact on core logic
- ✅ Browser handles gracefully (image error → fallback UI)

**Risk Level:** LOW (visual only, browser-safe)

---

### 4.5 Confidence Thresholds

**Finding:** NO confidence thresholds exist

**Current Behavior:**
- AI response is accepted if in allowed list
- No confidence score checked
- No uncertainty handling
- No retry logic

**Impact:**
- AI can return any folder from allowed list
- No protection against low-confidence matches
- Relies on AI model quality and prompt design

**Risk Level:** LOW (scope limited to visual only)

---

### 4.6 Explicit "_default" vs Silent Assumption

**Behavior:** "_default" is EXPLICITLY chosen in multiple places

**Explicit Defaults:**
1. Line 190: `imageFolder = '_default';` (catch block)
2. Line 518: `return '_default';` (validation fails)
3. Line 532: `return '_default';` (catch block)
4. Line 82 (lib/itineraryImages.ts): `return '/itinerary-images/_default/1.jpg';` (fallback)

**No Silent Assumptions:**
- All code paths explicitly return "_default" or valid folder
- No undefined values leak through
- No null values used

**Safety:** Explicit fallback behavior, no silent failures.

---

## PART 5: STRUCTURED REPORT

### 5.1 AI Image Matching Entry Points

**Total Entry Points:** 1

1. **Function:** `selectImageFolder(destination: string)`
   - **File:** `app/api/itinerary/draft/route.ts`
   - **Lines:** 452-533
   - **Called From:** API route handler (line 187)
   - **Input:** Destination string (e.g., "Japan")
   - **Output:** Folder name string (e.g., "JP", "_default")
   - **AI Model:** gpt-4o-mini
   - **Validation:** Must be in allowed list (26 countries + 11 themes + "_default")
   - **Fallback:** "_default" on any failure

---

### 5.2 Scope of Influence

**Visual-Only Scope:** ✅ CONFIRMED

**What imageFolder Affects:**
1. ✅ Image path resolution (`lib/itineraryImages.ts`)
2. ✅ Image display in draft options screen (`components/ItineraryOptionsScreen.tsx`)
3. ✅ Image display in final itinerary page (`app/plan/itinerary/page.tsx`)

**What imageFolder Does NOT Affect:**
1. ❌ Routing logic
2. ❌ Flight search
3. ❌ Hotel search
4. ❌ Activity generation
5. ❌ Seasonality calculations
6. ❌ Business rules
7. ❌ Decision engines
8. ❌ API requests (except response)
9. ❌ Backend storage
10. ❌ Booking logic

**Storage Location:**
- Stored in `DraftItinerary.imageFolder` field
- Persisted in `tripState.draftItineraries[]` (sessionStorage)
- NOT persisted to backend/database
- NOT used in API requests

**Separation from Core Data:**
- `imageFolder` is separate field from `primaryCountryCode`
- `imageFolder` is NEVER assigned to `primaryCountryCode`
- `primaryCountryCode` comes from deterministic source (request body or destination.city.countryCode)
- AI output ONLY goes to `imageFolder`

---

### 5.3 Risk Level Assessment

**Overall Risk Level:** LOW

**Reasoning:**
1. ✅ Scope is strictly limited to visual rendering
2. ✅ No mutation of core itinerary data
3. ✅ Clear separation from business logic
4. ✅ Safe fallback behavior ("_default")
5. ✅ No persistence to backend
6. ✅ No impact on routing, flights, hotels, activities

**Potential Issues (Low Impact):**
- Wrong images displayed (visual only, no functional impact)
- No confidence thresholds (relies on AI quality)
- No filesystem validation (browser-safe fallback)

---

### 5.4 Places Where AI Output Leaks into Non-Visual Logic

**Finding:** NONE DETECTED

**Verified:**
- ✅ `imageFolder` is NEVER used outside image rendering
- ✅ `imageFolder` is NEVER assigned to core fields
- ✅ `imageFolder` is NEVER used in business logic
- ✅ `imageFolder` is NEVER sent in API requests
- ✅ `imageFolder` is NEVER persisted to backend

**Conclusion:** AI output is properly isolated to visual metadata only.

---

### 5.5 Data Flow Diagram

```
User selects destination
  ↓
generateMasterItineraries.ts
  ↓
  - Extracts primaryCountryCode (deterministic)
  - Sends destination.value (string) to API
  ↓
API Route Handler
  ↓
  - Receives primaryCountryCode (from request)
  - If missing → calls selectImageFolder(body.destination)
  ↓
selectImageFolder() [AI MATCHING]
  ↓
  - AI maps "Japan" → "JP" (or "_default")
  - Returns folder name string
  ↓
API Route Handler
  ↓
  - Sets itinerary.imageFolder = AI output
  - Sets itinerary.primaryCountryCode = deterministic value (separate!)
  ↓
Response to Client
  ↓
  - DraftItinerary objects with imageFolder field
  ↓
Client Storage (tripState.draftItineraries[])
  ↓
Image Rendering Only
  ↓
  - getItineraryImagePath() reads imageFolder
  - Constructs image path: /itinerary-images/{imageFolder}/{index}.jpg
  - Displays images
```

**Key Points:**
- AI output flows ONLY to `imageFolder` field
- `primaryCountryCode` flows separately (deterministic source)
- `imageFolder` is ONLY consumed by image rendering
- No cross-contamination with core logic

---

## PART 6: ADDITIONAL FINDINGS

### 6.1 Design Pattern

**Pattern:** Visual metadata stored in data structure but isolated in usage

**Rationale:**
- `imageFolder` is stored in `DraftItinerary` for convenience (same object)
- But usage is strictly limited to visual rendering
- Clear separation of concerns maintained

**Assessment:** Safe design pattern, properly scoped.

---

### 6.2 Comparison with primaryCountryCode

**primaryCountryCode:**
- Source: Deterministic (destination.city.countryCode or lookup)
- Usage: Image rendering (same as imageFolder)
- Risk: LOW (deterministic, not AI-driven)

**imageFolder:**
- Source: AI-based matching (selectImageFolder)
- Usage: Image rendering (same as primaryCountryCode)
- Risk: LOW (visual only, safe fallbacks)

**Observation:** Both fields serve the same purpose (image selection) but use different resolution strategies. Both are properly isolated to visual rendering.

---

### 6.3 Validation Strategy

**Current Validation:**
- ✅ Allowed list validation (must be in predefined list)
- ✅ Explicit fallback to "_default"
- ✅ Error handling with try/catch
- ❌ No confidence thresholds
- ❌ No filesystem validation
- ❌ No semantic validation

**Adequacy:** Adequate for visual-only scope. Additional validation would be defensive but not critical.

---

## CONCLUSION

**Safety Assessment:** ✅ SAFE AND PROPERLY SCOPED

The AI image matching layer:
1. ✅ Is strictly limited to visual rendering
2. ✅ Does not mutate core itinerary data
3. ✅ Has safe fallback behavior
4. ✅ Is properly isolated from business logic
5. ✅ Does not leak into non-visual systems

**Recommendation:** No architectural changes needed. The layer is appropriately scoped and poses no risk to core itinerary data integrity.

---

**END OF REPORT**

