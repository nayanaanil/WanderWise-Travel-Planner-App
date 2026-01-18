# Gateway Options Analysis

## Inspection Results

### 1. Available Data at Finalization Point

**Location**: `/app/api/phase1/gateway-flights/route.ts` line 185
```typescript
const topOptions = gatewayOptions.slice(0, 3);
```

At this point, all top 3 gateway options are available together in the `topOptions` array.

#### ✅ Confirmed Available:

1. **Gateway Rank (Position)**
   - **Available**: Yes
   - **Source**: Array index (0 = best, 1 = second, 2 = third)
   - **Access**: `topOptions.indexOf(gateway)` or iteration index

2. **Total Price per Gateway**
   - **Available**: Yes
   - **Source**: `gateway.score.totalPrice` (number)
   - **Computed in**: `computeGatewayOptionScore()` (scoring.ts:92)
   - **Calculation**: Sum of cheapest outbound + cheapest inbound flight prices

3. **Total Travel Time per Gateway**
   - **Available**: Yes
   - **Source**: `gateway.score.totalTravelTimeMinutes` (number)
   - **Computed in**: `computeGatewayOptionScore()` (scoring.ts:95-97)
   - **Calculation**: Sum of cheapest outbound + cheapest inbound flight durations (in minutes)

4. **Reliability-Related Inputs**
   - **Available**: Yes (derivable from existing data)
   - **Number of Options**: 
     - `gateway.outbound.flights.length + gateway.inbound.flights.length`
     - Note: These are already filtered to top 5 per direction (route.ts:138-139)
   - **Average Stops**: 
     - Can be calculated from `gateway.outbound.flights` and `gateway.inbound.flights`
     - Each flight has `stops?: number` field
     - Formula: `(sum of all stops) / (total number of flights)`
   - **Reliability Score**: 
     - **Available**: Yes
     - **Source**: `gateway.score.reliabilityScore` (number, 0-1)
     - **Computed in**: `computeGatewayOptionScore()` (scoring.ts:99-111)
     - **Calculation**:
       - Options score: `Math.min(1, (outboundOptions + inboundOptions) / 10) * 0.4`
       - Stops score: `Math.max(0, 1 - (avgStops / 3)) * 0.6`
       - Total: `optionsScore + stopsScore`

5. **Whether Gateway Was Resolved from Another City**
   - **Available**: Partially (requires inference)
   - **Source**: Not explicitly tracked in `GatewayOption` type
   - **Inference Method**: 
     - Compare `gateway.outbound.gatewayCity` with original `body.draftStops.map(s => s.city)`
     - If gateway city is NOT in original draft stops → it was resolved
     - **Note**: This requires access to original `body.draftStops` at the finalization point
   - **Current Limitation**: The resolved mapping (original city → gateway) is not preserved in the `GatewayOption` object

### 2. Exact Location Where Top 3 Options Are Available Together

**File**: `/app/api/phase1/gateway-flights/route.ts`
**Line**: 185
**Context**:
```typescript
// Step 4: Score and rank options (best → worst)
gatewayOptions.sort((a, b) => {
  const scoreA = scoreGatewayOption(a);
  const scoreB = scoreGatewayOption(b);
  return scoreA - scoreB; // Lower score = better
});

// Limit to top N options (N = 3 for MVP)
const topOptions = gatewayOptions.slice(0, 3);  // ← HERE

console.debug('[DEBUG][Phase1] Returning gateway options', {
  total: gatewayOptions.length,
  returned: topOptions.length
});

const response: GatewayFlightsResponse = {
  gatewayOptions: topOptions,
};
```

**Data Structure at This Point**:
- `topOptions`: `GatewayOption[]` (array of 3 gateway options, sorted best → worst)
- Each `GatewayOption` contains:
  - `id`: string
  - `outbound`: { originCity, gatewayCity, date, flights[] }
  - `inbound`: { gatewayCity, destinationCity, date, flights[] }
  - `score`: { totalPrice, totalTravelTimeMinutes, reliabilityScore }
  - `explanation`: string[]

## Suggested Derivation Logic

### 3. Minimal Deterministic Derivation

#### 3.1 Derive Strengths (price / time / reliability)

**Approach**: Compare each gateway against the other 2 options in the top 3.

