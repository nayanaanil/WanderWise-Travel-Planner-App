import { StructuralRoute, EvaluatedRoute, RouteMetrics, FlightAnchor } from './types';
import { findAirportCode } from '@/lib/airports';

interface AnchorEvaluation {
  hasData: boolean;
  offerCount: number;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  fastestDurationMinutes?: number;
  missingReason?: string;
}

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;
const DUFFEL_ENDPOINT = 'https://api.duffel.com/air/offer_requests';

/**
 * Step B: Concrete evaluation using real Duffel data.
 *
 * This function:
 *  - queries Duffel once per FlightAnchor (outbound/inbound)
 *  - derives factual price & time ranges from returned offers
 *  - aggregates those into EvaluatedRoute objects
 *
 * No ranking, no "best" labels, and no confidence scoring is performed here.
 * Every numeric value is either directly from Duffel or derived by simple
 * arithmetic on Duffel values (e.g. sums, mins, maxes).
 */
export async function evaluateConcreteRoutes(
  structuralRoutes: StructuralRoute[]
): Promise<EvaluatedRoute[]> {
  if (!DUFFEL_API_KEY) {
    console.warn('[route-optimizer] DUFFEL_API_KEY is not set; all routes will be marked incomplete.');
  }

  const results: EvaluatedRoute[] = [];

  for (const structural of structuralRoutes) {
    const [outboundEval, inboundEval] = await Promise.all([
      evaluateFlightAnchor(structural.outboundFlight),
      evaluateFlightAnchor(structural.inboundFlight),
    ]);

    const hasOutbound = outboundEval.hasData;
    const hasInbound = inboundEval.hasData;
    const isComplete = hasOutbound && hasInbound;

    // Aggregate concrete metrics across anchors where possible.
    const metrics: RouteMetrics = buildMetricsFromAnchors(
      structural,
      outboundEval,
      inboundEval
    );

    const explanations: string[] = [];

    // Outbound explanation
    explanations.push(
      describeAnchorEvaluation(
        'Outbound',
        structural.outboundFlight,
        outboundEval
      )
    );

    // Inbound explanation
    explanations.push(
      describeAnchorEvaluation(
        'Return',
        structural.inboundFlight,
        inboundEval
      )
    );

    if (isComplete) {
      // Price range across both anchors (lower and upper bounds)
      const hasPriceRange =
        typeof outboundEval.minPrice === 'number' &&
        typeof outboundEval.maxPrice === 'number' &&
        typeof inboundEval.minPrice === 'number' &&
        typeof inboundEval.maxPrice === 'number';

      if (hasPriceRange) {
        const lower = (outboundEval.minPrice ?? 0) + (inboundEval.minPrice ?? 0);
        const upper = (outboundEval.maxPrice ?? 0) + (inboundEval.maxPrice ?? 0);
        const currency = outboundEval.currency || inboundEval.currency || '';
        explanations.push(
          `Total flight price range across route: ${lower} – ${upper} ${currency}`.trim()
        );
      } else {
        explanations.push('Total flight price range could not be fully determined.');
      }

      const hasTime =
        typeof metrics.totalTravelMinutes === 'number' &&
        !Number.isNaN(metrics.totalTravelMinutes);

      if (hasTime) {
        explanations.push(
          `Minimum combined flight travel time across route is approximately ${Math.round(
            metrics.totalTravelMinutes / 60
          )} hours.`
        );
      } else {
        explanations.push('Combined flight travel time could not be fully determined.');
      }
    } else {
      explanations.push(
        'Route marked incomplete: missing Duffel data for one or more flight anchors; price and time metrics may be null.'
      );
    }

    // Ensure groundRoute is preserved in evaluated route
    const evaluatedRoute: EvaluatedRoute = {
      structural: {
        ...structural,
        groundRoute: structural.groundRoute, // Explicitly preserve groundRoute
      },
      metrics,
      explanations,
    };
    
    // Debug: Log groundRoute preservation
    console.debug('[DEBUG][EvaluateConcreteRoutes]', {
      routeId: structural.id,
      groundRouteLength: structural.groundRoute.length,
      preserved: evaluatedRoute.structural.groundRoute.length === structural.groundRoute.length,
    });
    
    results.push(evaluatedRoute);
  }

  return results;
}

