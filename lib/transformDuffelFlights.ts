import { FlightLeg, FlightLayover, FlightLegOrLayover } from '@/lib/phase1/types';

export interface FlightOption {
  id: string;
  airline: string;
  price: number;
  origin: string;
  destination: string;
  departureTime: string; // HH:mm format (backward compatible)
  arrivalTime: string; // HH:mm format (backward compatible)
  duration: string; // formatted "Xh Ym"
  stops: number; // segments.length - 1
  // New fields for accurate timezone-aware calculations
  departureTimestamp?: string; // ISO 8601 timestamp with timezone
  arrivalTimestamp?: string; // ISO 8601 timestamp with timezone
  // New field for detailed leg and layover information
  legs?: FlightLegOrLayover[];
}

/**
 * Parses ISO8601 duration string (e.g., "PT7H55M") into human-readable format (e.g., "7h 55m")
 */
function parseIsoDuration(iso: string): string {
  if (!iso || typeof iso !== 'string') {
    return '0h';
  }

  // Remove 'PT' prefix
  const duration = iso.replace('PT', '');
  
  // Extract hours and minutes using regex
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  // Format as "Xh Ym" or just "Xh" if no minutes, or just "Ym" if no hours
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '0h';
  }
}

/**
 * Parses ISO8601 duration string into total minutes
 */
function parseIsoDurationToMinutes(iso: string): number {
  if (!iso || typeof iso !== 'string') {
    return 0;
  }

  const duration = iso.replace('PT', '');
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  return hours * 60 + minutes;
}

/**
 * Calculates layover duration in minutes between two timestamps
 */
function calculateLayoverMinutes(arrivalTimestamp: string, departureTimestamp: string): number {
  try {
    const arrival = new Date(arrivalTimestamp);
    const departure = new Date(departureTimestamp);
    
    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
      return 0;
    }
    
    const diffMs = departure.getTime() - arrival.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60))); // Convert to minutes
  } catch {
    return 0;
  }
}

/**
 * Builds legs and layovers array from Duffel segments
 */
function buildLegsArray(segments: any[]): FlightLegOrLayover[] {
  const legs: FlightLegOrLayover[] = [];
  
  if (!segments || segments.length === 0) {
    return legs;
  }
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Extract leg information
    const fromAirport = segment.origin?.iata_code;
    const toAirport = segment.destination?.iata_code;
    const departureTimestamp = segment.departing_at;
    const arrivalTimestamp = segment.arriving_at;
    const segmentDuration = segment.duration;
    
    if (!fromAirport || !toAirport || !departureTimestamp || !arrivalTimestamp) {
      continue; // Skip invalid segments
    }
    
    // Calculate duration from segment duration or timestamps
    let durationMinutes = 0;
    if (segmentDuration) {
      durationMinutes = parseIsoDurationToMinutes(segmentDuration);
    } else {
      // Fallback: calculate from timestamps
      try {
        const dep = new Date(departureTimestamp);
        const arr = new Date(arrivalTimestamp);
        if (!isNaN(dep.getTime()) && !isNaN(arr.getTime())) {
          durationMinutes = Math.round((arr.getTime() - dep.getTime()) / (1000 * 60));
        }
      } catch {
        // Keep durationMinutes as 0
      }
    }
    
    // Add flight leg
    legs.push({
      fromAirport,
      toAirport,
      departureTimestamp,
      arrivalTimestamp,
      durationMinutes,
    });
    
    // If not the last segment, calculate and add layover
    if (i < segments.length - 1) {
      const nextSegment = segments[i + 1];
      const nextDepartureTimestamp = nextSegment.departing_at;
      const layoverAirport = toAirport; // Layover occurs at destination of current segment
      
      if (nextDepartureTimestamp) {
        const layoverMinutes = calculateLayoverMinutes(arrivalTimestamp, nextDepartureTimestamp);
        
        legs.push({
          layoverMinutes,
          airport: layoverAirport,
        });
      }
    }
  }
  
  return legs;
}