**Algorithm**:
```typescript
function deriveGatewayStrengths(
  gateway: GatewayOption,
  allTopOptions: GatewayOption[]
): {
  price: "best" | "good" | "weak";
  time: "best" | "good" | "weak";
  reliability: "best" | "good" | "weak";
} {
  // Extract metrics for all options
  const prices = allTopOptions.map(g => g.score.totalPrice ?? Infinity);
  const times = allTopOptions.map(g => g.score.totalTravelTimeMinutes ?? Infinity);
  const reliabilities = allTopOptions.map(g => g.score.reliabilityScore ?? 0);
  
  const thisPrice = gateway.score.totalPrice ?? Infinity;
  const thisTime = gateway.score.totalTravelTimeMinutes ?? Infinity;
  const thisReliability = gateway.score.reliabilityScore ?? 0;
  
  // Find best (minimum for price/time, maximum for reliability)
  const bestPrice = Math.min(...prices);
  const bestTime = Math.min(...times);
  const bestReliability = Math.max(...reliabilities);
  
  // Find worst (maximum for price/time, minimum for reliability)
  const worstPrice = Math.max(...prices);
  const worstTime = Math.max(...times);
  const worstReliability = Math.min(...reliabilities);
  
  // Determine strength
  const deriveStrength = (
    value: number,
    best: number,
    worst: number,
    lowerIsBetter: boolean
  ): "best" | "good" | "weak" => {
    if (lowerIsBetter) {
      // For price and time (lower is better)
      if (value === best) return "best";
      const range = worst - best;
      if (range === 0) return "best"; // All equal
      const percentile = (value - best) / range;
      return percentile <= 0.33 ? "best" : percentile <= 0.67 ? "good" : "weak";
    } else {
      // For reliability (higher is better)
      if (value === best) return "best";
      const range = best - worst;
      if (range === 0) return "best"; // All equal
      const percentile = (best - value) / range;
      return percentile <= 0.33 ? "best" : percentile <= 0.67 ? "good" : "weak";
    }
  };
  
  return {
    price: deriveStrength(thisPrice, bestPrice, worstPrice, true),
    time: deriveStrength(thisTime, bestTime, worstTime, true),
    reliability: deriveStrength(thisReliability, bestReliability, worstReliability, false),
  };
}
```

**Simplified Alternative** (if only 3 options):
```typescript
function deriveGatewayStrengths(
  gateway: GatewayOption,
  allTopOptions: GatewayOption[]
): {
  price: "best" | "good" | "weak";
  time: "best" | "good" | "weak";
  reliability: "best" | "good" | "weak";
} {
  // Sort all options by each metric
  const sortedByPrice = [...allTopOptions].sort((a, b) => 
    (a.score.totalPrice ?? Infinity) - (b.score.totalPrice ?? Infinity)
  );
  const sortedByTime = [...allTopOptions].sort((a, b) => 
    (a.score.totalTravelTimeMinutes ?? Infinity) - (b.score.totalTravelTimeMinutes ?? Infinity)
  );
  const sortedByReliability = [...allTopOptions].sort((a, b) => 
    (b.score.reliabilityScore ?? 0) - (a.score.reliabilityScore ?? 0)
  );
  
  // Find position (0 = best, 1 = second, 2 = worst)
  const priceRank = sortedByPrice.findIndex(g => g.id === gateway.id);
  const timeRank = sortedByTime.findIndex(g => g.id === gateway.id);
  const reliabilityRank = sortedByReliability.findIndex(g => g.id === gateway.id);
  
  // Map rank to strength
  const rankToStrength = (rank: number): "best" | "good" | "weak" => {
    if (rank === 0) return "best";
    if (rank === 1) return "good";
    return "weak";
  };
  
  return {
    price: rankToStrength(priceRank),
    time: rankToStrength(timeRank),
    reliability: rankToStrength(reliabilityRank),
  };
}
```

#### 3.2 Derive Primary Tradeoff

**Approach**: Identify the single most significant weakness relative to the best option.

**Algorithm**:
```typescript
function derivePrimaryTradeoff(
  gateway: GatewayOption,
  allTopOptions: GatewayOption[]
): string {
  const strengths = deriveGatewayStrengths(gateway, allTopOptions);
  
  // Find the best option (rank 0)
  const sortedByScore = [...allTopOptions].sort((a, b) => 
    scoreGatewayOption(a) - scoreGatewayOption(b)
  );
  const bestOption = sortedByScore[0];
  
  // Calculate relative differences
  const priceDiff = ((gateway.score.totalPrice ?? 0) - (bestOption.score.totalPrice ?? 0)) / (bestOption.score.totalPrice ?? 1);
  const timeDiff = ((gateway.score.totalTravelTimeMinutes ?? 0) - (bestOption.score.totalTravelTimeMinutes ?? 0)) / (bestOption.score.totalTravelTimeMinutes ?? 1);
  const reliabilityDiff = ((bestOption.score.reliabilityScore ?? 0) - (gateway.score.reliabilityScore ?? 0));
  
  // Normalize differences to comparable scale
  // Price: percentage difference
  // Time: percentage difference  
  // Reliability: absolute difference (0-1 scale)
  
  // Find the largest relative weakness
  const weaknesses: Array<{ type: "price" | "time" | "reliability"; magnitude: number }> = [];
  
  if (strengths.price !== "best") {
    weaknesses.push({ type: "price", magnitude: priceDiff });
  }
  if (strengths.time !== "best") {
    weaknesses.push({ type: "time", magnitude: timeDiff });
  }
  if (strengths.reliability !== "best") {
    weaknesses.push({ type: "reliability", magnitude: reliabilityDiff });
  }
  
  // If no weaknesses (this is the best option), return balanced message
  if (weaknesses.length === 0) {
    return "Best overall balance";
  }
  
  // Sort by magnitude (largest weakness first)
  weaknesses.sort((a, b) => b.magnitude - a.magnitude);
  const primaryWeakness = weaknesses[0];
  
  // Generate tradeoff message
  switch (primaryWeakness.type) {
    case "price":
      return `Higher cost (${Math.round(priceDiff * 100)}% more than best option)`;
    case "time":
      return `Longer travel time (${Math.round(timeDiff * 100)}% more than best option)`;
    case "reliability":
      return `Fewer flight options or more stops`;
    default:
      return "Tradeoff with best option";
  }
}
```

