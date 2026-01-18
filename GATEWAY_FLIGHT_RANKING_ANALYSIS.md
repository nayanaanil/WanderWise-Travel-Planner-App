# Gateway and Flight Ranking Logic Analysis

## Overview
This document analyzes the ranking logic used in `/api/phase1/gateway-flights` and related utilities to identify all criteria used for gateway selection and flight ranking.

---

## 1. Gateway City Selection Criteria

### Input Data
- `draftStops`: Array of cities from draft itinerary with optional country codes
- `originCity`: User's origin city

### Selection Process (`lib/phase1/gatewayResolution.ts`)

#### Criterion 1: Airport Code Availability
- **Rule**: City must have a valid IATA airport code
- **Implementation**: `isGatewayEligible(city)` checks `findAirportCode(city) !== null`
- **Result**: If eligible → added to candidates

#### Criterion 2: Trip Scope Determination
- **Rule**: Determines if trip is "long-haul" or "short-haul"
- **Implementation**: `determineTripScope(originCity, draftStops)`
- **Input**: Origin city + draft stop cities
- **Purpose**: Affects gateway resolution strategy

#### Criterion 3: Nearest Gateway Resolution (for non-eligible cities)
- **Rule**: If city lacks airport code, resolve to nearest eligible gateway
- **Implementation**: `nearestEligibleLongHaulGateway(city, allowedGatewayCountryCodes)`
- **Input**: 
  - Non-eligible city name
  - Allowed gateway country codes (from `allowedGatewayCountries()`)
- **Result**: Nearest gateway city with airport code, or excluded if none found

#### Criterion 4: Country Code Constraints
- **Rule**: Gateway must be in allowed countries based on visa constraints
- **Implementation**: `allowedGatewayCountries(stopCountryCodes[0])`
- **Input**: First country code from draft stops
- **Purpose**: Filters gateways by visa eligibility

#### Criterion 5: Deduplication
- **Rule**: Each gateway city appears only once in final candidates
- **Implementation**: Uses `Set<string>` to deduplicate

### Gateway Pairing Logic (`app/api/phase1/gateway-flights/route.ts`)
- **MVP Rule**: Same gateway used for both outbound and inbound
- **Future**: May allow different outbound/inbound gateways

---

## 2. Gateway Option Ranking Criteria

### Input Data
- `outboundFlights`: Array of outbound flight options
- `inboundFlights`: Array of inbound flight options

### Scoring Function (`lib/phase1/scoring.ts::scoreGatewayOption()`)

#### Criterion 1: Total Price (60% weight)
- **Input**: `option.score.totalPrice`
- **Calculation**: `totalPrice * 0.6`
- **Source**: Sum of cheapest outbound + cheapest inbound flight prices
- **Rule**: Lower price = better score

#### Criterion 2: Total Travel Time (30% weight)
- **Input**: `option.score.totalTravelTimeMinutes`
- **Calculation**: `totalTravelTimeMinutes * 0.3`
- **Source**: Sum of cheapest outbound + cheapest inbound durations
- **Rule**: Lower time = better score

#### Criterion 3: Reliability Score (10% weight, penalty)
- **Input**: `option.score.reliabilityScore` (0-1 scale)
- **Calculation**: `(1 - reliabilityScore) * 1000`
- **Components**:
  - **Options Score (40% of reliability)**: `Math.min(1, (outboundOptions + inboundOptions) / 10) * 0.4`
    - More flight options = higher score
    - Capped at 10 total options
  - **Stops Score (60% of reliability)**: `Math.max(0, 1 - (avgStops / 3)) * 0.6`
    - Fewer average stops = higher score
    - Penalty increases after 3 stops
- **Rule**: Higher reliability = lower penalty

### Final Gateway Ranking
- **Sort Order**: Ascending by `scoreGatewayOption()` result
- **Limit**: Top 3 gateway options returned
- **Lower score = better option**

---

## 3. Flight Ranking Criteria (per direction)

### Input Data
- Raw flight options from Duffel API
- Each flight has: `price`, `duration`, `stops`, `airline`, timestamps, legs

### Filtering (`lib/phase1/scoring.ts::rankAndFilterFlights()`)

#### Filter 1: Duffel Airways Exclusion
- **Rule**: Filter out flights from "Duffel Airways" (test airline)
- **Implementation**: `isDuffelAirways(flight)` checks airline name

### Scoring System (for flights with >5 options)

#### Normalization
- **Price Range**: `(flight.price - minPrice) / priceRange`
- **Duration Range**: `(flightDuration - minDuration) / durationRange`
- **Stops Range**: `((flight.stops ?? 0) - minStops) / stopsRange`

#### Weighted Score
- **Price Weight**: 0.5 (50%)
- **Duration Weight**: 0.3 (30%)
- **Stops Weight**: 0.2 (20%)
- **Formula**: `w_price * normalizedPrice + w_duration * normalizedDuration + w_stops * normalizedStops`
- **Lower score = better flight**

### Required Flights (Always Included)

#### Criterion 1: Cheapest Flight
- **Tag**: `cheapest: true`
- **Rule**: Flight with lowest `price`
- **Always included** even if not in top 5 by score

#### Criterion 2: Fastest Flight
- **Tag**: `fastest: true`
- **Rule**: Flight with lowest `getFlightDurationMinutes(flight)`
- **Duration Calculation Priority**:
  1. Sum of `legs[].durationMinutes` (if available)
  2. Parse `duration` string (e.g., "7h 30m")
- **Always included** even if not in top 5 by score

