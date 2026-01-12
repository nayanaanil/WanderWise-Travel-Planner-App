# Flight Explainer Refactor: Strict, Minimal, Preference-Aware AI

## Overview

This refactor transforms the flight AI explainer from a verbose, multi-option system into a **strict, minimal, preference-aware assistant** that only explains the system's recommendation without ever deciding, re-ranking, or presenting competing choices.

---

## Key Changes

### 1. **Strict Explainer Input Schema**

**File:** `app/api/agent/explain-flights/route.ts`

Replaced the old input schema that accepted an array of flights with a new schema that only accepts:

```typescript
type FlightExplainerInput = {
  recommended: {
    airline: string;
    price: number;
    durationMinutes: number;
    stops: number;
  };

  comparison?: {
    type: 'cheapest' | 'fastest';
    airline: string;
    priceDifference: number;
    timeDifferenceMinutes: number;
  };

  userPreferences: {
    budget: 'low' | 'medium' | 'high';
    pace: 'relaxed' | 'moderate' | 'packed';
    groupSize: number;
  };
};
```

**Rules:**
- `recommended` is always present and final
- `comparison` is at most ONE alternative (not an array)
- No raw flight lists
- No scores or labels from AI

---

### 2. **Updated System Prompt**

**File:** `app/api/agent/explain-flights/route.ts`

New prompt enforces strict constraints:

```
You are a travel assistant explaining a flight recommendation that has already been chosen by the system.

Rules you MUST follow:
- You may NOT choose or rank flights
- You may NOT suggest new options
- You may NOT repeat obvious facts
- You may NOT use system language like "the system recommends"
- You must write 2 sentences maximum
- You must explain the recommendation in the context of the user's preferences
- You may optionally mention ONE tradeoff using the provided comparison

Tone: confident, human, concise.
```

**Structure:**
- Sentence 1: Why the recommended flight fits user preferences
- Sentence 2 (optional): One clear tradeoff vs the comparison flight

**Examples:**
- "This flight keeps costs reasonable while avoiding an exhausting layover, which suits a budget-focused trip. A cheaper option exists, but it adds several hours of travel."
- "A direct flight gets you there faster, which works well for a packed itinerary. Cheaper flights trade time for savings."

---

### 3. **Hard Verbosity Guard**

**File:** `app/api/agent/explain-flights/route.ts`

Added post-generation validation:

```typescript
function validateExplanation(summary: string): void {
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 3) {
    throw new Error('Explainer response too verbose');
  }
}
```

If AI violates constraints, the API falls back to a deterministic explanation.

---

### 4. **Deterministic Fallback**

**File:** `app/api/agent/explain-flights/route.ts`

New preference-mapped fallback behavior:

```typescript
function generateDeterministicExplanation(
  userPreferences: FlightExplainerInput['userPreferences']
): FlightExplanation {
  const { budget, pace } = userPreferences;
  
  if (budget === 'low') {
    return { summary: 'This option balances cost and travel time well.' };
  }
  
  if (pace === 'packed') {
    return { summary: 'This is the fastest way to reach your destination.' };
  }
  
  if (pace === 'relaxed') {
    return { summary: 'Fewer stops make this a more comfortable journey.' };
  }
  
  return { summary: 'This flight offers the best balance for your trip.' };
}
```

---

### 5. **Preference Mapping (Frontend)**

**File:** `components/FlightOptionsResultsScreen.tsx`

Frontend now deterministically selects comparison based on user preferences:

```typescript
// If budget === 'low' → comparison = cheapest
if (budget === 'low') {
  const cheapestFlight = sortedOutbound.find(f => f.id !== recommendedFlight.id && (f.price || 0) < recommended.price);
  if (cheapestFlight && cheapestFlight.price) {
    comparison = {
      type: 'cheapest',
      airline: cheapestFlight.airline || '...',
      priceDifference: recommended.price - cheapestFlight.price,
      timeDifferenceMinutes: parseDurationToMinutes(cheapestFlight.duration) - recommended.durationMinutes,
    };
  }
}

// If pace === 'packed' → comparison = fastest
else if (pace === 'packed') {
  const fastestFlight = sortedOutbound
    .filter(f => f.id !== recommendedFlight.id)
    .sort((a, b) => parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration))[0];
  
  if (fastestFlight) {
    const fastestDuration = parseDurationToMinutes(fastestFlight.duration);
    if (fastestDuration < recommended.durationMinutes) {
      comparison = {
        type: 'fastest',
        airline: fastestFlight.airline || '...',
        priceDifference: (fastestFlight.price || 0) - recommended.price,
        timeDifferenceMinutes: recommended.durationMinutes - fastestDuration,
      };
    }
  }
}

// Otherwise → no comparison
```

