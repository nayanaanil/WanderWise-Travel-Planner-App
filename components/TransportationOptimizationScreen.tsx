import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Check, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';
import { Label } from '@/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Slider } from '@/ui/slider';
import { Checkbox } from '@/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/dropdown-menu';
import { ScrollArea } from '@/ui/scroll-area';
import { CityToCityContent } from './CityToCityContent';
import { StepHeader } from '@/components/StepHeader';

interface TransportationOptimizationScreenProps {
  onBack?: () => void;
  onLockChoices?: () => void;
}

interface FlightDetails {
  outbound: {
    date: string;
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    aircraft: string;
    stops: string;
  };
  return: {
    date: string;
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    aircraft: string;
    stops: string;
  };
}

interface FlightOption {
  id: string;
  type: string;
  airline: string;
  airlineLogo: string;
  price: number;
  details: string;
  impact: string;
  recommended?: boolean;
  lowestPrice?: boolean;
  flightDetails?: FlightDetails;
}

type QuickFilter = 'all' | 'cheapest' | 'shortest' | 'direct' | 'free-bags' | 'morning' | 'flexible' | 'premium';
type SortOption = 'price-low' | 'price-high' | 'duration' | 'departure' | 'value' | 'popular';

export function TransportationOptimizationScreen({
  onBack,
  onLockChoices
}: TransportationOptimizationScreenProps) {
  const [activeTab, setActiveTab] = useState<'flights' | 'city-to-city'>('flights');
  const [showSmartOverlay, setShowSmartOverlay] = useState(true);
  const [showCityTransportTips, setShowCityTransportTips] = useState(true);
  const [showRouteOptimization, setShowRouteOptimization] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [visibleFlights, setVisibleFlights] = useState(3);
  const [selectedBaggage, setSelectedBaggage] = useState<string>('carry-on');
  const [selectedSeat, setSelectedSeat] = useState<string>('random');
  
  // City-to-city transport states
  const [expandedTransportId, setExpandedTransportId] = useState<string | null>(null);
  const [selectedPragueViennaId, setSelectedPragueViennaId] = useState<string | null>(null);
  const [selectedViennaMunichId, setSelectedViennaMunichId] = useState<string | null>(null);
  const [showLuggageSection, setShowLuggageSection] = useState(false);
  const [transportFilters, setTransportFilters] = useState({
    trainHighSpeed: true,
    trainRegional: true,
    bus: true,
    rentalCar: false,
    privateTransfer: false,
  });
  const [departurePreferences, setDeparturePreferences] = useState({
    earlyMorning: false,
    morning: true,
    afternoon: false,
    evening: false,
    overnight: true,
  });
  const [comfortLevel, setComfortLevel] = useState('standard');
  
  // Filter states
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilter[]>(['all']);
  const [priceRange, setPriceRange] = useState<number[]>([420, 650]);
  const [departureTime, setDepartureTime] = useState<string>('morning');
  const [directOnly, setDirectOnly] = useState(false);
  const [maxOneStop, setMaxOneStop] = useState(false);
  const [anyStops, setAnyStops] = useState(true);
  const [freeBag, setFreeBag] = useState(true);
  const [freeSeat, setFreeSeat] = useState(false);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>(['lufthansa', 'austrian']);
  const [travelDuration, setTravelDuration] = useState<number[]>([6, 10]);
  const [sortBy, setSortBy] = useState<SortOption>('price-low');

  const quickFilters = [
    { id: 'all' as QuickFilter, label: 'All' },
    { id: 'cheapest' as QuickFilter, label: 'Cheapest' },
    { id: 'shortest' as QuickFilter, label: 'Shortest' },
    { id: 'direct' as QuickFilter, label: 'Direct' },
    { id: 'free-bags' as QuickFilter, label: 'Free Bags' },
    { id: 'morning' as QuickFilter, label: 'Morning' },
    { id: 'flexible' as QuickFilter, label: 'Flexible' },
    { id: 'premium' as QuickFilter, label: 'Premium' }
  ];

  const filterPresets = [
    { id: 'budget', label: 'Budget Traveler', icon: '💰' },
    { id: 'business', label: 'Business', icon: '💼' },
    { id: 'family', label: 'Family Trip', icon: '👨‍👩‍👧‍👦' },
    { id: 'luxury', label: 'Luxury', icon: '✨' },
    { id: 'last', label: 'My Last Search', icon: '🕒' }
  ];

  const airlines = [
    { id: 'lufthansa', name: 'Lufthansa', logo: '✈️' },
    { id: 'austrian', name: 'Austrian', logo: '✈️' },
    { id: 'ryanair', name: 'Ryanair', logo: '✈️' },
    { id: 'easyjet', name: 'EasyJet', logo: '✈️' },
    { id: 'klm', name: 'KLM', logo: '✈️' },
    { id: 'airfrance', name: 'Air France', logo: '✈️' }
  ];

  const flightOptions: FlightOption[] = [
    {
      id: 'multi-city',
      type: 'Multi-city: Prague in, Munich out',
      airline: 'Lufthansa',
      airlineLogo: '✈️',
      price: 420,
      details: '1 stop each way • 10h total travel',
      impact: 'Saves €200 vs round-trip',
      recommended: true,
      flightDetails: {
        outbound: {
          date: 'Dec 15',
          from: 'Bangalore',
          fromCode: 'BLR',
          to: 'Prague',
          toCode: 'PRG',
          flightNumber: 'LH1234',
          departure: '02:30',
          arrival: '12:45',
          aircraft: 'Airbus A350',
          stops: '1 stop in Frankfurt (1h 30min)'
        },
        return: {
          date: 'Dec 22',
          from: 'Munich',
          fromCode: 'MUC',
          to: 'Bangalore',
          toCode: 'BLR',
          flightNumber: 'LH5678',
          departure: '14:15',
          arrival: '05:30+1',
          aircraft: 'Boeing 787',
          stops: '1 stop in Vienna (1h 15min)'
        }
      }
    },
    {
      id: 'round-trip',
      type: 'Round-trip to Vienna',
      airline: 'Austrian Airlines',
      airlineLogo: '✈️',
      price: 620,
      details: '1 stop each way • 11h total travel',
      impact: 'Adds 3h ground transport',
      flightDetails: {
        outbound: {
          date: 'Dec 15',
          from: 'Bangalore',
          fromCode: 'BLR',
          to: 'Vienna',
          toCode: 'VIE',
          flightNumber: 'OS456',
          departure: '03:15',
          arrival: '14:30',
          aircraft: 'Boeing 777',
          stops: '1 stop in Mumbai (1h)'
        },
        return: {
          date: 'Dec 22',
          from: 'Vienna',
          fromCode: 'VIE',
          to: 'Bangalore',
          toCode: 'BLR',
          flightNumber: 'OS789',
          departure: '16:00',
          arrival: '06:45+1',
          aircraft: 'Boeing 777',
          stops: '1 stop in Mumbai (1h 10min)'
        }
      }
    },
    {
      id: 'separate',
      type: 'Separate one-ways to Munich',
      airline: 'Budget Air',
      airlineLogo: '✈️',
      price: 380,
      details: 'Most flexible, requires planning',
      impact: 'Lowest price',
      lowestPrice: true,
      flightDetails: {
        outbound: {
          date: 'Dec 15',
          from: 'Bangalore',
          fromCode: 'BLR',
          to: 'Munich',
          toCode: 'MUC',
          flightNumber: 'BA123',
          departure: '01:45',
          arrival: '13:15',
          aircraft: 'Airbus A330',
          stops: '1 stop in Dubai (2h)'
        },
        return: {
          date: 'Dec 22',
          from: 'Munich',
          fromCode: 'MUC',
          to: 'Bangalore',
          toCode: 'BLR',
          flightNumber: 'BA456',
          departure: '15:30',
          arrival: '06:30+1',
          aircraft: 'Airbus A330',
          stops: '1 stop in Dubai (2h 15min)'
        }
      }
    },
    {
      id: 'option-4',
      type: 'Morning departures both ways',
      airline: 'Lufthansa',
      airlineLogo: '✈️',
      price: 495,
      details: 'Early flights • 7h total travel',
      impact: 'Best for avoiding delays'
    },
    {
      id: 'option-5',
      type: 'Evening return flight',
      airline: 'Austrian Airlines',
      airlineLogo: '✈️',
      price: 445,
      details: '1 stop • Full last day',
      impact: 'Maximize time'
    },
    {
      id: 'option-6',
      type: 'Budget mix airlines',
      airline: 'Mixed',
      airlineLogo: '✈️',
      price: 365,
      details: 'Different carriers',
      impact: 'Save €55 more',
      lowestPrice: true
    },
    {
      id: 'option-7',
      type: 'Premium economy',
      airline: 'Lufthansa',
      airlineLogo: '✈️',
      price: 680,
      details: 'Extra comfort',
      impact: 'More legroom'
    },
    {
      id: 'option-8',
      type: 'Afternoon flights',
      airline: 'Swiss Air',
      airlineLogo: '✈️',
      price: 515,
      details: 'Convenient timing',
      impact: 'Sleep in, no rush'
    },
  ];

  // City-to-city transport options
  const pragueViennaOptions = [
    {
      id: 'pv-train',
      type: 'High-speed train',
      provider: 'ÖBB Railjet',
      logo: '🚄',
      price: 89,
      duration: '4h 15m',
      departTime: '08:30',
      arriveTime: '12:45',
      details: 'Direct • Reserved seats, WiFi, dining car',
      recommended: true,
      fullDetails: {
        trainNumber: 'RJ 62',
        from: 'Praha hlavní nádraží',
        to: 'Wien Hauptbahnhof',
        distance: '251km',
        speed: '59km/h',
        amenities: ['Reserved seat (window/aisle preference)', 'Free WiFi throughout journey', 'Power outlets at every seat', 'Dining car with Austrian cuisine', 'Luggage storage above seats'],
        seatOptions: [
          { type: 'Standard (included)', price: 0 },
          { type: 'Premium', price: 15 }
        ],
        mealOptions: [
          { type: 'Purchase onboard', price: 0 },
          { type: 'Pre-order meal', price: 12 }
        ],
        cancellationOptions: [
          { type: 'Standard (non-refundable)', price: 0 },
          { type: 'Flexible ticket', price: 8 }
        ],
        stationInfo: {
          departure: '15min walk from Old Town',
          arrival: 'Direct metro to city center (10min)'
        }
      }
    },
    {
      id: 'pv-bus',
      type: 'Express bus',
      provider: 'FlixBus',
      logo: '🚌',
      price: 35,
      duration: '5h 30m',
      departTime: 'Multiple departures',
      arriveTime: '',
      details: 'Direct • WiFi, power outlets',
      badge: 'Budget friendly'
    },
    {
      id: 'pv-car',
      type: 'Rental car',
      provider: 'Self-drive',
      logo: '🚗',
      price: 45,
      duration: '3h 30m',
      departTime: 'Flexible',
      arriveTime: '',
      details: 'Self-drive + stops • Most flexible',
      badge: 'Most flexible',
      extraInfo: '+ fuel costs'
    },
    {
      id: 'pv-night-train',
      type: 'Night train',
      provider: 'ÖBB Nightjet',
      logo: '🌙',
      price: 65,
      duration: '7h 45m',
      departTime: '22:30',
      arriveTime: '06:15',
      details: 'Overnight • Sleeper cabin available',
      badge: 'Save on accommodation'
    },
    {
      id: 'pv-private',
      type: 'Private transfer',
      provider: 'Premium car service',
      logo: '🚗',
      price: 280,
      duration: '3h 15m',
      departTime: 'On demand',
      arriveTime: '',
      details: 'Door-to-door • Luxury vehicle',
      badge: 'Most comfortable'
    }
  ];

  const viennaMunichOptions = [
    {
      id: 'vm-train',
      type: 'High-speed train',
      provider: 'Deutsche Bahn (DB)',
      logo: '🚄',
      price: 95,
      duration: '4h 10m',
      departTime: '09:15',
      arriveTime: '13:25',
      details: 'Direct • Scenic Alpine route',
      recommended: true,
      badge: 'Scenic Alpine route',
      fullDetails: {
        trainNumber: 'ICE 93',
        from: 'Wien Hauptbahnhof',
        to: 'München Hauptbahnhof',
        distance: '355km',
        speed: '85km/h',
        amenities: ['Reserved seat with Alpine views', 'Free WiFi throughout journey', 'Power outlets at every seat', 'Dining car with German cuisine', 'Panoramic windows for scenic route'],
        seatOptions: [
          { type: 'Standard (included)', price: 0 },
          { type: 'Premium with table', price: 18 },
          { type: 'First Class', price: 35 }
        ],
        mealOptions: [
          { type: 'Purchase onboard', price: 0 },
          { type: 'Pre-order meal', price: 14 },
          { type: 'Snack box', price: 8 }
        ],
        cancellationOptions: [
          { type: 'Standard (non-refundable)', price: 0 },
          { type: 'Flexible ticket', price: 10 }
        ],
        stationInfo: {
          departure: 'Direct metro access to city center',
          arrival: '5min walk to Marienplatz'
        }
      }
    },
    {
      id: 'vm-bus',
      type: 'Express bus',
      provider: 'FlixBus',
      logo: '🚌',
      price: 28,
      duration: '6h 15m',
      departTime: '08:00',
      arriveTime: '14:15',
      details: 'Direct • Budget option',
      badge: 'Budget friendly',
      fullDetails: {
        trainNumber: 'FB 1845',
        from: 'Vienna Central Bus Station',
        to: 'Munich ZOB',
        distance: '355km',
        speed: '57km/h',
        amenities: ['Comfortable reclining seats', 'Free WiFi onboard', 'USB charging ports', 'Toilets available', 'Large luggage capacity'],
        seatOptions: [
          { type: 'Standard (included)', price: 0 },
          { type: 'Extra legroom', price: 5 }
        ],
        mealOptions: [
          { type: 'Bring your own', price: 0 },
          { type: 'Snack package', price: 6 }
        ],
        cancellationOptions: [
          { type: 'Standard (non-refundable)', price: 0 },
          { type: 'Flexible ticket', price: 3 }
        ],
        stationInfo: {
          departure: 'Central Vienna location',
          arrival: 'Central Munich bus terminal'
        }
      }
    },
    {
      id: 'vm-car',
      type: 'Rental car',
      provider: 'One-way drop-off',
      logo: '🚗',
      price: 65,
      duration: '4h 30m',
      departTime: 'Flexible',
      arriveTime: '',
      details: 'Self-drive • Scenic route',
      badge: 'Most flexible',
      extraInfo: '+ fuel costs',
      fullDetails: {
        trainNumber: 'Rental Agreement',
        from: 'Vienna city pickup',
        to: 'Munich airport drop-off',
        distance: '355km',
        speed: 'Your pace',
        amenities: ['GPS navigation included', 'Unlimited mileage', 'Comprehensive insurance', 'Fuel tank ready', 'Stop at scenic viewpoints'],
        seatOptions: [
          { type: 'Compact car (included)', price: 0 },
          { type: 'Mid-size sedan', price: 15 },
          { type: 'SUV', price: 30 }
        ],
        mealOptions: [
          { type: 'Not included', price: 0 }
        ],
        cancellationOptions: [
          { type: 'Standard (24h cancellation)', price: 0 },
          { type: 'Flexible (free cancellation)', price: 12 }
        ],
        stationInfo: {
          departure: 'Downtown Vienna pickup available',
          arrival: 'Munich airport or city drop-off'
        }
      }
    },
    {
      id: 'vm-regional',
      type: 'Regional train',
      provider: 'ÖBB Regional',
      logo: '🚂',
      price: 42,
      duration: '5h 45m',
      departTime: '10:20',
      arriveTime: '16:05',
      details: '2 transfers • Budget option',
      badge: 'Lowest price',
      fullDetails: {
        trainNumber: 'REX 2401 + REX 2408',
        from: 'Wien Hauptbahnhof',
        to: 'München Hauptbahnhof',
        distance: '355km',
        speed: '62km/h',
        amenities: ['Regional train comfort', 'WiFi on most segments', 'Scenic countryside views', 'Luggage storage available', 'Toilet facilities'],
        seatOptions: [
          { type: 'Standard (included)', price: 0 },
          { type: 'Reserved seat', price: 4 }
        ],
        mealOptions: [
          { type: 'Purchase at stations', price: 0 },
          { type: 'Meal voucher', price: 8 }
        ],
        cancellationOptions: [
          { type: 'Standard (non-refundable)', price: 0 },
          { type: 'Flexible ticket', price: 6 }
        ],
        stationInfo: {
          departure: 'Wien Hauptbahnhof',
          arrival: 'München Hauptbahnhof, transfers in Salzburg'
        }
      }
    },
    {
      id: 'vm-private',
      type: 'Private transfer',
      provider: 'Luxury car service',
      logo: '🚗',
      price: 320,
      duration: '4h 15m',
      departTime: 'On demand',
      arriveTime: '',
      details: 'Door-to-door • Premium vehicle',
      badge: 'Most comfortable',
      fullDetails: {
        trainNumber: 'Private Service',
        from: 'Your Vienna hotel',
        to: 'Your Munich hotel',
        distance: '355km',
        speed: '83km/h',
        amenities: ['Mercedes S-Class or similar', 'Professional driver', 'Bottled water & snacks', 'WiFi in vehicle', 'Door-to-door service'],
        seatOptions: [
          { type: 'Standard sedan (included)', price: 0 },
          { type: 'Premium SUV', price: 50 },
          { type: 'Van for group', price: 40 }
        ],
        mealOptions: [
          { type: 'Complimentary snacks', price: 0 },
          { type: 'Meal stop arranged', price: 0 }
        ],
        cancellationOptions: [
          { type: 'Standard (48h notice)', price: 0 },
          { type: 'Flexible (24h notice)', price: 25 }
        ],
        stationInfo: {
          departure: 'Pick up from any Vienna location',
          arrival: 'Drop off at any Munich location'
        }
      }
    }
  ];

  const transportQuickFilters = [
    { id: 'all', label: 'All Options' },
    { id: 'fastest', label: 'Fastest' },
    { id: 'cheapest', label: 'Cheapest' },
    { id: 'comfortable', label: 'Most Comfortable' },
    { id: 'direct', label: 'Direct Only' },
    { id: 'scenic', label: 'Scenic Route' },
    { id: 'night', label: 'Night Travel' },
    { id: 'day', label: 'Day Travel' }
  ];

  const resultsCount = flightOptions.length;
  const selectedFlight = flightOptions.find(f => f.id === selectedFlightId);
  const totalForGroup = selectedFlight ? selectedFlight.price * 3 : 0;

  const selectedPragueVienna = pragueViennaOptions.find(o => o.id === selectedPragueViennaId);
  const selectedViennaMunich = viennaMunichOptions.find(o => o.id === selectedViennaMunichId);
  const totalTransportCost = (selectedPragueVienna?.price || 0) + (selectedViennaMunich?.price || 0);
  const totalTransportTime = selectedPragueVienna && selectedViennaMunich 
    ? `${parseInt(selectedPragueVienna.duration) + parseInt(selectedViennaMunich.duration)}h ${((parseInt(selectedPragueVienna.duration.split('h')[1]) || 0) + (parseInt(selectedViennaMunich.duration.split('h')[1]) || 0)) % 60}m`
    : '8h 25m';

  const handleContinueToCityTransport = () => {
    setActiveTab('city-to-city');
  };

  const handleExpandTransport = (id: string) => {
    setExpandedTransportId(expandedTransportId === id ? null : id);
  };

  const handleSelectTransport = (segment: 'pv' | 'vm', id: string) => {
    if (segment === 'pv') {
      setSelectedPragueViennaId(id);
    } else {
      setSelectedViennaMunichId(id);
    }
    setExpandedTransportId(null);
  };

  const activeFilterCount = activeQuickFilters.filter(f => f !== 'all').length;

  const toggleQuickFilter = (filterId: QuickFilter) => {
    if (filterId === 'all') {
      setActiveQuickFilters(['all']);
    } else {
      const newFilters = activeQuickFilters.includes(filterId)
        ? activeQuickFilters.filter(f => f !== filterId)
        : [...activeQuickFilters.filter(f => f !== 'all'), filterId];
      setActiveQuickFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  const toggleAirline = (airlineId: string) => {
    if (selectedAirlines.includes(airlineId)) {
      setSelectedAirlines(selectedAirlines.filter(a => a !== airlineId));
    } else {
      setSelectedAirlines([...selectedAirlines, airlineId]);
    }
  };

  const selectAllAirlines = () => {
    setSelectedAirlines(airlines.map(a => a.id));
  };

  const clearAllAirlines = () => {
    setSelectedAirlines([]);
  };

  const resetAllFilters = () => {
    setActiveQuickFilters(['all']);
    setPriceRange([300, 800]);
    setDepartureTime('morning');
    setDirectOnly(false);
    setMaxOneStop(false);
    setAnyStops(true);
    setFreeBag(false);
    setFreeSeat(false);
    setFreeCancellation(false);
    setSelectedAirlines([]);
    setTravelDuration([6, 15]);
  };

  const removeQuickFilter = (filterId: QuickFilter) => {
    const newFilters = activeQuickFilters.filter(f => f !== filterId);
    setActiveQuickFilters(newFilters.length === 0 ? ['all'] : newFilters);
  };

  const handleLoadMore = () => {
    if (visibleFlights === 3) {
      setVisibleFlights(6);
    } else if (visibleFlights === 6) {
      setVisibleFlights(flightOptions.length);
    }
  };

  const toggleFlightExpansion = (flightId: string) => {
    if (expandedFlightId === flightId) {
      setExpandedFlightId(null);
    } else {
      setExpandedFlightId(flightId);
    }
  };

  const handleSelectFlight = (flightId: string) => {
    setSelectedFlightId(flightId);
    setExpandedFlightId(null);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] pb-24">
      {/* Smart Overlay */}
      {showSmartOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[320px] w-full shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#4AA3F2] rounded-full flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-[#1F2937] text-center mb-4">💡 Smart Travel Tips</h2>
            
            <div className="text-[#6B7280] space-y-3 mb-6">
              <p>We analyze thousands of combinations to find the best deals.</p>
              
              <div>
                <p className="text-[#1F2937] mb-1">✈️ FLIGHTS:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Multi-city often cheaper than round-trip</li>
                  <li>• Flexible dates can save €200+</li>
                  <li>• Morning flights = fewer delays</li>
                </ul>
              </div>
              
              <div>
                <p className="text-[#1F2937] mb-1">🚂 CITY TRANSPORT:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Book trains early for better prices</li>
                  <li>• Consider travel time vs cost</li>
                  <li>• Some routes have scenic value</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowSmartOverlay(false)}
              className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] mb-2"
            >
              Got it, show me options
            </Button>
            
            <button 
              onClick={() => setShowSmartOverlay(false)}
              className="w-full text-[#6B7280] hover:text-[#1F2937] text-center py-2"
            >
              Skip tips
            </button>
          </div>
        </div>
      )}

      <StepHeader
        title="Transportation"
        currentStep={6}
        totalSteps={9}
        onBack={onBack}
      />

      {/* Tabs */}
      <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-[#E5E7EB] z-30 max-w-md mx-auto">
        <div className="px-4 py-3">
          <div className="bg-[#F3F4F6] rounded-full p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('flights')}
              className={`flex-1 py-2 px-3 transition-all duration-200 text-sm rounded-full ${
                activeTab === 'flights'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-transparent text-[#6B7280]'
              }`}
            >
              ✈️ Flights
            </button>
            <button
              onClick={() => setActiveTab('city-to-city')}
              className={`flex-1 py-2 px-3 transition-all duration-200 text-sm rounded-full ${
                activeTab === 'city-to-city'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-transparent text-[#6B7280]'
              }`}
            >
              🚂 City-to-City
            </button>
          </div>
        </div>

        {/* Route Summary */}
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <p className="text-center text-[#1F2937] mb-1">
            Bangalore → Prague → Vienna → Munich
          </p>
          <p className="text-center text-[#6B7280]">
            Dec 15-22, 2025
          </p>
        </div>

        {/* Quick Filter Bar */}
        <div className="border-b border-[#E5E7EB] bg-white">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 px-4 py-3">
              {activeTab === 'flights' ? (
                <>
                  {quickFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => toggleQuickFilter(filter.id)}
                      className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                        activeQuickFilters.includes(filter.id)
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F3F4F6] text-[#1F2937]'
                      }`}
                      style={{ height: '32px' }}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937] flex items-center gap-1 relative"
                    style={{ height: '32px' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    More Filters
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B6B] text-white rounded-full text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#2563EB] text-white" style={{ height: '32px' }}>
                    All Options
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Fastest
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Cheapest
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Direct Only
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Scenic Route
                  </button>
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937] flex items-center gap-1"
                    style={{ height: '32px' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    More Filters
                  </button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Expandable Filter Panel - Flights */}
      {showFilterPanel && activeTab === 'flights' && (
        <div 
          className="fixed left-0 right-0 bg-white shadow-lg z-30 max-w-md mx-auto animate-in slide-in-from-top duration-300"
          style={{ 
            top: '280px',
            height: 'calc(100dvh - 280px - 80px)',
            overflowY: 'auto',
          }}
        >
          <div className="p-4 space-y-6">
            {/* Filter Presets */}
            <div>
              <p className="text-[#6B7280] mb-2">Quick Presets:</p>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2">
                  {filterPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className="px-3 py-2 rounded-lg border-2 border-[#E5E7EB] text-[#1F2937] hover:border-[#2563EB] transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1F2937]">Price Range</h3>
                <span className="text-[#6B7280]">
                  €{priceRange[0]} - €{priceRange[1]}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={300}
                max={800}
                step={10}
                className="mb-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Departure Times */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Departure Times</h3>
              <RadioGroup value={departureTime} onValueChange={setDepartureTime}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="early-morning" id="early-morning" />
                    <Label htmlFor="early-morning" className="text-[#1F2937] cursor-pointer">
                      Early Morning (6AM-10AM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="morning" id="morning" />
                    <Label htmlFor="morning" className="text-[#1F2937] cursor-pointer">
                      Morning (10AM-2PM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="afternoon" id="afternoon" />
                    <Label htmlFor="afternoon" className="text-[#1F2937] cursor-pointer">
                      Afternoon (2PM-6PM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="evening" id="evening" />
                    <Label htmlFor="evening" className="text-[#1F2937] cursor-pointer">
                      Evening (6PM+)
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Flight Preferences */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Flight Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="direct-only" 
                    checked={directOnly}
                    onCheckedChange={(checked) => setDirectOnly(checked as boolean)}
                  />
                  <Label htmlFor="direct-only" className="text-[#1F2937] cursor-pointer">
                    Direct flights only
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="max-one-stop" 
                    checked={maxOneStop}
                    onCheckedChange={(checked) => setMaxOneStop(checked as boolean)}
                  />
                  <Label htmlFor="max-one-stop" className="text-[#1F2937] cursor-pointer">
                    Maximum 1 stop
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="any-stops" 
                    checked={anyStops}
                    onCheckedChange={(checked) => setAnyStops(checked as boolean)}
                  />
                  <Label htmlFor="any-stops" className="text-[#1F2937] cursor-pointer">
                    Any number of stops
                  </Label>
                </div>
                <div className="border-t border-[#E5E7EB] pt-3 mt-3">
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <Checkbox 
                      id="free-bag" 
                      checked={freeBag}
                      onCheckedChange={(checked) => setFreeBag(checked as boolean)}
                    />
                    <Label htmlFor="free-bag" className="text-[#1F2937] cursor-pointer">
                      Free checked bag included
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <Checkbox 
                      id="free-seat" 
                      checked={freeSeat}
                      onCheckedChange={(checked) => setFreeSeat(checked as boolean)}
                    />
                    <Label htmlFor="free-seat" className="text-[#1F2937] cursor-pointer">
                      Free seat selection
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <Checkbox 
                      id="free-cancel" 
                      checked={freeCancellation}
                      onCheckedChange={(checked) => setFreeCancellation(checked as boolean)}
                    />
                    <Label htmlFor="free-cancel" className="text-[#1F2937] cursor-pointer">
                      Free cancellation
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Airlines */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Preferred Airlines</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {airlines.map((airline) => (
                  <button
                    key={airline.id}
                    onClick={() => toggleAirline(airline.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                      selectedAirlines.includes(airline.id)
                        ? 'border-[#2563EB] bg-[#EFF6FF]'
                        : 'border-[#E5E7EB]'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    {selectedAirlines.includes(airline.id) && (
                      <Check className="w-4 h-4 text-[#2563EB]" />
                    )}
                    <span className="text-lg">{airline.logo}</span>
                    <span className="text-[#1F2937]">{airline.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={selectAllAirlines}
                  variant="outline" 
                  className="flex-1"
                >
                  Select All
                </Button>
                <Button 
                  onClick={clearAllAirlines}
                  variant="outline" 
                  className="flex-1"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Travel Duration */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1F2937]">Total Travel Time</h3>
                <span className="text-[#6B7280]">
                  {travelDuration[0]}-{travelDuration[1] === 15 ? '15+' : travelDuration[1]} hours
                </span>
              </div>
              <Slider
                value={travelDuration}
                onValueChange={setTravelDuration}
                min={6}
                max={15}
                step={1}
              />
              <div className="flex justify-between mt-1 text-sm text-[#6B7280]">
                <span>6h</span>
                <span>10h</span>
                <span>15+ hours</span>
              </div>
            </div>

            {/* Filter Panel Bottom */}
            <div className="space-y-2 pt-4 border-t border-[#E5E7EB]">
              <Button 
                onClick={() => setShowFilterPanel(false)}
                className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              >
                Apply Filters ({resultsCount} results)
              </Button>
              <Button 
                onClick={resetAllFilters}
                variant="outline" 
                className="w-full"
              >
                Reset All Filters
              </Button>
              <p className="text-center text-sm text-[#6B7280]">
                Filters will be saved for your next search
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Filter Panel - City to City */}
      {showFilterPanel && activeTab === 'city-to-city' && (
        <div 
          className="fixed left-0 right-0 bg-white shadow-lg z-30 max-w-md mx-auto animate-in slide-in-from-top duration-300"
          style={{ 
            top: '280px',
            height: 'calc(100dvh - 280px - 80px)',
            overflowY: 'auto',
          }}
        >
          <div className="p-4 space-y-6">
            {/* Filter Presets */}
            <div>
              <p className="text-[#6B7280] mb-2">Quick Presets:</p>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2">
                  {filterPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className="px-3 py-2 rounded-lg border-2 border-[#E5E7EB] text-[#1F2937] hover:border-[#2563EB] transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Transport Type */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Transport Type</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="train-high-speed" 
                    checked={transportFilters.trainHighSpeed}
                    onCheckedChange={(checked) => setTransportFilters({...transportFilters, trainHighSpeed: checked as boolean})}
                  />
                  <Label htmlFor="train-high-speed" className="text-[#1F2937] cursor-pointer">
                    High-Speed Train (e.g., ÖBB Railjet)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="train-regional" 
                    checked={transportFilters.trainRegional}
                    onCheckedChange={(checked) => setTransportFilters({...transportFilters, trainRegional: checked as boolean})}
                  />
                  <Label htmlFor="train-regional" className="text-[#1F2937] cursor-pointer">
                    Regional Train
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="bus" 
                    checked={transportFilters.bus}
                    onCheckedChange={(checked) => setTransportFilters({...transportFilters, bus: checked as boolean})}
                  />
                  <Label htmlFor="bus" className="text-[#1F2937] cursor-pointer">
                    Bus (FlixBus, etc.)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="rental-car" 
                    checked={transportFilters.rentalCar}
                    onCheckedChange={(checked) => setTransportFilters({...transportFilters, rentalCar: checked as boolean})}
                  />
                  <Label htmlFor="rental-car" className="text-[#1F2937] cursor-pointer">
                    Rental Car
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="private-transfer" 
                    checked={transportFilters.privateTransfer}
                    onCheckedChange={(checked) => setTransportFilters({...transportFilters, privateTransfer: checked as boolean})}
                  />
                  <Label htmlFor="private-transfer" className="text-[#1F2937] cursor-pointer">
                    Private Transfer
                  </Label>
                </div>
              </div>
            </div>

            {/* Departure Time Preferences */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Departure Time</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="early-morning-transport" 
                    checked={departurePreferences.earlyMorning}
                    onCheckedChange={(checked) => setDeparturePreferences({...departurePreferences, earlyMorning: checked as boolean})}
                  />
                  <Label htmlFor="early-morning-transport" className="text-[#1F2937] cursor-pointer">
                    Early Morning (6AM-10AM)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="morning-transport" 
                    checked={departurePreferences.morning}
                    onCheckedChange={(checked) => setDeparturePreferences({...departurePreferences, morning: checked as boolean})}
                  />
                  <Label htmlFor="morning-transport" className="text-[#1F2937] cursor-pointer">
                    Morning (10AM-2PM)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="afternoon-transport" 
                    checked={departurePreferences.afternoon}
                    onCheckedChange={(checked) => setDeparturePreferences({...departurePreferences, afternoon: checked as boolean})}
                  />
                  <Label htmlFor="afternoon-transport" className="text-[#1F2937] cursor-pointer">
                    Afternoon (2PM-6PM)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="evening-transport" 
                    checked={departurePreferences.evening}
                    onCheckedChange={(checked) => setDeparturePreferences({...departurePreferences, evening: checked as boolean})}
                  />
                  <Label htmlFor="evening-transport" className="text-[#1F2937] cursor-pointer">
                    Evening (6PM+)
                  </Label>
                </div>
                <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                  <Checkbox 
                    id="overnight-transport" 
                    checked={departurePreferences.overnight}
                    onCheckedChange={(checked) => setDeparturePreferences({...departurePreferences, overnight: checked as boolean})}
                  />
                  <Label htmlFor="overnight-transport" className="text-[#1F2937] cursor-pointer">
                    Overnight
                  </Label>
                </div>
              </div>
            </div>

            {/* Comfort Level */}
            <div>
              <h3 className="text-[#1F2937] mb-3">Comfort Level</h3>
              <RadioGroup value={comfortLevel} onValueChange={setComfortLevel}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="economy" id="economy" />
                    <Label htmlFor="economy" className="text-[#1F2937] cursor-pointer">
                      Economy (2nd Class)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="text-[#1F2937] cursor-pointer">
                      Standard (2nd Class with reservation)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="comfort" id="comfort" />
                    <Label htmlFor="comfort" className="text-[#1F2937] cursor-pointer">
                      Comfort (1st Class)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2" style={{ minHeight: '44px' }}>
                    <RadioGroupItem value="premium" id="premium" />
                    <Label htmlFor="premium" className="text-[#1F2937] cursor-pointer">
                      Premium (1st Class with meals)
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1F2937]">Price Range (per segment)</h3>
                <span className="text-[#6B7280]">
                  €{priceRange[0]} - €{priceRange[1]}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={20}
                max={200}
                step={5}
                className="mb-2"
              />
              <div className="flex justify-between mt-1 text-sm text-[#6B7280]">
                <span>€20</span>
                <span>€110</span>
                <span>€200+</span>
              </div>
            </div>

            {/* Journey Duration */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1F2937]">Journey Duration</h3>
                <span className="text-[#6B7280]">
                  {travelDuration[0]}h - {travelDuration[1]}h
                </span>
              </div>
              <Slider
                value={travelDuration}
                onValueChange={setTravelDuration}
                min={2}
                max={12}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between mt-1 text-sm text-[#6B7280]">
                <span>2h</span>
                <span>7h</span>
                <span>12+ hours</span>
              </div>
            </div>

            {/* Filter Panel Bottom */}
            <div className="space-y-2 pt-4 border-t border-[#E5E7EB]">
              <Button 
                onClick={() => setShowFilterPanel(false)}
                className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              >
                Apply Filters
              </Button>
              <Button 
                onClick={resetAllFilters}
                variant="outline" 
                className="w-full"
              >
                Reset All Filters
              </Button>
              <p className="text-center text-sm text-[#6B7280]">
                Filters will be saved for your next search
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-[#E5E7EB] z-30 max-w-md mx-auto">
        <div className="px-4 py-3">
          <div className="bg-[#F3F4F6] rounded-full p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('flights')}
              className={`flex-1 py-2 px-3 transition-all duration-200 text-sm rounded-full ${
                activeTab === 'flights'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-transparent text-[#6B7280]'
              }`}
            >
              ✈️ Flights
            </button>
            <button
              onClick={() => setActiveTab('city-to-city')}
              className={`flex-1 py-2 px-3 transition-all duration-200 text-sm rounded-full ${
                activeTab === 'city-to-city'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-transparent text-[#6B7280]'
              }`}
            >
              🚂 City-to-City
            </button>
          </div>
        </div>

        {/* Route Summary */}
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <p className="text-center text-[#1F2937] mb-1">
            Bangalore → Prague → Vienna → Munich
          </p>
          <p className="text-center text-[#6B7280]">
            Dec 15-22, 2025
          </p>
        </div>

        {/* Quick Filter Bar */}
        <div className="border-b border-[#E5E7EB] bg-white">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 px-4 py-3">
              {activeTab === 'flights' ? (
                <>
                  {quickFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => toggleQuickFilter(filter.id)}
                      className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                        activeQuickFilters.includes(filter.id)
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F3F4F6] text-[#1F2937]'
                      }`}
                      style={{ height: '32px' }}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937] flex items-center gap-1 relative"
                    style={{ height: '32px' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    More Filters
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B6B] text-white rounded-full text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#2563EB] text-white" style={{ height: '32px' }}>
                    All Options
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Fastest
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Cheapest
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Direct Only
                  </button>
                  <button className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937]" style={{ height: '32px' }}>
                    Scenic Route
                  </button>
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="px-3 py-2 rounded-full text-sm whitespace-nowrap bg-[#F3F4F6] text-[#1F2937] flex items-center gap-1"
                    style={{ height: '32px' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    More Filters
                  </button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="max-w-md mx-auto pb-6"
        style={{ 
          paddingTop: '332px',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
      >
        {activeTab === 'flights' ? (
          <>
            {/* Route Optimization Card */}
            {showRouteOptimization && (
              <div className="bg-gradient-to-br from-[#4AA3F2] to-[#1A73E8] rounded-xl p-4 mb-2 text-white shadow-lg relative">
                <button 
                  onClick={() => setShowRouteOptimization(false)}
                  className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1">💡 We found a better route for you!</h3>
                    <p className="mb-2">
                      <strong>Flying into Prague</strong> saves €391 per person
                    </p>
                    <p className="text-white/90">Better flight connections from BLR</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button className="flex-1 bg-white text-[#4AA3F2] hover:bg-white/90">
                    See this option
                  </Button>
                  <Button 
                    onClick={() => setShowRouteOptimization(false)}
                    className="flex-1 bg-transparent border-2 border-white text-white hover:bg-white/10"
                  >
                    Keep original
                  </Button>
                </div>

                <button className="w-full text-white/80 hover:text-white text-center mt-3 flex items-center justify-center gap-1">
                  <span>Why is this better?</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Smart Filter Suggestions */}
            {showSmartSuggestions && (
              <div className="bg-[#EBF8FF] border border-[#4AA3F2] rounded-xl p-4 mb-6 relative">
                <button 
                  onClick={() => setShowSmartSuggestions(false)}
                  className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-[#1F2937]" />
                </button>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#4AA3F2] rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] mb-2">
                      💡 For Christmas market trips, travelers often prefer:
                    </p>
                    <ul className="text-[#6B7280] space-y-1 mb-3">
                      <li>• Morning departures</li>
                      <li>• Free checked bags</li>
                      <li>• Flexible cancellation</li>
                    </ul>
                    <Button 
                      size="sm"
                      className="bg-[#4AA3F2] text-white hover:bg-[#1A73E8]"
                    >
                      Apply These Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#1F2937]">
                  {resultsCount} flights found
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] hover:bg-[#F9FAFB]">
                      <span className="text-sm">
                        {sortBy === 'price-low' && 'Price (Low to High)'}
                        {sortBy === 'price-high' && 'Price (High to Low)'}
                        {sortBy === 'duration' && 'Duration (Shortest)'}
                        {sortBy === 'departure' && 'Departure Time'}
                        {sortBy === 'value' && 'Best Value'}
                        {sortBy === 'popular' && 'Most Popular'}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setSortBy('price-low')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'price-low' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'price-low' ? 'ml-6' : ''}>
                          Price (Low to High)
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('price-high')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'price-high' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'price-high' ? 'ml-6' : ''}>
                          Price (High to Low)
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('duration')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'duration' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'duration' ? 'ml-6' : ''}>
                          Duration (Shortest First)
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('departure')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'departure' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'departure' ? 'ml-6' : ''}>
                          Departure Time (Earliest)
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('value')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'value' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'value' ? 'ml-6' : ''}>
                          Best Value Score
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('popular')}>
                      <div className="flex items-center gap-2 w-full">
                        {sortBy === 'popular' && <Check className="w-4 h-4" />}
                        <span className={sortBy !== 'popular' ? 'ml-6' : ''}>
                          Most Popular
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Active Filter Chips */}
              {activeQuickFilters.filter(f => f !== 'all').length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {activeQuickFilters
                    .filter(f => f !== 'all')
                    .map((filterId) => {
                      const filter = quickFilters.find(qf => qf.id === filterId);
                      return filter ? (
                        <button
                          key={filterId}
                          onClick={() => removeQuickFilter(filterId)}
                          className="flex items-center gap-1 px-3 py-1 bg-[#2563EB] text-white rounded-full text-sm"
                        >
                          <span>{filter.label}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ) : null;
                    })}
                  <button
                    onClick={() => setActiveQuickFilters(['all'])}
                    className="text-sm text-[#4AA3F2] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* Flight Options Section */}
            <div className="mb-6">
              <div className="space-y-3">
                {flightOptions.slice(0, visibleFlights).map((flight) => {
                  const isExpanded = expandedFlightId === flight.id;
                  const isSelected = selectedFlightId === flight.id;
                  
                  return (
                    <div 
                      key={flight.id}
                      onClick={() => !isExpanded && handleSelectFlight(flight.id)}
                      className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'border-[#4AA3F2]'
                          : flight.recommended
                          ? 'border-l-4 border-l-[#10B981] border-t border-r border-b border-[#E5E7EB]'
                          : 'border-[#E5E7EB]'
                      }`}
                    >
                      {/* Collapsed State */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFlightExpansion(flight.id);
                        }}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Airline Logo */}
                            <div className="w-8 h-8 bg-[#F3F4F6] rounded flex items-center justify-center text-lg flex-shrink-0">
                              {flight.airlineLogo}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-[#1F2937]">{flight.type}</h3>
                              </div>
                              <p className="text-[#6B7280]">{flight.details}</p>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-col items-end gap-1 ml-2">
                            {flight.recommended && (
                              <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                                Recommended
                              </Badge>
                            )}
                            {flight.lowestPrice && !flight.recommended && (
                              <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20">
                                Lowest price
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[#1F2937] text-2xl">€{flight.price}</p>
                            <p className="text-[#6B7280]">per person</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-sm ${
                              flight.recommended || flight.lowestPrice
                                ? 'bg-[#10B981]/10 text-[#10B981]'
                                : 'bg-[#F3F4F6] text-[#6B7280]'
                            }`}>
                              {flight.impact}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded State */}
                      {isExpanded && flight.flightDetails && (
                        <div className="border-t border-[#E5E7EB] p-4 space-y-4 animate-in slide-in-from-top duration-300">
                          {/* Outbound Flight */}
                          <div>
                            <h4 className="text-[#1F2937] mb-2">OUTBOUND FLIGHT</h4>
                            <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-1">
                              <p className="text-[#1F2937]">
                                {flight.flightDetails.outbound.date}: {flight.flightDetails.outbound.from} ({flight.flightDetails.outbound.fromCode}) → {flight.flightDetails.outbound.to} ({flight.flightDetails.outbound.toCode})
                              </p>
                              <p className="text-[#6B7280]">
                                {flight.airline} {flight.flightDetails.outbound.flightNumber} • {flight.flightDetails.outbound.departure} → {flight.flightDetails.outbound.arrival}
                              </p>
                              <p className="text-[#6B7280]">
                                {flight.flightDetails.outbound.aircraft} • {flight.flightDetails.outbound.stops}
                              </p>
                              <button className="text-[#4AA3F2] hover:underline text-sm mt-1">
                                View seat map
                              </button>
                            </div>
                          </div>

                          {/* Return Flight */}
                          <div>
                            <h4 className="text-[#1F2937] mb-2">RETURN FLIGHT</h4>
                            <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-1">
                              <p className="text-[#1F2937]">
                                {flight.flightDetails.return.date}: {flight.flightDetails.return.from} ({flight.flightDetails.return.fromCode}) → {flight.flightDetails.return.to} ({flight.flightDetails.return.toCode})
                              </p>
                              <p className="text-[#6B7280]">
                                {flight.airline} {flight.flightDetails.return.flightNumber} • {flight.flightDetails.return.departure} → {flight.flightDetails.return.arrival}
                              </p>
                              <p className="text-[#6B7280]">
                                {flight.flightDetails.return.aircraft} • {flight.flightDetails.return.stops}
                              </p>
                              <button className="text-[#4AA3F2] hover:underline text-sm mt-1">
                                View seat map
                              </button>
                            </div>
                          </div>

                          {/* Flight Extras */}
                          <div>
                            <h4 className="text-[#1F2937] mb-3">FLIGHT EXTRAS</h4>
                            
                            {/* Baggage Options */}
                            <div className="mb-4">
                              <p className="text-[#6B7280] mb-2">Baggage</p>
                              <RadioGroup value={selectedBaggage} onValueChange={setSelectedBaggage}>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="carry-on" id="carry-on" />
                                    <Label htmlFor="carry-on" className="text-[#1F2937]">
                                      ✓ Carry-on included
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="1-checked" id="1-checked" />
                                    <Label htmlFor="1-checked" className="text-[#1F2937]">
                                      1 Checked bag (+€35)
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="2-checked" id="2-checked" />
                                    <Label htmlFor="2-checked" className="text-[#1F2937]">
                                      2 Checked bags (+€65)
                                    </Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </div>

                            {/* Seat Selection */}
                            <div className="mb-4">
                              <p className="text-[#6B7280] mb-2">Seat selection</p>
                              <RadioGroup value={selectedSeat} onValueChange={setSelectedSeat}>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="random" id="random" />
                                    <Label htmlFor="random" className="text-[#1F2937]">
                                      Random assignment (free)
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="standard" id="standard" />
                                    <Label htmlFor="standard" className="text-[#1F2937]">
                                      Standard seat (+€12)
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="legroom" id="legroom" />
                                    <Label htmlFor="legroom" className="text-[#1F2937]">
                                      Extra legroom (+€25)
                                    </Label>
                                  </div>
                                </div>
                              </RadioGroup>
                              <button className="text-[#4AA3F2] hover:underline mt-2">
                                View seat map
                              </button>
                            </div>

                            {/* Meal Preferences */}
                            <div className="mb-4">
                              <p className="text-[#6B7280] mb-2">Meal preferences</p>
                              <select className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937]">
                                <option>Standard meal</option>
                                <option>Vegetarian</option>
                                <option>Vegan</option>
                                <option>Gluten-free</option>
                                <option>Kosher</option>
                                <option>Halal</option>
                              </select>
                            </div>
                          </div>

                          {/* Booking Details */}
                          <div className="bg-[#F9FAFB] rounded-lg p-3">
                            <h4 className="text-[#1F2937] mb-2">BOOKING DETAILS</h4>
                            <p className="text-[#6B7280] text-sm">Cancellation: Free up to 24h</p>
                            <p className="text-[#6B7280] text-sm">Changes: €150 fee + fare difference</p>
                          </div>

                          {/* Select Button */}
                          <div className="space-y-2">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFlight(flight.id);
                              }}
                              className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8]"
                            >
                              Select This Flight
                            </Button>
                            <Button 
                              variant="outline"
                              className="w-full"
                            >
                              Compare with others
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* See More Options */}
              {visibleFlights < flightOptions.length && (
                <button
                  onClick={handleLoadMore}
                  className="w-full mt-4 py-3 border-2 border-dashed border-[#E5E7EB] rounded-xl text-[#4AA3F2] hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-2"
                >
                  <span>
                    {visibleFlights === 3 
                      ? `See More Options (${flightOptions.length - 3} more)` 
                      : `Show All Options (${flightOptions.length - visibleFlights} more)`}
                  </span>
                  <ChevronDown className="w-5 h-5" />
                </button>
              )}

              {visibleFlights >= flightOptions.length && flightOptions.length > 3 && (
                <button
                  className="w-full mt-4 py-2 text-[#4AA3F2] hover:underline transition-colors"
                >
                  View alternative search options
                </button>
              )}
            </div>

            {/* Selected Flight Summary */}
            {selectedFlight && (
              <div className="bg-[#EFF6FF] rounded-xl p-4 border border-[#4AA3F2]/30 mb-6">
                <h3 className="text-[#1F2937] mb-2">Selected Flight</h3>
                <p className="text-[#1F2937] mb-1">
                  {selectedFlight.type} • {selectedFlight.airline} • €{selectedFlight.price} per person
                </p>
                <p className="text-[#6B7280] mb-2">
                  Includes: {selectedBaggage === 'carry-on' ? 'Carry-on' : selectedBaggage === '1-checked' ? '1 checked bag' : '2 checked bags'}, {selectedSeat === 'random' ? 'random seat' : selectedSeat === 'standard' ? 'standard seat' : 'extra legroom'}
                </p>
                <p className="text-[#1F2937]">
                  Total for 3 adults: €{totalForGroup.toLocaleString()}
                </p>
              </div>
            )}

            {/* Bottom CTAs */}
            <div className="space-y-3">
              <Button 
                onClick={handleContinueToCityTransport}
                className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] py-6 rounded-xl shadow-lg"
              >
                Continue to City Transport
              </Button>
              <Button 
                variant="outline"
                className="w-full border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-6 rounded-xl"
              >
                Save and continue later
              </Button>
            </div>
          </>
        ) : (
          <CityToCityContent
            showCityTransportTips={showCityTransportTips}
            setShowCityTransportTips={setShowCityTransportTips}
            pragueViennaOptions={pragueViennaOptions}
            viennaMunichOptions={viennaMunichOptions}
            expandedTransportId={expandedTransportId}
            selectedPragueViennaId={selectedPragueViennaId}
            selectedViennaMunichId={selectedViennaMunichId}
            handleExpandTransport={handleExpandTransport}
            handleSelectTransport={handleSelectTransport}
            totalTransportCost={totalTransportCost}
            totalTransportTime={totalTransportTime}
            showLuggageSection={showLuggageSection}
            setShowLuggageSection={setShowLuggageSection}
            onLockChoices={onLockChoices}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="trips" />
    </div>
  );
}
