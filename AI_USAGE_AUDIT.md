# AI Usage Audit - Travel Planner Application

**Generated:** 2024  
**Purpose:** Comprehensive documentation of all AI/LLM integrations in the application  
**Model Used:** `gpt-4o-mini` (OpenAI) throughout

---

## Summary

The application uses **OpenAI's GPT-4o-mini** model in **7 distinct locations** for various travel planning and decision-making tasks:

1. **Draft Itinerary Generation** (`/api/itinerary/draft`)
2. **Activity Generation** (`/api/agent/generate-activities`)
3. **Agent Explanations** (`/api/agent/explain`)
4. **Seasonality Resolution** (`/api/seasonality/resolve`)
5. **City Recommendations** (`/api/cities/recommend`)
6. **Image Folder Selection** (within `/api/itinerary/draft`)
7. **Legacy Itinerary Generation** (`/api/itinerary` - older endpoint)

---

## 1. Draft Itinerary Generation

**Endpoint:** `POST /api/itinerary/draft/route.ts`  
**Purpose:** Generate 1-3 distinct draft itinerary concepts with cities, nights, and activities  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.8` (higher for diversity)

### AI Call Details:
- **Location:** Lines 132-146
- **Input:** User trip preferences (destination, dates, duration, pace, interests, selected cities)
- **Output:** JSON array of draft itineraries with:
  - `id`, `title`, `summary`
  - `cities[]` (name, nights, activities[])
  - `experienceStyle`, `bestFor[]`, `whyThisTrip[]`
  - `primaryCountryCode`, `imageFolder`

### Prompt Strategy:
- System prompt enforces strict JSON-only responses
- No markdown, explanations, or commentary allowed
- Includes manual mode constraints when user selects cities
- Handles planning modes: automatic, guided, manual

### Fallback Behavior:
- No explicit fallback - API returns error if generation fails
- Validation ensures minimum structure before returning

### Caching:
- No caching implemented
- Each request generates fresh itineraries

### Related AI Call:
- Also triggers **Image Folder Selection** (see #6) when `primaryCountryCode` is missing

---

## 2. Activity Generation

**Endpoint:** `POST /api/agent/generate-activities/route.ts`  
**Purpose:** Generate planning activities for a city with structured tags (NOT bookable tickets)  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.7` (slightly higher for variety)

### AI Call Details:
- **Location:** Lines 276-330
- **Input:** `{ city: string, pace: 'relaxed' | 'moderate' | 'packed' }`
- **Output:** Array of `GeneratedActivity` with:
  - `id`, `name`, `description`, `city`
  - `tags`: `bestTime[]`, `durationSlots`, `vibe`, `crowdLevel`

### Prompt Strategy:
- Generates 5-8 realistic activities per city
- Enforces real-world timing (temples early morning, cruises evening)
- No booking information, prices, or ticket details
- Activities are for planning only

### Fallback Behavior:
- **Hardcoded fallback activities** (`getFallbackActivities()`)
- Generic activities (City Center Walking Tour, Local Market Visit, Sunset Viewpoint)
- City-specific additions (e.g., Bali: Temple Visit, Rice Terrace Walk)
- Always returns minimum 3 activities

### Caching:
- **In-memory cache** (`activitiesCache` Map)
- Cache key: `${city.toLowerCase()}_${pace}`
- Prevents duplicate API calls for same city+pace combination

### Validation:
- Strict enum validation for all tag fields
- Invalid activities are filtered out
- IDs are deterministic (slugified name + city)

---

## 3. Agent Explanations

**Endpoint:** `POST /api/agent/explain/route.ts`  
**Purpose:** Generate human-readable explanations for deterministic decision results  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.3` (lower for consistency)

### AI Call Details:
- **Location:** Lines 113-175
- **Input:** `AgentExplanationInput`:
  - `decision: DecisionResult` (from hotel/activity decision engines)
  - `context?: { pace?, city? }`
- **Output:** `AgentExplanation`:
  - `summary: string` (2-4 sentences)
  - `optionSummaries: Record<string, string>` (1-2 sentences per option)

### Prompt Strategy:
- **Critical constraint:** AI may ONLY rephrase existing facts/risks/options
- AI must NOT invent new options, actions, or constraints
- Tone: calm, helpful, human travel agent
- Explains what decision engine already determined

### Fallback Behavior:
- **Deterministic fallback** (`generateFallbackExplanation()`)
- Uses `decision.recommendation` or joins `decision.facts` for summary
- Uses `option.description` for option summaries
- Always returns valid explanation even if AI fails

### Caching:
- **In-memory cache** (`explanationCache` Map)
- Cache key: SHA256 hash of normalized `DecisionResult + context`
- Prevents duplicate API calls for identical decisions

### Validation:
- Validates all expected option IDs are present in AI response
- Returns fallback if structure invalid

---

## 4. Seasonality Resolution

**Endpoint:** `POST /api/seasonality/resolve/route.ts`  
**Purpose:** AI fallback to select best matching seasonality key when no direct match exists  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.3` (low for deterministic selection)

