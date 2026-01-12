import { NextRequest, NextResponse } from 'next/server';

interface TransportSearchParams {
  fromCity: string;
  toCity: string;
  date: string; // ISO date string
  passengers?: number;
  budget?: number;
  transportType?: 'train' | 'bus' | 'car' | 'ferry' | 'any';
  preferences?: {
    class?: string; // e.g., 'first', 'second' for trains
    amenities?: string[]; // e.g., ['wifi', 'power_outlet']
  };
  // Backward compatibility
  origin?: string;
  destination?: string;
  [key: string]: any; // Allow additional parameters
}

interface TransportOption {
  id: string;
  mode: 'train' | 'bus' | 'car' | 'ferry';
  provider: string;
  duration: string; // e.g., "2h 30m"
  price: number;
  departureTime: string; // e.g., "09:00"
  arrivalTime: string; // e.g., "11:30"
  recommended?: boolean;
  cheapest?: boolean;
  fastest?: boolean;
  [key: string]: any;
}

interface TransportResponse {
  fromCity: string;
  toCity: string;
  date: string;
  options: TransportOption[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: TransportSearchParams = await request.json();

    // Normalize field names (support both fromCity/toCity and origin/destination)
    const fromCity = body.fromCity || body.origin;
    const toCity = body.toCity || body.destination;

    // Validate required fields
    if (!fromCity || !toCity || !body.date) {
      return NextResponse.json(
        { error: 'Missing required fields: fromCity (or origin), toCity (or destination), date' },
        { status: 400 }
      );
    }

    // Validate date
    const travelDate = new Date(body.date);
    if (isNaN(travelDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO date string (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Get n8n webhook URL from environment variables
    const n8nUrl = process.env.N8N_TRANSPORT_URL;
    
    let options: TransportOption[] = [];
    
    if (n8nUrl) {
      try {
        // Forward request to n8n webhook
        // Prepare request payload - explicit fields take precedence
        const { origin, destination, ...restBody } = body;
        const payload = {
          ...restBody,
          fromCity,
          toCity,
          date: body.date,
          passengers: body.passengers,
        };

        const response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Check if n8n request was successful
        if (response.ok) {
          const data = await response.json();
          // Normalize n8n response to expected shape
          if (Array.isArray(data.options)) {
            options = data.options;
          } else if (Array.isArray(data)) {
            // If response is directly an array of options
            options = data;
          } else if (data.data && Array.isArray(data.data)) {
            // If options are nested under data
            options = data.data;
          } else if (data.results && Array.isArray(data.results)) {
            // Alternative nested structure
            options = data.results;
          }
          
          // Normalize option fields to match expected structure
          options = options.map((opt: any) => ({
            id: opt.id || `transport-${Date.now()}-${Math.random()}`,
            mode: opt.mode || opt.type || 'train',
            provider: opt.provider || 'Unknown Provider',
            duration: opt.duration || opt.durationString || '--',
            price: typeof opt.price === 'number' ? opt.price : 0,
            departureTime: opt.departureTime || opt.departTime || opt.departure_time || '--:--',
            arrivalTime: opt.arrivalTime || opt.arriveTime || opt.arrival_time || '--:--',
            recommended: opt.recommended || false,
            cheapest: opt.cheapest || false,
            fastest: opt.fastest || false,
            ...opt,
          }));
        } else {
          console.warn('n8n webhook returned error, using fallback:', response.status);
        }
      } catch (error) {
        console.warn('n8n webhook request failed, using fallback:', error);
      }
    }

    // Fallback: Generate mock transport options if n8n is not configured or failed
    if (options.length === 0) {
      options = generateMockTransportOptions(fromCity, toCity, body.date, body.passengers || 1);
    }

    // Ensure at least one option is marked as recommended
    if (options.length > 0 && !options.some(opt => opt.recommended)) {
      // Mark the first train option, or first option if no train
      const trainOption = options.find(opt => opt.mode === 'train');
      if (trainOption) {
        trainOption.recommended = true;
      } else {
        options[0].recommended = true;
      }
    }

    // Normalize response to always match expected shape
    const normalizedResponse: TransportResponse = {
      fromCity,
      toCity,
      date: body.date,
      options: options,
    };

    return NextResponse.json(normalizedResponse, { status: 200 });

  } catch (error) {
    console.error('Error in transport API route:', error);
    
    // Handle different error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Failed to connect to transport search service' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate mock transport options for fallback when n8n is not available
 */
function generateMockTransportOptions(
  fromCity: string,
  toCity: string,
  date: string,
  passengers: number
): TransportOption[] {
  const baseId = `${fromCity.toLowerCase().replace(/\s+/g, '-')}-${toCity.toLowerCase().replace(/\s+/g, '-')}`;
  
  // Calculate base times (morning departure)
  const travelDate = new Date(date);
  const baseHour = 9; // 9 AM
  const baseMinute = 0;

  const options: TransportOption[] = [
    // Train options (preferred, cheapest/fastest)
    {
      id: `${baseId}-train-1`,
      mode: 'train',
      provider: 'Rail Express',
      duration: '2h 15m',
      price: 45 * passengers,
      departureTime: `${String(baseHour).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 2).padStart(2, '0')}:${String(baseMinute + 15).padStart(2, '0')}`,
      cheapest: true,
      recommended: true,
    },
    {
      id: `${baseId}-train-2`,
      mode: 'train',
      provider: 'High Speed Rail',
      duration: '1h 45m',
      price: 65 * passengers,
      departureTime: `${String(baseHour + 1).padStart(2, '0')}:${String(baseMinute + 30).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 3).padStart(2, '0')}:${String(baseMinute + 15).padStart(2, '0')}`,
      fastest: true,
    },
    {
      id: `${baseId}-train-3`,
      mode: 'train',
      provider: 'Regional Rail',
      duration: '3h 30m',
      price: 35 * passengers,
      departureTime: `${String(baseHour + 2).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 5).padStart(2, '0')}:${String(baseMinute + 30).padStart(2, '0')}`,
    },
    // Bus option (cheaper, slower)
    {
      id: `${baseId}-bus-1`,
      mode: 'bus',
      provider: 'Intercity Bus Lines',
      duration: '4h 20m',
      price: 25 * passengers,
      departureTime: `${String(baseHour + 3).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 7).padStart(2, '0')}:${String(baseMinute + 20).padStart(2, '0')}`,
    },
    // Car/Taxi options (expensive, flexible)
    {
      id: `${baseId}-car-1`,
      mode: 'car',
      provider: 'RideShare Premium',
      duration: '2h 45m',
      price: 120 * passengers,
      departureTime: `${String(baseHour + 4).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 6).padStart(2, '0')}:${String(baseMinute + 45).padStart(2, '0')}`,
    },
    {
      id: `${baseId}-car-2`,
      mode: 'car',
      provider: 'Taxi Service',
      duration: '2h 30m',
      price: 150 * passengers,
      departureTime: `${String(baseHour + 5).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`,
      arrivalTime: `${String(baseHour + 7).padStart(2, '0')}:${String(baseMinute + 30).padStart(2, '0')}`,
    },
  ];

  return options;
}



