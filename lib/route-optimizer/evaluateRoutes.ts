import { EvaluatedRoute, RouteMetrics, StructuralRoute } from './types';

/**
 * Evaluate each structural route with concrete metrics.
 *
 * NOTE: This implementation uses deterministic heuristic values and is
 * explicitly marked as `pricingSource: 'mock'`. It is designed to be
 * replaced with real data integrations (flights, transport, hotels)
 * without changing the public API shape.
 */
export function evaluateRoutes(structuralRoutes: StructuralRoute[]): EvaluatedRoute[] {
  return structuralRoutes.map((route, index) => {
    const metrics = buildMockMetrics(route, index);

    const explanations: string[] = [
      `Visits ${route.groundRoute.length + 1} cities in a logical sequence.`,
      `Estimated total travel time of ~${Math.round(metrics.totalTravelMinutes / 60)} hours including transfers.`,
      `Pricing is placeholder/mock based on simple heuristics and should be replaced with real provider data.`,
    ];

    return {
      structural: route,
      metrics,
      explanations,
    };
  });
}

function buildMockMetrics(route: StructuralRoute, index: number): RouteMetrics {
  const numGroundLegs = route.groundRoute.length;
  const baseFlightMinutes = 180; // 3h per long‑haul leg (outbound + inbound)
  const baseGroundMinutes = numGroundLegs * 180; // 3h per ground leg

  const totalTravelMinutes = baseFlightMinutes * 2 + baseGroundMinutes;
  const totalTransfers = numGroundLegs + 2; // two flights + ground hops

  // Deterministic but varied pricing heuristic (explicitly mock)
  const basePrice = 500; // base trip price in arbitrary currency
  const variation = 50 * index;
  const totalPrice = basePrice + variation + numGroundLegs * 40;

  const metrics: RouteMetrics = {
    totalPrice,
    totalTravelMinutes,
    totalTransferMinutes: numGroundLegs * 45, // 45m per transfer (placeholder)
    totalTransfers,
    reliabilityScore: 0.1, // mock / heuristic only
    pricingSource: 'mock',
  };

  return metrics;
}