### AI Call Details:
- **Location:** Lines 39-118
- **Input:** `{ destination: string }`
- **Output:** `{ destination, selectedKey: string | null, source: 'ai' | 'fallback' }`

### Prompt Strategy:
- Returns EXACTLY ONE key from allowed list, or `"__NONE__"`
- Must be exact match from:
  - `CITY_SEASONALITY` keys
  - `COUNTRY_SEASONALITY` keys
  - `REGION_SEASONALITY` keys
- Prefers: region → country → city matches
- Examples provided for guidance (Central Europe → European Christmas Markets)

### Fallback Behavior:
- Returns `null` (treated as `"__NONE__"`) on failure
- Frontend falls back to generic "All year" / neutral months

### Caching:
- **In-memory cache** (`aiCache` Map)
- Cache key: destination string
- Prevents repeated AI calls for same destination

### Validation:
- Validates AI output is in `ALLOWED_SEASONALITY_KEYS`
- Invalid keys treated as `"__NONE__"`

---

## 5. City Recommendations

**Endpoint:** `POST /api/cities/recommend/route.ts`  
**Purpose:** AI-assisted ranking of cities from allowed list (never invents new cities)  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.7`

### AI Call Details:
- **Location:** Lines 76-97 (uses direct fetch to OpenAI API, not SDK)
- **Input:**
  - `destination: string`
  - `tripDuration: number`
  - `userInterests?: string[]`
  - `allowedCityNames: string[]` (AI must ONLY rank from this list)
- **Output:** Array of `{ name: string, reason: string }` ranked by relevance

### Prompt Strategy:
- **Critical constraint:** AI must ONLY select from provided `allowedCityNames` list
- Never invents new cities
- Ranks by relevance to destination, duration, interests
- Returns city names exactly as provided (case-sensitive)

### Fallback Behavior:
- **Deterministic fallback** (`fallbackRanking()`)
- Prioritizes popular cities (Paris, London, Rome, etc.)
- Alphabetical ordering for remaining cities
- Never blocks user flow

### Caching:
- No caching implemented
- Each request generates fresh rankings

### Validation:
- Validates all returned cities are in `allowedCityNames` Set
- Filters out invalid cities before returning
- Falls back if AI returns no valid cities

---

## 6. Image Folder Selection

**Function:** `selectImageFolder()` within `/api/itinerary/draft/route.ts`  
**Purpose:** Select appropriate image folder when `primaryCountryCode` is missing  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.3` (low for deterministic folder selection)

### AI Call Details:
- **Location:** Lines 446-517
- **Input:** `destination: string`
- **Output:** Folder name string (e.g., `"FR"`, `"european-christmas-markets"`, `"_default"`)

### Prompt Strategy:
- Returns EXACTLY ONE folder name from allowed list:
  - **Country codes:** IN, JP, IT, FR, ES, TH, ID, GR, CH, GB, DE, NL, AT, PT, TR, US, CA, AU, NZ, SG, AE, MV, ZA, MX, EG, MA
  - **Theme folders:** european-christmas-markets, swiss-alps, greek-islands, scandinavia, south-east-asia, mediterranean-coast, caribbean-islands, patagonia, central-europe, himalayas, islands
- Prefers theme folders for regions/experiences
- Uses country codes only if clearly implied
- Examples provided for guidance

### Fallback Behavior:
- Returns `"_default"` on failure or invalid output
- Never blocks itinerary generation

### Caching:
- No caching implemented
- Called only when `primaryCountryCode` is missing

### Validation:
- Validates output is in `allowedFolders` array
- Invalid folder → `"_default"`

---

## 7. Legacy Itinerary Generation

**Endpoint:** `POST /api/itinerary/route.ts`  
**Purpose:** Generate detailed day-by-day itinerary (older endpoint, may be deprecated)  
**Model:** `gpt-4o-mini`  
**Temperature:** `0.7`

### AI Call Details:
- **Location:** Lines 93-109
- **Input:** Full itinerary request (destination, dates, pace, tripType, mustSee, budget, travelers)
- **Output:** `{ summary: string, days: Array<{ date: string, activities: string[] }> }`

### Prompt Strategy:
- Generates detailed day-by-day activities
- Includes realistic timing (Morning, Afternoon, Evening)
- Returns strict JSON format
- Includes all trip parameters in prompt

### Fallback Behavior:
- Returns error if generation fails
- No explicit fallback itinerary

### Caching:
- No caching implemented

### Note:
This endpoint appears to be an older implementation. The primary itinerary generation now uses `/api/itinerary/draft` which generates higher-level concepts rather than detailed day-by-day schedules.

---

## Common Patterns Across All AI Calls

### 1. **Model Consistency**
- All endpoints use `gpt-4o-mini` (cost-effective, fast)
- Temperature varies by use case (0.3 for deterministic, 0.7-0.8 for creative)

