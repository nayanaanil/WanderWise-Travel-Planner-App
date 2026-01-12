import { ConfidenceLevel, EvaluatedRoute, OptimizedRouteOption } from './types';

/**
 * Rank evaluated routes and map them into final OptimizedRouteOption objects.
 * The scoring is deterministic and based on weighted metrics.
 */
export function rankRoutes(
  evaluated: EvaluatedRoute[]
): OptimizedRouteOption[] {
  if (evaluated.length === 0) return [];

  // Compute scores (lower is better for rawScore; we convert to higher‑is‑better later)
  const withScores = evaluated.map((route, index) => {
    const { metrics } = route;

    // Normalize metrics into a simple weighted score.
    // These weights are deliberately simple and deterministic, and can be
    // tuned or replaced without changing the public API.
    const priceWeight = 0.6;
    const timeWeight = 0.3;
    const transferWeight = 0.1;

    const rawScore =
      priceWeight * metrics.totalPrice +
      timeWeight * metrics.totalTravelMinutes +
      transferWeight * metrics.totalTransfers * 60;

    return { route, rawScore, index };
  });

  // Lower rawScore is better; sort ascending
  withScores.sort((a, b) => a.rawScore - b.rawScore || a.index - b.index);

  const bestRaw = withScores[0].rawScore;
  const worstRaw = withScores[withScores.length - 1].rawScore || bestRaw || 1;
  const range = Math.max(1, worstRaw - bestRaw);

  const options: OptimizedRouteOption[] = withScores.slice(0, 5).map((item, idx) => {
    const { route, rawScore } = item;
    const { structural, metrics, explanations } = route;

    // Convert to 0–100 where 100 is best (lowest rawScore)
    const normalizedScore = 100 - ((rawScore - bestRaw) / range) * 80;

    const confidence: ConfidenceLevel =
      idx === 0
        ? 'high'
        : metrics.pricingSource === 'mock'
        ? 'price-sensitive'
        : 'medium';

    const title =
      idx === 0
        ? 'Recommended route'
        : idx === 1
        ? 'Great value alternative'
        : 'Alternative route';

    const summary = structural.summary;

    return {
      id: structural.id,
      title,
      summary,
      structural,
      metrics,
      explanations,
      confidence,
      score: Math.round(normalizedScore),
    };
  });

  return options;
}