#### Criterion 3: Non-Stop Flight
- **Tag**: None (but identified)
- **Rule**: Flight with `stops === 0`
- **Always included** if available (even if not in top 5 by score)

### Final Flight Ordering

#### Sort Priority (`sortFlightsWithTagsUsingScores()`)
1. **Fastest flights first** (if tagged as fastest)
2. **Cheapest flights next** (if tagged as cheapest AND not fastest)
3. **Remaining flights by score** (ascending, lower = better)

### Recommended Flight Marking

#### Criterion: Top-Ranked Flight
- **Tag**: `recommended: true`
- **Rule**: First flight in final sorted list (index 0)
- **Explanation**: `"Best balance of price, total travel time, and number of stops for your trip"`
- **All other flights**: `recommended: false`

### Final Output
- **Limit**: Top 5 flights per direction (outbound/inbound)
- **Guaranteed**: Cheapest, fastest, and non-stop (if available) are always included

---

## 4. Criteria NOT Currently Exposed to AI

### Gateway-Level Criteria (Missing)
1. **Reliability Score Components**:
   - Number of flight options available (outbound + inbound)
   - Average number of stops across all flights
   - These affect gateway ranking but are not passed to AI

2. **Gateway Ranking Position**:
   - Whether this is the #1, #2, or #3 ranked gateway
   - Why this gateway was chosen over others

3. **Gateway Resolution Context**:
   - Whether gateway was direct (had airport code) or resolved (nearest gateway)
   - Original city name if resolved

4. **Total Gateway Score**:
   - Combined price + time + reliability score
   - Relative performance vs. other gateways

### Flight-Level Criteria (Partially Missing)
1. **Weighted Score Components**:
   - Individual normalized scores for price, duration, stops
   - Overall weighted score value
   - Position in ranking (1st, 2nd, 3rd, etc.)

2. **Required Flight Status**:
   - Whether flight was included because it's cheapest/fastest/non-stop
   - This is partially available (cheapest/fastest tags exist but not passed)

3. **Comparison Context**:
   - How many total flights were considered
   - Price/duration/stops ranges across all options
   - Relative position within those ranges

4. **Reliability Factors**:
   - Number of stops (available but not in comparison context)
   - Connection quality (layover durations not exposed)

---

## 5. Suggested Minimal Data Object for AI Explanations

### Gateway Explanation Data

```typescript
interface GatewayExplanationData {
  gatewayCity: string;
  rank: number; // 1, 2, or 3 (position in final ranking)
  score: {
    totalPrice: number;
    totalTravelTimeMinutes: number;
    reliabilityScore: number; // 0-1
    reliabilityBreakdown: {
      optionsScore: number; // 0-1, based on number of flight options
      stopsScore: number; // 0-1, based on average stops
    };
  };
  comparison: {
    totalPriceDifference?: number; // vs. cheapest gateway
    totalTimeDifferenceMinutes?: number; // vs. fastest gateway
    reliabilityDifference?: number; // vs. most reliable gateway
  };
  resolutionType: 'direct' | 'resolved'; // Whether city had airport code or was resolved
  originalCity?: string; // If resolved, the original city name
  flightAvailability: {
    outboundOptions: number;
    inboundOptions: number;
  };
}
```

### Flight Explanation Data

```typescript
interface FlightExplanationData {
  flight: {
    id: string;
    airline: string;
    price: number;
    durationMinutes: number;
    stops: number;
  };
  tags: {
    recommended: boolean;
    cheapest: boolean;
    fastest: boolean;
    nonStop: boolean;
  };
  rank: number; // Position in final sorted list (1-5)
  score: {
    weightedScore: number; // Overall weighted score
    normalizedPrice: number; // 0-1 normalized price
    normalizedDuration: number; // 0-1 normalized duration
    normalizedStops: number; // 0-1 normalized stops
  };
  comparison: {
    priceRange: { min: number; max: number };
    durationRange: { min: number; max: number };
    stopsRange: { min: number; max: number };
    totalFlightsConsidered: number;
  };
  whyRecommended?: {
    reason: 'top_score' | 'fastest' | 'cheapest' | 'non_stop' | 'balanced';
    explanation: string;
  };
}
```

### Combined Request Object

```typescript
interface EnhancedFlightExplanationRequest {
  gateway: GatewayExplanationData;
  recommended: FlightExplanationData;
  comparison?: {
    cheapest?: FlightExplanationData;
    fastest?: FlightExplanationData;
  };
  userPreferences: {
    budget: 'low' | 'medium' | 'high';
    pace: 'relaxed' | 'moderate' | 'packed';
    groupSize: number;
  };
}
```

---

## Summary

### Gateway Selection: 5 Criteria
1. Airport code availability
2. Trip scope (long-haul vs short-haul)
3. Nearest gateway resolution (for non-eligible cities)
4. Country code constraints (visa eligibility)
5. Deduplication

### Gateway Ranking: 3 Criteria (Weighted)
1. Total price (60%)
2. Total travel time (30%)
3. Reliability score (10% penalty)

### Flight Ranking: 3 Criteria (Weighted)
1. Price (50%)
2. Duration (30%)
3. Stops (20%)

### Flight Tags: 3 Types
1. **Recommended**: Top-ranked flight (best weighted score)
2. **Cheapest**: Lowest price
3. **Fastest**: Shortest duration

### Missing from AI Context
- Gateway reliability breakdown
- Gateway ranking position
- Flight weighted scores
- Comparison ranges
- Resolution context