async function evaluateFlightAnchor(anchor: FlightAnchor): Promise<AnchorEvaluation> {
  if (!DUFFEL_API_KEY) {
    return {
      hasData: false,
      offerCount: 0,
      missingReason: 'DUFFEL_API_KEY is not configured.',
    };
  }

  const originCode = findAirportCode(anchor.fromCity);
  const destinationCode = findAirportCode(anchor.toCity);

  if (!originCode || !destinationCode) {
    return {
      hasData: false,
      offerCount: 0,
      missingReason: `Unable to resolve airport codes for ${anchor.fromCity} or ${anchor.toCity}.`,
    };
  }

  try {
    const requestBody = {
      data: {
        slices: [
          {
            origin: originCode,
            destination: destinationCode,
            departure_date: anchor.date,
          },
        ],
        passengers: [{ type: 'adult' }],
        cabin_class: 'economy',
        max_connections: typeof anchor.maxStops === 'number' ? anchor.maxStops : 2,
      },
    };

    const response = await fetch(DUFFEL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.warn(
        '[route-optimizer] Duffel offer_requests error:',
        response.status,
        await safeReadErrorBody(response)
      );
      return {
        hasData: false,
        offerCount: 0,
        missingReason: `Duffel responded with status ${response.status}.`,
      };
    }

    const json = await response.json();
    const offers: any[] =
      (Array.isArray(json?.offers) && json.offers) ||
      (Array.isArray(json?.data?.offers) && json.data.offers) ||
      [];

    if (!offers.length) {
      return {
        hasData: false,
        offerCount: 0,
        missingReason: 'Duffel returned no offers for this anchor.',
      };
    }

    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    let fastestDurationMinutes: number | undefined;
    let currency: string | undefined;

    for (const offer of offers) {
      const amount = Number(offer.total_amount);
      const offerCurrency: string | undefined = offer.total_currency;
      const durationISO: string | undefined =
        offer.total_duration || offer.slices?.[0]?.duration;

      if (!Number.isFinite(amount)) continue;

      if (!currency) {
        currency = offerCurrency;
      }

      if (minPrice === undefined || amount < minPrice) {
        minPrice = amount;
      }
      if (maxPrice === undefined || amount > maxPrice) {
        maxPrice = amount;
      }

      if (durationISO) {
        const minutes = parseIsoDurationToMinutes(durationISO);
        if (
          Number.isFinite(minutes) &&
          (fastestDurationMinutes === undefined || minutes < fastestDurationMinutes)
        ) {
          fastestDurationMinutes = minutes;
        }
      }
    }

    return {
      hasData: typeof minPrice === 'number' && typeof maxPrice === 'number',
      offerCount: offers.length,
      currency,
      minPrice,
      maxPrice,
      fastestDurationMinutes,
    };
  } catch (error) {
    console.error('[route-optimizer] Error querying Duffel:', error);
    return {
      hasData: false,
      offerCount: 0,
      missingReason: 'Error querying Duffel offer_requests.',
    };
  }
}

function buildMetricsFromAnchors(
  structural: StructuralRoute,
  outbound: AnchorEvaluation,
  inbound: AnchorEvaluation
): RouteMetrics {
  const bothHaveData = outbound.hasData && inbound.hasData;

  // All numbers here are derived directly from Duffel anchor evaluations
  // or from structural information (e.g. transfer counts).
  const totalMinPrice =
    (outbound.minPrice ?? NaN) + (inbound.minPrice ?? NaN);
  const minTravelMinutes =
    (outbound.fastestDurationMinutes ?? NaN) +
    (inbound.fastestDurationMinutes ?? NaN);

  const numericOrNaN = (value: number) =>
    Number.isFinite(value) ? value : NaN;

  const metrics: RouteMetrics = {
    // Lower bound of factual total flight price range (sum of anchor minPrices)
    totalPrice: bothHaveData ? numericOrNaN(totalMinPrice) : NaN,
    // Minimum combined flight travel time across both anchors (minutes)
    totalTravelMinutes: bothHaveData ? numericOrNaN(minTravelMinutes) : NaN,
    // Sum of layover / connection times in minutes (not yet computed in this step)
    totalTransferMinutes: NaN,
    // Transfers are structural: two flight anchors plus ground legs with travel between them.
    totalTransfers:
      structural.groundRoute.length + (outbound.hasData ? 1 : 0) + (inbound.hasData ? 1 : 0),
    reliabilityScore: bothHaveData
      ? 1
      : outbound.hasData || inbound.hasData
      ? 0.5
      : 0,
    pricingSource: bothHaveData ? 'real' : outbound.hasData || inbound.hasData ? 'mixed' : 'mixed',
  };

  return metrics;
}

function describeAnchorEvaluation(
  label: 'Outbound' | 'Return',
  anchor: FlightAnchor,
  evalResult: AnchorEvaluation
): string {
  const base = `${label} ${anchor.fromCity} → ${anchor.toCity} on ${anchor.date}`;

  if (!evalResult.hasData) {
    return `${base}: no Duffel offers available. ${evalResult.missingReason ?? ''}`.trim();
  }

  const pricePart =
    evalResult.minPrice !== undefined && evalResult.maxPrice !== undefined
      ? `price range ${evalResult.minPrice}–${evalResult.maxPrice} ${evalResult.currency ?? ''}`.trim()
      : 'price information unavailable';

  const timePart =
    evalResult.fastestDurationMinutes !== undefined
      ? `fastest duration ~${Math.round(
          evalResult.fastestDurationMinutes / 60
        )} hours`
      : 'duration unavailable';

  return `${base}: ${evalResult.offerCount} offers, ${pricePart}, ${timePart}.`;
}

function parseIsoDurationToMinutes(iso: string): number {
  // Basic support for ISO8601 durations like "PT3H20M", "PT2H", "PT45M"
  const match =
    iso &&
    iso.match(
      /^P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/i
    );

  if (!match) return NaN;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  return hours * 60 + minutes + Math.round(seconds / 60);
}

async function safeReadErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return '';
  }
}


