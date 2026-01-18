/**
 * Preference Lens Derivation
 * 
 * Pure utility that derives user preference priorities and tolerances
 * from explicit user inputs (pace, budget, travelers).
 * 
 * This is deterministic logic only - no AI, no scoring, no ranking.
 */

export interface PreferenceLens {
  priority: "time" | "cost" | "comfort";
  tolerance: {
    stops: "low" | "medium" | "high";
    longJourneys: "low" | "medium" | "high";
  };
}

export interface UserInputs {
  pace?: "relaxed" | "moderate" | "packed";
  budget?: "low" | "medium" | "high";
  travelers?: {
    adults?: number;
    kids?: number;
  };
}

/**
 * Derives preference lens from user inputs.
 * 
 * Pure function with deterministic mapping rules.
 * 
 * @param inputs - User preference inputs
 * @returns Preference lens object with priority and tolerances
 */
export function derivePreferenceLens(inputs: UserInputs): PreferenceLens {
  const pace = inputs.pace;
  const budget = inputs.budget;
  const kids = inputs.travelers?.kids ?? 0;

  // Priority determination
  // Rule: Packed pace prioritizes time, low budget prioritizes cost, else comfort
  let priority: "time" | "cost" | "comfort";
  if (pace === "packed") {
    priority = "time";
  } else if (budget === "low") {
    priority = "cost";
  } else {
    priority = "comfort";
  }

  // Stops tolerance determination
  // Rule: Kids present = low tolerance, packed pace = low tolerance,
  //       low budget = high tolerance (willing to accept stops for savings), else medium
  let stopsTolerance: "low" | "medium" | "high";
  if (kids > 0) {
    stopsTolerance = "low";
  } else if (pace === "packed") {
    stopsTolerance = "low";
  } else if (budget === "low") {
    stopsTolerance = "high";
  } else {
    stopsTolerance = "medium";
  }

  // Long journey tolerance determination
  // Rule: Packed pace = low tolerance (want shorter journeys),
  //       low budget = high tolerance (willing to accept longer journeys for savings), else medium
  let longJourneyTolerance: "low" | "medium" | "high";
  if (pace === "packed") {
    longJourneyTolerance = "low";
  } else if (budget === "low") {
    longJourneyTolerance = "high";
  } else {
    longJourneyTolerance = "medium";
  }

  return {
    priority,
    tolerance: {
      stops: stopsTolerance,
      longJourneys: longJourneyTolerance,
    },
  };
}

/**
 * SUGGESTED INTEGRATION POINTS:
 * 
 * 1. Flight Options Results Screen (components/FlightOptionsResultsScreen.tsx)
 *    - Line ~417: After getting tripState, derive preferenceLens
 *    - Use to enhance AI explanation context or filter/sort flights
 * 
 * 2. Phase 1 Gateway Flights API (app/api/phase1/gateway-flights/route.ts)
 *    - After validating request body, derive preferenceLens from request
 *    - Could be used to influence gateway selection or flight ranking
 * 
 * 3. Explain Flights API (app/api/agent/explain-flights/route.ts)
 *    - After parsing userPreferences, derive preferenceLens
 *    - Pass to AI prompt for more context-aware explanations
 * 
 * Example usage:
 * 
 *   const preferenceLens = derivePreferenceLens({
 *     pace: tripState.pace as "relaxed" | "moderate" | "packed",
 *     budget: tripState.budget === 'budget' ? 'low' : tripState.budget === 'luxury' ? 'high' : 'medium',
 *     travelers: {
 *       adults: tripState.adults,
 *       kids: tripState.kids,
 *     },
 *   });
 */

