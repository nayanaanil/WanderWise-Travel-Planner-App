import {
  ConfidenceLevel,
  EvaluatedRoute,
  OptimizedRouteOption,
  RouteMetrics,
} from './types';

/**
 * Step C: Rank evaluated routes into final user-facing optimized options.
 *
 * This function:
 *  - uses ONLY concrete metrics from RouteMetrics
 *  - derives transparent, deterministic scores
 *  - assigns descriptive labels when they are provably true
 *  - never fabricates prices, times, or narrows ranges
 */

const IMPACT_PENALTIES = {
  flightAnchorReplacement: 0.15,
  addedGroundLeg: 0.1,
};

function computeImpactPenalty(route: EvaluatedRoute): number {
  const impact = route.structural.itineraryImpact;
  if (!impact) return 0;

  return (
    impact.flightAnchorReplacements.length * IMPACT_PENALTIES.flightAnchorReplacement +
    impact.addedGroundLegs.length * IMPACT_PENALTIES.addedGroundLeg
  );
}

export function rankOptimizedRoutes(
  evaluated: EvaluatedRoute[]
): OptimizedRouteOption[] {
  if (!evaluated.length) return [];

  // Extract metric availability flags up front for clarity.
  const metricsWithFlags = evaluated.map((er) => {
    const m = er.metrics;
    const hasPrice = Number.isFinite(m.totalPrice);
    const hasTime = Number.isFinite(m.totalTravelMinutes);
    const hasAnyMetric = hasPrice || hasTime || Number.isFinite(m.totalTransfers);

    return {
      evaluated: er,
      metrics: m,
      hasPrice,
      hasTime,
      hasAnyMetric,
    };
  });

  // "Complete" routes are those with both price and time available.
  const completeRoutes = metricsWithFlags.filter((m) => m.hasPrice && m.hasTime);

  // Helper to get index in the original evaluated array
  const indexOf = (er: EvaluatedRoute) =>
    evaluated.findIndex((r) => r === er);

  // --- 1) Compute global bests for labels (Cheapest, Fastest, Fewest Transfers) ---

  // Cheapest and Fastest only among complete routes
  let cheapestIndex: number | null = null;
  let fastestIndex: number | null = null;

  if (completeRoutes.length > 0) {
    let cheapestPrice = Infinity;
    let fastestMinutes = Infinity;

    for (const item of completeRoutes) {
      const idx = indexOf(item.evaluated);

      if (item.hasPrice && item.metrics.totalPrice < cheapestPrice) {
        cheapestPrice = item.metrics.totalPrice;
        cheapestIndex = idx;
      }

      if (
        item.hasTime &&
        item.metrics.totalTravelMinutes < fastestMinutes
      ) {
        fastestMinutes = item.metrics.totalTravelMinutes;
        fastestIndex = idx;
      }
    }
  }

  // Fewest Transfers can be determined for any route with a numeric totalTransfers
  let fewestTransfersIndex: number | null = null;
  if (metricsWithFlags.length > 0) {
    let minTransfers = Infinity;
    metricsWithFlags.forEach((item) => {
      const transfers = item.metrics.totalTransfers;
      if (Number.isFinite(transfers) && transfers < minTransfers) {
        minTransfers = transfers;
        fewestTransfersIndex = indexOf(item.evaluated);
      }
    });
  }

  // --- 2) Compute transparent, deterministic weighted scores for "Best Balance" ---

  // Weights are fixed and documented: price 0.5, time 0.3, transfers 0.2
  const PRICE_WEIGHT = 0.5;
  const TIME_WEIGHT = 0.3;
  const TRANSFER_WEIGHT = 0.2;

  // Compute min/max for normalization (only across routes that have the metric)
  const finitePrices = metricsWithFlags
    .filter((m) => m.hasPrice)
    .map((m) => m.metrics.totalPrice);
  const finiteTimes = metricsWithFlags
    .filter((m) => m.hasTime)
    .map((m) => m.metrics.totalTravelMinutes);
  const finiteTransfers = metricsWithFlags
    .filter((m) => Number.isFinite(m.metrics.totalTransfers))
    .map((m) => m.metrics.totalTransfers);

  const priceMin = finitePrices.length ? Math.min(...finitePrices) : NaN;
  const priceMax = finitePrices.length ? Math.max(...finitePrices) : NaN;
  const timeMin = finiteTimes.length ? Math.min(...finiteTimes) : NaN;
  const timeMax = finiteTimes.length ? Math.max(...finiteTimes) : NaN;
  const transfersMin = finiteTransfers.length ? Math.min(...finiteTransfers) : NaN;
  const transfersMax = finiteTransfers.length ? Math.max(...finiteTransfers) : NaN;

  const norm = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
      // If we cannot normalize (missing metric), treat as worst (1)
      return 1;
    }
    if (max === min) return 0; // all equal; no penalty
    return (value - min) / (max - min);
  };

  const scored = metricsWithFlags.map((item, idx) => {
    const m = item.metrics;
    const priceScore = norm(m.totalPrice, priceMin, priceMax); // 0 best, 1 worst
    const timeScore = norm(m.totalTravelMinutes, timeMin, timeMax);
    const transferScore = norm(m.totalTransfers, transfersMin, transfersMax);

    // Lower rawScore is better
    const rawScore =
      PRICE_WEIGHT * priceScore +
      TIME_WEIGHT * timeScore +
      TRANSFER_WEIGHT * transferScore;

    // Convert to higher-is-better in [0, 100]
    let finalScore = Math.round((1 - rawScore) * 100);

    // Apply impact penalty (soft penalty as tie-breaker/preference nudge)
    finalScore -= computeImpactPenalty(item.evaluated);

    return {
      evaluated: item.evaluated,
      metrics: m,
      hasPrice: item.hasPrice,
      hasTime: item.hasTime,
      finalScore,
      originalIndex: idx,
    };
  });

  // Best Balance is the complete route with the highest score; if none complete, highest overall.
  const scoredComplete = scored.filter((s) => s.hasPrice && s.hasTime);
  let bestBalanceIndex: number | null = null;
  if (scoredComplete.length > 0) {
    let bestScore = -Infinity;
    scoredComplete.forEach((s) => {
      const idx = indexOf(s.evaluated);
      if (s.finalScore > bestScore) {
        bestScore = s.finalScore;
        bestBalanceIndex = idx;
      }
    });
  } else {
    let bestScore = -Infinity;
    scored.forEach((s) => {
      const idx = indexOf(s.evaluated);
      if (s.finalScore > bestScore) {
        bestScore = s.finalScore;
        bestBalanceIndex = idx;
      }
    });
  }

  // --- 3) Derive confidence based on metric completeness and price proximity ---

  // Determine which routes are "price-sensitive" – lower-bound prices are very close.
  const priceSensitiveIndices = new Set<number>();
  const completeWithPrice = scored.filter((s) => s.hasPrice);
  const PRICE_PROXIMITY_THRESHOLD = 0.05; // 5% difference considered overlapping range

  for (let i = 0; i < completeWithPrice.length; i++) {
    for (let j = i + 1; j < completeWithPrice.length; j++) {
      const a = completeWithPrice[i];
      const b = completeWithPrice[j];
      const minPrice = Math.min(a.metrics.totalPrice, b.metrics.totalPrice);
      const diff = Math.abs(a.metrics.totalPrice - b.metrics.totalPrice);
      if (minPrice > 0 && diff / minPrice <= PRICE_PROXIMITY_THRESHOLD) {
        priceSensitiveIndices.add(indexOf(a.evaluated));
        priceSensitiveIndices.add(indexOf(b.evaluated));
      }
    }
  }

  const deriveConfidence = (idx: number, m: RouteMetrics): ConfidenceLevel => {
    const hasPrice = Number.isFinite(m.totalPrice);
    const hasTime = Number.isFinite(m.totalTravelMinutes);

    if (priceSensitiveIndices.has(idx) && hasPrice) {
      return 'price-sensitive';
    }
    if (hasPrice && hasTime) {
      return 'high';
    }
    if (hasPrice || hasTime) {
      return 'medium';
    }
    return 'medium';
  };

  // --- 4) Build final OptimizedRouteOption objects, sorted by score desc, max 5 ---

  scored.sort((a, b) => b.finalScore - a.finalScore || a.originalIndex - b.originalIndex);

  const topScored = scored.slice(0, 5);

  const options: OptimizedRouteOption[] = topScored.map((item) => {
    const idx = indexOf(item.evaluated);
    const { structural, explanations: baseExplanations } = item.evaluated;
    const m = item.metrics;

    const labels: string[] = [];

    const isCheapest = cheapestIndex !== null && idx === cheapestIndex;
    const isFastest = fastestIndex !== null && idx === fastestIndex;
    const isFewestTransfers =
      fewestTransfersIndex !== null && idx === fewestTransfersIndex;
    const isBestBalance =
      bestBalanceIndex !== null && idx === bestBalanceIndex && item.hasPrice && item.hasTime;

    if (isCheapest) labels.push('Cheapest');
    if (isFastest) labels.push('Fastest');
    if (isFewestTransfers) labels.push('Fewest Transfers');
    if (isBestBalance) labels.push('Best Balance');

    const confidence = deriveConfidence(idx, m);

    // Build 2–4 plain-English bullets explaining ranking and tradeoffs.
    const bullets: string[] = [];

    // 1) Structural explanation
    bullets.push(structural.summary);

    // 2) Metrics explanation
    const metricsParts: string[] = [];
    if (Number.isFinite(m.totalPrice)) {
      metricsParts.push(`lower-bound total flight price ${m.totalPrice}`);
    } else {
      metricsParts.push('total flight price unavailable');
    }
    if (Number.isFinite(m.totalTravelMinutes)) {
      metricsParts.push(
        `minimum combined flight time ~${Math.round(m.totalTravelMinutes / 60)} hours`
      );
    } else {
      metricsParts.push('combined flight time unavailable');
    }
    if (Number.isFinite(m.totalTransfers)) {
      metricsParts.push(`total transfers ${m.totalTransfers}`);
    }
    bullets.push(metricsParts.join(', ') + '.');

    // 3) Label explanation (if any labels exist)
    if (labels.length > 0) {
      const labelText: string[] = [];
      if (isCheapest) {
        labelText.push(
          'Cheapest: this route has the lowest lower-bound total flight price among all routes with complete price and time data.'
        );
      }
      if (isFastest) {
        labelText.push(
          'Fastest: this route has the smallest minimum combined flight travel time among all routes with complete price and time data.'
        );
      }
      if (isFewestTransfers) {
        labelText.push(
          'Fewest Transfers: this route uses the lowest number of flight and ground segments among all evaluated routes.'
        );
      }
      if (isBestBalance) {
        labelText.push(
          'Best Balance: this route achieves the highest transparent weighted score across price (0.5), time (0.3), and transfers (0.2).'
        );
      }
      bullets.push(labelText.join(' '));
    }

    // 4) Incompleteness explanation if metrics are missing
    if (!(item.hasPrice && item.hasTime)) {
      bullets.push(
        'Price and/or time unavailable due to missing live flight data; labels based solely on available metrics.'
      );
    }

    // Ensure bullets are between 2 and 4 by trimming if necessary
    const finalBullets = bullets.slice(0, 4);

    const title =
      labels.length > 0
        ? `${labels.join(' · ')} route`
        : 'Route option';

    const summary = structural.summary;

    // Ensure groundRoute is preserved in optimized route option
    const optimized: OptimizedRouteOption = {
      id: structural.id,
      title,
      summary,
      structural: {
        ...structural,
        groundRoute: structural.groundRoute, // Explicitly preserve groundRoute
      },
      metrics: m,
      explanations: [...baseExplanations, ...finalBullets],
      confidence,
      score: item.finalScore,
    };
    
    // Debug: Log groundRoute preservation
    console.debug('[DEBUG][RankOptimizedRoutes]', {
      routeId: structural.id,
      groundRouteLength: structural.groundRoute.length,
      preserved: optimized.structural.groundRoute.length === structural.groundRoute.length,
    });

    return optimized;
  });

  return options;
}


