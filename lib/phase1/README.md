# Phase 1: Gateway + Flight Selection

## Overview

Phase 1 is responsible **ONLY** for:
- Resolving gateway-eligible cities from draft itinerary
- Finding bookable flight options for gateway pairs
- Ranking gateway + flight combinations

Phase 1 does **NOT**:
- Build ground routes
- Optimize city order
- Assign base stays
- Repair anchors
- Return multiple route options
- Mutate any existing spine

## API Endpoint

**POST** `/api/phase1/gateway-flights`

### Request

```typescript
{
  tripId: string;
  originCity: string;              // e.g. "Bangalore"
  draftStops: {
    city: string;                  // e.g. "Fes"
    country?: string;
    desiredNights?: number;
  }[];
  dateWindow: {
    earliestStart: string;         // ISO date
    latestEnd: string;             // ISO date
  };
  passengers: {
    adults: number;
    children: number;
  };
  preferences?: {
    maxStops?: number;
    avoidRedEye?: boolean;
    cabinClass?: "economy" | "premium" | "business";
    budgetRange?: { min?: number; max?: number };
  };
}
```

### Response

```typescript
{
  gatewayOptions: GatewayOption[];  // sorted best → worst
}
```

## Implementation Structure

### Files

1. **`lib/phase1/types.ts`** - Type definitions for Phase 1 API
2. **`lib/phase1/gatewayResolution.ts`** - Gateway candidate resolution logic
3. **`lib/phase1/flightSearch.ts`** - Duffel flight search integration
4. **`lib/phase1/scoring.ts`** - Scoring and ranking logic
5. **`app/api/phase1/gateway-flights/route.ts`** - API route handler

### Flow

1. **Resolve Gateway Candidates**
   - For each draft stop, check if gateway-eligible
   - If not eligible, resolve to nearest gateway
   - Filter out unresolvable cities

2. **Generate Gateway Pairs**
   - MVP: Same gateway for outbound and inbound
   - Future: Allow different inbound/outbound gateways

3. **Search Flights**
   - For each gateway pair, search outbound and inbound flights
   - Only include options with flights in both directions
   - Exclude options with airport resolution failures

4. **Score and Rank**
   - Compute total price, travel time, reliability
   - Rank options (best → worst)
   - Return top N options (N = 3 for MVP)

## Gateway Eligibility Rules

1. **Strict Gateway-Only Selection**
   - Cities must have airport codes (IATA)
   - Base cities are never treated as gateways unless explicitly eligible
   - If no base city is gateway-eligible, resolve to nearest gateway

2. **No Anchor Repair**
   - All anchors must be valid by construction
   - No post-selection repair logic

3. **Deterministic Resolution**
   - Uses existing gateway eligibility logic
   - No randomness or AI-generated prose

## Flight Search

- Uses Duffel API for flight search
- Only returns flights with valid airport codes
- Excludes options if API call fails
- Transforms Duffel response to Phase 1 FlightOption format

## Scoring

Options are scored based on:
- **Total Price** (60% weight)
- **Total Travel Time** (30% weight)
- **Reliability Score** (10% weight)
  - More flight options = more reliable
  - Fewer stops = more reliable

## Example

**Input:**
```json
{
  "tripId": "trip-123",
  "originCity": "Bangalore",
  "draftStops": [
    { "city": "Fes" },
    { "city": "Chefchaouen" },
    { "city": "Marrakech" }
  ],
  "dateWindow": {
    "earliestStart": "2025-03-10",
    "latestEnd": "2025-03-20"
  },
  "passengers": {
    "adults": 2,
    "children": 0
  }
}
```

**Output:**
```json
{
  "gatewayOptions": [
    {
      "id": "gateway-0-Marrakech",
      "outbound": {
        "originCity": "Bangalore",
        "gatewayCity": "Marrakech",
        "date": "2025-03-10",
        "flights": [...]
      },
      "inbound": {
        "gatewayCity": "Marrakech",
        "destinationCity": "Bangalore",
        "date": "2025-03-20",
        "flights": [...]
      },
      "score": {
        "totalPrice": 1200,
        "totalTravelTimeMinutes": 840,
        "reliabilityScore": 0.8
      },
      "explanation": [
        "Gateway: Marrakech",
        "Outbound: Multiple airlines from 600 per person",
        "Return: Multiple airlines from 600 per person"
      ]
    }
  ]
}
```

## Notes

- This is a clean, isolated Phase 1 implementation
- No coupling to Phase 2 (Route Optimizer)
- All gateway resolution uses existing, proven logic
- Flight search uses existing Duffel integration
- Scoring is deterministic and transparent