/**
 * Transforms Duffel API offer response into FlightOption array
 * 
 * @param raw - The response from Duffel API with structure:
 *   Primary: { offers: [...] } (current Duffel response - no data wrapper)
 *   Fallback 1: { data: { offers: [...] } } (Duffel v2 with data wrapper)
 *   Fallback 2: { data: [{ offers: [...] }, ...] } (array of offer_requests)
 * @returns Array of FlightOption objects
 */
export function transformDuffelOffers(raw: any): FlightOption[] {
  const flights: FlightOption[] = [];

  // Handle null/undefined responses (e.g., when return is null)
  if (!raw || typeof raw !== 'object') {
    if (raw === null) {
      // This is expected when return flights are not available
      return flights;
    }
    console.warn("Duffel response is not an object:", { raw, type: typeof raw });
    return flights;
  }

  let offers: any[] = [];
  let source = 'unknown';

  // Primary: raw.offers (current Duffel response shape - no data wrapper)
  // API response format: { outbound: { offers: [...] }, return: null }
  // When called with data.outbound or data.return, raw = { offers: [...] }
  if (Array.isArray(raw.offers)) {
    offers = raw.offers;
    source = 'raw.offers';
  }
  // Fallback 1: raw.data.offers (Duffel v2 direct offers with data wrapper)
  else if (raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.offers)) {
    offers = raw.data.offers;
    source = 'raw.data.offers';
  }
  // Fallback 2: raw.data is an array of offer_requests (older structure)
  else if (Array.isArray(raw.data)) {
    offers = raw.data.flatMap((req: any) => (req?.offers && Array.isArray(req.offers) ? req.offers : []));
    source = 'raw.data (offer_requests array)';
  }

  if (!offers.length) {
    console.warn("Duffel response contains no offers. Response structure:", {
      source,
      hasOffers: Array.isArray(raw.offers),
      offersLength: Array.isArray(raw.offers) ? raw.offers.length : 0,
      hasDataOffers: Array.isArray(raw.data?.offers),
      hasDataArray: Array.isArray(raw.data),
      rawKeys: Object.keys(raw),
      rawType: typeof raw,
      rawValue: raw,
    });
    return flights;
  }

  for (const offer of offers) {
    try {
      const slices = offer.slices;
      if (!slices || slices.length === 0) continue;

      const firstSlice = slices[0];
      const segments = firstSlice.segments;
      if (!segments || segments.length === 0) continue;

      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      const origin = firstSegment.origin?.iata_code || null;
      const destination = lastSegment.destination?.iata_code || null;

      // Extract clock times (HH:mm) for backward compatibility
      const departureTime = firstSegment.departing_at?.slice(11, 16) || "";
      const arrivalTime = lastSegment.arriving_at?.slice(11, 16) || "";

      // Preserve full ISO 8601 timestamps with timezone for accurate calculations
      const departureTimestamp = firstSegment.departing_at || undefined;
      const arrivalTimestamp = lastSegment.arriving_at || undefined;

      // Offer duration comes from offer.total_duration or slice.duration
      const durationISO =
        offer.total_duration ||
        firstSlice.duration ||
        "";

      const duration = parseIsoDuration(durationISO);

      // Build legs array with detailed leg and layover information
      const legs = buildLegsArray(segments);

      flights.push({
        id: offer.id,
        airline:
          offer.owner?.name ||
          offer.owner?.iata_code ||
          "Unknown Airline",
        price: Number(offer.total_amount),
        origin,
        destination,
        departureTime,
        arrivalTime,
        duration,
        stops: segments.length - 1,
        // Include full timestamps if available
        ...(departureTimestamp && { departureTimestamp }),
        ...(arrivalTimestamp && { arrivalTimestamp }),
        // Include legs array if available (always for valid flights)
        ...(legs.length > 0 && { legs }),
      });
    } catch (err) {
      console.warn("Skipping invalid Duffel offer:", err);
    }
  }

  return flights;
}


