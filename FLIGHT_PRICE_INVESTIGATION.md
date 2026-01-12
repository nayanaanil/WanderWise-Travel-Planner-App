# Flight Price Storage Investigation Report

## Question
When user selects flights, is the flight price stored? If yes, why isn't it making its way to the bookings page?

## Investigation Findings

### 1. Flight Selection (FlightOptionsResultsScreen.tsx)

**Location**: `components/FlightOptionsResultsScreen.tsx` lines 573-606

**What happens:**
- User selects flights from `selectedGateway.outbound.flights` and `selectedGateway.inbound.flights`
- These flight objects come from the Phase 1 API and are of type `FlightOption` (from `lib/phase1/types.ts`)
- **FlightOption interface includes `price: number`** (REQUIRED field, line 105)

**Storage:**
```typescript
setSelectedFlight('outbound', {
  ...outboundFlight,  // Spreads ALL properties including price
  gatewayOption: selectedGatewayId,
  originCity: selectedGateway.outbound.originCity,
  gatewayCity: selectedGateway.outbound.gatewayCity,
  date: selectedGateway.outbound.date,
});
```

**Conclusion**: ✅ Flight price IS included when flights are selected (via spread operator)

---

### 2. Flight Storage (lib/tripState.ts)

**Location**: `lib/tripState.ts` lines 637-647

**Function**: `setSelectedFlight(type, option)`
- Simply stores the option object as-is: `selectedFlights: { [type]: option }`
- No transformation or property filtering
- Stores entire flight object including price

**Conclusion**: ✅ Price is stored in `selectedFlights` state

---

### 3. Route Building (app/plan/building/page.tsx)

**Location**: `app/plan/building/page.tsx` lines 136-153

**What happens:**
```typescript
const selectedFlights = getSelectedFlights();
const enrichedStructuralRoute = {
  id: structuralRoute.id,
  outboundFlight: selectedFlights.outbound || structuralRoute.outboundFlight,
  inboundFlight: selectedFlights.return || structuralRoute.inboundFlight,
  groundRoute: structuralRoute.groundRoute,
  derived: structuralRoute.derived,
};
```

**Potential Issue**: 
- If `selectedFlights.outbound` exists, it's used (includes price) ✅
- If it doesn't exist, falls back to `structuralRoute.outboundFlight` from API
- **The API's structuralRoute.outboundFlight only has `{ fromCity, toCity, date }`** - NO price

**Type Definition Issue**:
- `lib/tripState.ts` line 186-194 defines structuralRoute.outboundFlight as:
  ```typescript
  outboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
  };
  ```
- This type doesn't allow additional properties like `price`, `airline`, etc.
- TypeScript might be accepting it, but the type suggests it's only basic route info

**Conclusion**: ⚠️ Price SHOULD be stored IF `selectedFlights.outbound` exists, but type definition suggests it might be stripped

---

### 4. Bookings Page (app/bookings/page.tsx)

**Location**: `app/bookings/page.tsx` lines 43-44, 74-78

**What happens:**
```typescript
const outboundFlight = structuralRoute?.outboundFlight;
const inboundFlight = structuralRoute?.inboundFlight;

// Later in totalPrice calculation:
if (outboundFlight && typeof outboundFlight === 'object' && 'price' in outboundFlight) {
  total += ((outboundFlight.price as number) || 0) * numTravelers;
}
```

**Issue**: Code checks for price property, suggesting it might not always be present

**Conclusion**: ⚠️ Code expects price might be missing

---

## Root Cause Analysis

### Scenario 1: Price is stored but type is wrong
- Flight objects DO have price when selected
- Price SHOULD be stored in structuralRoute
- But TypeScript type definition only allows `{ fromCity, toCity, date }`
- Runtime might have price, but TypeScript types don't reflect it

### Scenario 2: selectedFlights is cleared before building
- Looking at building page line 152: `selectedFlights: undefined` - this clears it AFTER enriching
- But the enrichment happens BEFORE clearing, so this shouldn't be the issue

### Scenario 3: Flight objects don't actually have price
- Need to verify: Do flight objects from the API actually have price?
- From type definition (FlightOption interface), price is REQUIRED
- But actual API response might not include it

---

## Recommended Solutions

### Solution 1: Verify actual data structure (RECOMMENDED FIRST)
Add logging to see what's actually stored:
1. In `FlightOptionsResultsScreen.tsx` after `setSelectedFlight` - log the flight object
2. In `app/plan/building/page.tsx` before enrichment - log `selectedFlights.outbound`
3. In `app/plan/building/page.tsx` after enrichment - log `enrichedStructuralRoute.outboundFlight`
4. In `app/bookings/page.tsx` - log `structuralRoute.outboundFlight`

### Solution 2: Update Type Definition (If price exists but type is wrong)
If price IS being stored but TypeScript type is restrictive:
- Update `lib/tripState.ts` structuralRoute type to allow additional properties:
  ```typescript
  outboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
    price?: number;  // Add optional price
    airline?: string;  // Add other flight properties
    // ... etc
  };
  ```

### Solution 3: Explicitly preserve price during enrichment
In `app/plan/building/page.tsx`, explicitly merge price:
```typescript
const enrichedStructuralRoute = {
  id: structuralRoute.id,
  outboundFlight: {
    ...structuralRoute.outboundFlight,
    ...(selectedFlights.outbound || {}),
  },
  inboundFlight: {
    ...structuralRoute.inboundFlight,
    ...(selectedFlights.return || {}),
  },
  groundRoute: structuralRoute.groundRoute,
  derived: structuralRoute.derived,
};
```

---

## Next Steps

1. **Add logging** to verify what data is actually present at each step
2. **Check browser console/logs** to see if price is in the objects
3. **Based on findings**, apply appropriate solution (type update or explicit merge)