**Simplified Alternative** (using strengths only):
```typescript
function derivePrimaryTradeoff(
  gateway: GatewayOption,
  allTopOptions: GatewayOption[]
): string {
  const strengths = deriveGatewayStrengths(gateway, allTopOptions);
  
  // If this is the best option, no tradeoff
  if (strengths.price === "best" && strengths.time === "best" && strengths.reliability === "best") {
    return "Best overall balance";
  }
  
  // Find weakest dimension
  const weaknesses: Array<{ type: "price" | "time" | "reliability"; strength: "good" | "weak" }> = [];
  
  if (strengths.price !== "best") {
    weaknesses.push({ type: "price", strength: strengths.price });
  }
  if (strengths.time !== "best") {
    weaknesses.push({ type: "time", strength: strengths.time });
  }
  if (strengths.reliability !== "best") {
    weaknesses.push({ type: "reliability", strength: strengths.reliability });
  }
  
  // Prioritize "weak" over "good"
  weaknesses.sort((a, b) => {
    if (a.strength === "weak" && b.strength !== "weak") return -1;
    if (a.strength !== "weak" && b.strength === "weak") return 1;
    return 0;
  });
  
  const primaryWeakness = weaknesses[0];
  
  // Generate tradeoff message
  switch (primaryWeakness.type) {
    case "price":
      return primaryWeakness.strength === "weak" 
        ? "Significantly higher cost"
        : "Slightly higher cost";
    case "time":
      return primaryWeakness.strength === "weak"
        ? "Significantly longer travel time"
        : "Slightly longer travel time";
    case "reliability":
      return primaryWeakness.strength === "weak"
        ? "Fewer flight options or more stops"
        : "Slightly fewer options";
    default:
      return "Tradeoff with best option";
  }
}
```

## Implementation Notes

### Where to Add Derivation

**Location**: `/app/api/phase1/gateway-flights/route.ts` after line 185

**Suggested Code**:
```typescript
// Limit to top N options (N = 3 for MVP)
const topOptions = gatewayOptions.slice(0, 3);

// Derive strengths and tradeoffs for each option
const enrichedOptions = topOptions.map((option, index) => {
  const strengths = deriveGatewayStrengths(option, topOptions);
  const tradeoff = derivePrimaryTradeoff(option, topOptions);
  
  return {
    ...option,
    strengths,
    tradeoff,
    rank: index, // 0 = best, 1 = second, 2 = third
  };
});
```

### Data Structure Extension

**Add to `GatewayOption` type** (in `/lib/phase1/types.ts`):
```typescript
export interface GatewayOption {
  // ... existing fields ...
  
  // New optional fields (for backward compatibility)
  strengths?: {
    price: "best" | "good" | "weak";
    time: "best" | "good" | "weak";
    reliability: "best" | "good" | "weak";
  };
  tradeoff?: string;
  rank?: number; // 0 = best, 1 = second, 2 = third
}
```

### Missing Data: Gateway Resolution Tracking

**Current State**: The system does not explicitly track whether a gateway was resolved from another city.

**Workaround**: 
- Compare `gateway.outbound.gatewayCity` with `body.draftStops.map(s => s.city)`
- If not found in draft stops → gateway was resolved

**Recommendation**: If this information is needed, consider:
1. Modifying `resolveGatewayCandidates()` to return a mapping: `Map<originalCity, gatewayCity>`
2. Storing this mapping in the `GatewayOption` type as `resolvedFrom?: string`

## Summary

✅ **Available at finalization**:
- Gateway rank (index)
- Total price
- Total travel time
- Reliability score
- Number of flight options (derivable)
- Average stops (derivable)

⚠️ **Partially available**:
- Gateway resolution status (requires inference from draft stops)

✅ **Top 3 available together**: Line 185 in `/app/api/phase1/gateway-flights/route.ts`

✅ **Derivation approach**: Compare each gateway against the other 2 options using ranking-based logic for strengths, and identify the primary weakness for tradeoffs.