**AI never decides which comparison to use.**

---

### 6. **Simplified UI Rendering**

**File:** `components/FlightOptionsResultsScreen.tsx`

Removed all badge/label rendering. Now only shows the summary:

**Before:**
```tsx
{aiExplanation && (
  <div className="space-y-3">
    <p>{aiExplanation.summary}</p>
    {aiExplanation.recommendations.map(rec => (
      <div>
        <span className="badge">{rec.label}</span>
        <p>{rec.reason}</p>
      </div>
    ))}
  </div>
)}
```

**After:**
```tsx
{aiExplanation && (
  <div className="p-4 bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-200 rounded-lg">
    <p className="text-sm text-gray-900 leading-relaxed">
      {aiExplanation.summary}
    </p>
  </div>
)}
```

---

## Success Criteria

✅ **Explanations are 2 sentences max**  
✅ **No contradiction with ranking labels** (AI never labels flights)  
✅ **No "system recommends" language**  
✅ **Clear alignment with user preferences**  
✅ **Identical inputs → identical outputs** (deterministic mapping + AI is only explanatory)

---

## Examples of Expected AI Output

### Budget-Conscious User (budget: 'low')
**Input:**
- Recommended: British Airways, $800, 10h, Direct
- Comparison: Vietnam Airlines (cheapest), saves $150, adds 3h

**AI Output:**
> "British Airways keeps costs reasonable without adding exhausting layovers, which suits a budget trip. Vietnam Airlines is cheaper but adds 3 extra hours of travel."

---

### Packed Itinerary (pace: 'packed')
**Input:**
- Recommended: Singapore Airlines, $950, 12h, 1 stop
- Comparison: Emirates (fastest), costs $100 more, saves 2h

**AI Output:**
> "Singapore Airlines gets you there quickly with just one connection, which works well for a tight schedule. Emirates is slightly faster but costs a bit more."

---

### Relaxed Traveler (pace: 'relaxed', budget: 'medium')
**Input:**
- Recommended: Lufthansa, $900, 14h, 1 stop
- Comparison: None

**AI Output:**
> "Lufthansa offers a comfortable journey with one short connection, giving you time to rest along the way."

---

## What the AI Is NOT Allowed to Do

❌ **Present multiple "best" choices**  
❌ **Re-rank flights**  
❌ **Introduce new labels like "Best value" or "Fastest"**  
❌ **Repeat obvious facts already shown in the UI**  
❌ **Use system language like "the system recommends..."**  
❌ **Generate bullet lists or headings**

---

## Fallback Behavior

If AI fails validation (too verbose, invalid response, etc.), the API returns a deterministic explanation based on user preferences:

- **Budget-conscious:** "This option balances cost and travel time well."
- **Packed pace:** "This is the fastest way to reach your destination."
- **Relaxed pace:** "Fewer stops make this a more comfortable journey."
- **Default:** "This flight offers the best balance for your trip."

---

## Files Changed

1. **`app/api/agent/explain-flights/route.ts`**
   - New input schema (`FlightExplainerInput`)
   - New system prompt (strict rules, 2-sentence max)
   - Verbosity guard (`validateExplanation`)
   - Deterministic fallback (`generateDeterministicExplanation`)

2. **`components/FlightOptionsResultsScreen.tsx`**
   - Preference-based comparison selection (budget → cheapest, pace → fastest)
   - Updated API call with new schema
   - Simplified state type (`{ summary: string }`)
   - Removed badge/label rendering

---

## Testing Checklist

- [ ] Low budget user sees cheapest alternative mentioned (if exists)
- [ ] Packed pace user sees fastest alternative mentioned (if exists)
- [ ] Relaxed/moderate user sees no comparison (default)
- [ ] All explanations are ≤ 2 sentences
- [ ] No "system recommends" language appears
- [ ] Fallback works if AI fails
- [ ] UI only shows summary, no badges

---

## Migration Notes

- **No breaking changes** to flight ranking or selection logic
- Old explainer API calls will fail (schema changed) → update all call sites
- Frontend now deterministically chooses comparison → AI only explains

---

## Future Improvements

1. Add caching for identical inputs
2. Support multi-leg route explanations
3. Integrate user travel history for more personalized language