### 2. **Error Handling**
- All endpoints have fallback mechanisms (except legacy `/api/itinerary`)
- Errors never block user flow
- Logging for debugging (`console.error`, `console.warn`)

### 3. **Validation**
- Strict validation of AI responses
- Enum validation where applicable
- Structure validation before returning to client

### 4. **Caching Strategy**
- **Activity Generation:** In-memory cache by city+pace
- **Agent Explanations:** In-memory cache by decision hash
- **Seasonality Resolution:** In-memory cache by destination
- **Others:** No caching (or call-specific)

### 5. **Prompt Design**
- System prompts enforce constraints
- Clear examples provided
- Explicit rules about allowed/disallowed outputs

### 6. **Response Format**
- Most endpoints use `response_format: { type: 'json_object' }`
- Strict JSON parsing with error handling
- Fallback to deterministic responses on parse failure

---

## Environment Requirements

All AI endpoints require:
```bash
OPENAI_API_KEY=sk-... # Set in environment variables
```

**Failure Behavior:**
- **Activity Generation:** Falls back to hardcoded activities
- **Agent Explanations:** Falls back to deterministic explanations
- **Seasonality Resolution:** Returns `null` (frontend handles)
- **City Recommendations:** Falls back to deterministic ranking
- **Image Folder Selection:** Returns `"_default"`
- **Itinerary Draft:** Returns API error (no fallback)
- **Legacy Itinerary:** Returns API error (no fallback)

---

## Frontend Integration Points

AI is called from the following frontend locations:

1. **`app/plan/logistics/page.tsx`**:
   - Reads `generatedActivitiesByCity` from `tripState` (cached client-side)
   - Displays activities in day-wise timeline
   - No direct AI calls from this page

2. **`app/activities/select/page.tsx`**:
   - Calls `POST /api/agent/generate-activities` on page load
   - Stores results in `tripState.generatedActivitiesByCity[city]`
   - Calls `POST /api/agent/explain` when activity decision is made

3. **`app/bookings/hotels/impact/page.tsx`**:
   - Potentially calls `POST /api/agent/explain` for hotel decisions
   - (Needs verification)

4. **`components/TripTimingScreen.tsx`** (or equivalent):
   - Calls `POST /api/seasonality/resolve` when no direct seasonality match
   - (Needs verification)

5. **`components/LocationsSelectionScreen.tsx`**:
   - Calls `POST /api/cities/recommend` to rank cities
   - (Needs verification)

6. **Itinerary generation flow**:
   - Calls `POST /api/itinerary/draft` during trip planning
   - Image folder selection happens server-side within this call

---

## Cost Considerations

**Model:** `gpt-4o-mini`  
**Pricing:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens

**Estimated Costs (per request):**
- **Draft Itinerary:** ~$0.001-0.002 (large prompts, multiple itineraries)
- **Activity Generation:** ~$0.0005-0.001 (medium prompts, 5-8 activities)
- **Agent Explanation:** ~$0.0002-0.0005 (small-medium prompts)
- **Seasonality Resolution:** ~$0.0001-0.0002 (small prompt, short response)
- **City Recommendations:** ~$0.0003-0.0006 (medium prompt, ranked list)
- **Image Folder Selection:** ~$0.0001 (tiny prompt, single string)
- **Legacy Itinerary:** ~$0.001-0.002 (large prompts, detailed days)

**Caching Impact:**
- Activity, Explanation, and Seasonality caching significantly reduce costs
- Draft Itinerary and City Recommendations have no caching (higher cost)

---

## Security & Data Privacy

1. **API Key Security:**
   - `OPENAI_API_KEY` stored in environment variables
   - Never exposed to client-side code
   - All AI calls happen server-side

2. **Data Sent to OpenAI:**
   - User trip preferences (destination, dates, interests)
   - City names and rankings
   - Decision results (facts, risks, options)
   - **No PII** (personally identifiable information) sent

3. **Response Validation:**
   - All responses validated before use
   - Invalid responses trigger fallbacks
   - Prevents injection or malformed data

---

## Future Improvements

### Potential Enhancements:
1. **Persistent Caching:**
   - Move in-memory caches to Redis
   - Survive server restarts
   - Share cache across instances

2. **Rate Limiting:**
   - Implement per-user rate limits
   - Prevent abuse
   - Cost control

3. **Monitoring:**
   - Track API call counts
   - Monitor costs
   - Alert on failures

4. **A/B Testing:**
   - Test different temperature values
   - Compare prompt variations
   - Measure user satisfaction

5. **Batch Processing:**
   - Batch multiple activity requests
   - Reduce API call overhead
   - Improve efficiency

---

## Notes

- All AI integrations use **deterministic fallbacks** to ensure the app never breaks if AI fails
- The decision engines (hotel, activity) are **purely deterministic** - AI only provides explanations
- No AI is used for critical path operations (booking, payments, route optimization)
- Image selection uses Unsplash API, not AI (only folder selection uses AI)

---

**Last Updated:** Based on codebase as of latest commit  
**Maintained By:** Development Team


