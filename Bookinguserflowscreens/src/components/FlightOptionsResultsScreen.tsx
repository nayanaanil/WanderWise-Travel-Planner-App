import { useState } from 'react';
import { Plane, Target, Map, List, ChevronDown, Star, DollarSign, RefreshCw, AlertCircle, Check, X, ExternalLink, Info } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface FlightOption {
  id: string;
  type: string;
  title: string;
  outbound: {
    airline: string;
    flightNumber: string;
    aircraft: string;
    route: string;
    departure: string;
    arrival: string;
    duration: string;
    stops: string;
    terminal: string;
  };
  return: {
    airline: string;
    flightNumber: string;
    aircraft: string;
    route: string;
    departure: string;
    arrival: string;
    duration: string;
    stops: string;
    layover?: string;
    terminal: string;
  };
  basePrice: number;
  baggageFee: number;
  seatFee: number;
  taxesFees: number;
  totalPerPerson: number;
  savings?: number;
  isRecommended?: boolean;
  isCurrent?: boolean;
  features?: string[];
}

interface FlightOptionsResultsScreenProps {
  onBack: () => void;
  onSelectFlight: () => void;
  onBackToPreferences: () => void;
}

export function FlightOptionsResultsScreen({
  onBack,
  onSelectFlight,
  onBackToPreferences
}: FlightOptionsResultsScreenProps) {
  const [selectedFlightDetails, setSelectedFlightDetails] = useState<FlightOption | null>(null);
  const [activeTab, setActiveTab] = useState('flight-info');
  const [selectedFlightId, setSelectedFlightId] = useState<string>('current');
  const [expandedPlatformCards, setExpandedPlatformCards] = useState<Record<string, boolean>>({});

  const currentSelection: FlightOption = {
    id: 'current',
    type: 'Round-trip',
    title: 'Round-trip Munich Flights',
    outbound: {
      airline: 'Lufthansa',
      flightNumber: 'LH 2315',
      aircraft: 'Airbus A321',
      route: 'MUC → VIE',
      departure: '09:15',
      arrival: '18:00',
      duration: '8h 45m',
      stops: '2 stops',
      terminal: 'Terminal 2 → Terminal 3'
    },
    return: {
      airline: 'Lufthansa',
      flightNumber: 'LH 2316',
      aircraft: 'Airbus A321',
      route: 'VIE → MUC',
      departure: '10:30',
      arrival: '18:00',
      duration: '7h 30m',
      stops: '2 stops',
      terminal: 'Terminal 3 → Terminal 2'
    },
    basePrice: 1847,
    baggageFee: 150,
    seatFee: 75,
    taxesFees: 89,
    totalPerPerson: 2072,
    isCurrent: true
  };

  const recommendedOption: FlightOption = {
    id: 'recommended',
    type: 'One-way',
    title: 'One-way Flights (Munich → Vienna)',
    outbound: {
      airline: 'Austrian Airlines',
      flightNumber: 'OS 117',
      aircraft: 'Airbus A320',
      route: 'MUC → VIE',
      departure: '14:30',
      arrival: '15:50',
      duration: '1h 20m',
      stops: 'Direct',
      terminal: 'Terminal 2 → Terminal 3'
    },
    return: {
      airline: 'Ryanair',
      flightNumber: 'FR 1234',
      aircraft: 'Boeing 737',
      route: 'VIE → MUC',
      departure: '16:15',
      arrival: '19:00',
      duration: '3h 45m',
      stops: '1 stop',
      layover: '45m in Frankfurt',
      terminal: 'Terminal 1 → Terminal 2'
    },
    basePrice: 1327,
    baggageFee: 100,
    seatFee: 50,
    taxesFees: 89,
    totalPerPerson: 1477,
    savings: 595,
    isRecommended: true
  };

  const alternativeOptions: FlightOption[] = [
    {
      id: 'alt1',
      type: 'Premium Economy',
      title: 'Premium Comfort Package',
      outbound: {
        airline: 'Lufthansa',
        flightNumber: 'LH 1845',
        aircraft: 'Airbus A350',
        route: 'MUC → VIE',
        departure: '11:00',
        arrival: '12:25',
        duration: '1h 25m',
        stops: 'Direct',
        terminal: 'Terminal 2 → Terminal 3'
      },
      return: {
        airline: 'Lufthansa',
        flightNumber: 'LH 1846',
        aircraft: 'Airbus A350',
        route: 'VIE → MUC',
        departure: '18:30',
        arrival: '19:55',
        duration: '1h 25m',
        stops: 'Direct',
        terminal: 'Terminal 3 → Terminal 2'
      },
      basePrice: 1689,
      baggageFee: 0,
      seatFee: 0,
      taxesFees: 89,
      totalPerPerson: 1778,
      savings: 294,
      features: ['Extra legroom', 'Premium meals', 'Priority boarding']
    },
    {
      id: 'alt2',
      type: 'Ultra Budget',
      title: 'Maximum Savings Option',
      outbound: {
        airline: 'Wizz Air',
        flightNumber: 'W6 2345',
        aircraft: 'Airbus A320',
        route: 'MUC → VIE',
        departure: '06:30',
        arrival: '10:45',
        duration: '4h 15m',
        stops: '1 stop',
        terminal: 'Terminal 1 → Terminal 3'
      },
      return: {
        airline: 'Wizz Air',
        flightNumber: 'W6 2346',
        aircraft: 'Airbus A320',
        route: 'VIE → MUC',
        departure: '21:00',
        arrival: '00:30',
        duration: '3h 30m',
        stops: '1 stop',
        terminal: 'Terminal 3 → Terminal 1'
      },
      basePrice: 987,
      baggageFee: 120,
      seatFee: 60,
      taxesFees: 89,
      totalPerPerson: 1256,
      savings: 816,
      features: ['Early departure', 'Late arrival', 'Budget friendly']
    },
    {
      id: 'alt3',
      type: 'Time Optimized',
      title: 'Fastest Travel Time',
      outbound: {
        airline: 'Austrian Airlines',
        flightNumber: 'OS 113',
        aircraft: 'Airbus A320',
        route: 'MUC → VIE',
        departure: '07:00',
        arrival: '08:20',
        duration: '1h 20m',
        stops: 'Direct',
        terminal: 'Terminal 2 → Terminal 3'
      },
      return: {
        airline: 'Austrian Airlines',
        flightNumber: 'OS 118',
        aircraft: 'Airbus A320',
        route: 'VIE → MUC',
        departure: '20:15',
        arrival: '21:35',
        duration: '1h 20m',
        stops: 'Direct',
        terminal: 'Terminal 3 → Terminal 2'
      },
      basePrice: 1545,
      baggageFee: 100,
      seatFee: 50,
      taxesFees: 89,
      totalPerPerson: 1694,
      savings: 378,
      features: ['Direct flights', 'Convenient times', 'Same airline']
    }
  ];

  const openFlightDetails = (flight: FlightOption) => {
    setSelectedFlightDetails(flight);
    setActiveTab('flight-info');
  };

  const closeFlightDetails = () => {
    setSelectedFlightDetails(null);
  };

  const allFlights = [currentSelection, recommendedOption, ...alternativeOptions];
  const selectedFlight = allFlights.find(f => f.id === selectedFlightId) || currentSelection;

  const getPlatformPrices = (basePrice: number, flightId: string, showExtended: boolean = false) => {
    const basePlatforms = [
      { name: 'Skyscanner', price: basePrice, isBest: true, rating: 4.2 },
      { name: 'Booking.com', price: basePrice + 8, isBest: false, rating: 4.5 },
      { name: 'MakeMyTrip', price: basePrice + 15, isBest: false, rating: 4.1 }
    ];
    
    const extendedPlatforms = [
      { name: 'Expedia', price: basePrice + 12, isBest: false, rating: 4.3 },
      { name: 'Kayak', price: basePrice + 20, isBest: false, rating: 4.0 },
      { name: 'Priceline', price: basePrice + 18, isBest: false, rating: 4.2 }
    ];

    return showExtended ? [...basePlatforms, ...extendedPlatforms] : basePlatforms;
  };

  const togglePlatformExpansion = (flightId: string) => {
    setExpandedPlatformCards(prev => ({
      ...prev,
      [flightId]: !prev[flightId]
    }));
  };

  const getImpactInfo = (flightId: string) => {
    switch(flightId) {
      case 'current':
        return {
          hotels: { status: 'success', text: 'Hotels: No changes needed' },
          transport: { status: 'success', text: 'Transport: All pickups compatible' },
          activities: { status: 'success', text: 'Activities: All bookings compatible' }
        };
      case 'recommended':
        return {
          hotels: { status: 'success', text: 'Hotels: No changes needed' },
          transport: { status: 'warning', text: 'Transport: Adjust Vienna pickup time' },
          activities: { status: 'success', text: 'Activities: All bookings compatible' }
        };
      case 'alt1':
        return {
          hotels: { status: 'success', text: 'Hotels: No changes needed' },
          transport: { status: 'success', text: 'Transport: All pickups compatible' },
          activities: { status: 'warning', text: 'Activities: Evening arrival may affect first day' }
        };
      case 'alt2':
        return {
          hotels: { status: 'warning', text: 'Hotels: Early check-in required in Munich' },
          transport: { status: 'warning', text: 'Transport: Late night pickup from airport' },
          activities: { status: 'warning', text: 'Activities: First day activities need rescheduling' }
        };
      case 'alt3':
        return {
          hotels: { status: 'warning', text: 'Hotels: Late check-in needed in Munich' },
          transport: { status: 'success', text: 'Transport: All pickups compatible' },
          activities: { status: 'success', text: 'Activities: All bookings compatible' }
        };
      default:
        return {
          hotels: { status: 'success', text: 'Hotels: No changes needed' },
          transport: { status: 'success', text: 'Transport: All pickups compatible' },
          activities: { status: 'success', text: 'Activities: All bookings compatible' }
        };
    }
  };

  const impactInfo = getImpactInfo(selectedFlightId);

  const ImpactCard = () => (
    <div className="bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] rounded-2xl p-5 mb-6 border border-[#C084FC] animate-in slide-in-from-top duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-[#9333EA]" />
        </div>
        <div className="flex-1">
          <h3 className="text-[#1F2937] uppercase mb-3">Impact on Other Bookings</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {impactInfo.hotels.status === 'success' ? (
                <Check className="w-5 h-5 text-[#10B981]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF8C00]" />
              )}
              <span className="text-[#1F2937]">{impactInfo.hotels.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {impactInfo.transport.status === 'success' ? (
                <Check className="w-5 h-5 text-[#10B981]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF8C00]" />
              )}
              <span className="text-[#1F2937]">{impactInfo.transport.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {impactInfo.activities.status === 'success' ? (
                <Check className="w-5 h-5 text-[#10B981]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF8C00]" />
              )}
              <span className="text-[#1F2937]">{impactInfo.activities.text}</span>
            </div>
          </div>
          <a href="#" className="text-[#4AA3F2] mt-3 inline-block hover:underline">
            See Full Impact Analysis
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      <Header onBack={onBack} />
      
      <div className="pt-16 px-6 max-w-md mx-auto">
        {/* Header Section */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#4AA3F2] rounded-xl flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] text-2xl">Flight Options</h1>
            </div>
          </div>
          <p className="text-[#6B7280] mb-2">Christmas Markets Tour • 3 Adults</p>
          <p className="text-[#6B7280]">Munich → Innsbruck → Salzburg → Vienna</p>
          <p className="text-[#6B7280] mt-1">Dec 15-22, 2024</p>
        </div>

        {/* Results Summary Bar */}
        <div className="bg-gradient-to-r from-[#E3F2FD] to-[#BBDEFB] rounded-2xl p-4 mb-6 border border-[#90CAF9]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 flex-1">
              <Target className="w-5 h-5 text-[#1A73E8] mt-1 flex-shrink-0" />
              <div>
                <p className="text-[#1F2937]">Found 12 optimized options • Potential savings: $520-$890 per person</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-[#1F2937] border border-[#E5E7EB] hover:border-[#4AA3F2]">
              <span>Filter & Sort</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-[#1F2937] border border-[#E5E7EB] hover:border-[#4AA3F2]">
              <Map className="w-4 h-4" />
              <span>Map View</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#4AA3F2] rounded-lg text-white">
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* Current Selection Card */}
        <div 
          onClick={() => setSelectedFlightId('current')}
          className={`bg-[#F3F4F6] rounded-2xl p-5 mb-6 border-l-4 cursor-pointer transition-all ${
            selectedFlightId === 'current' 
              ? 'border-[#4AA3F2] ring-2 ring-[#4AA3F2] ring-opacity-50' 
              : 'border-[#FF8C00]'
          }`}
        >
          <div className="inline-block bg-[#E5E7EB] px-3 py-1 rounded-lg mb-4">
            <span className="text-[#6B7280] uppercase">📋 Current Selection</span>
          </div>
          
          <h3 className="text-[#1F2937] mb-2">{currentSelection.title}</h3>
          <p className="text-[#6B7280] mb-3">{currentSelection.outbound.airline} • {currentSelection.outbound.stops} each way</p>
          
          <div className="space-y-1 mb-4">
            <p className="text-[#6B7280]">Dec 15: {currentSelection.outbound.route} ({currentSelection.outbound.duration})</p>
            <p className="text-[#6B7280]">Dec 22: {currentSelection.return.route} ({currentSelection.return.duration})</p>
          </div>

          <div className="border-t border-[#D1D5DB] pt-4 mb-4">
            <p className="text-[#1F2937] text-xl mb-2">${currentSelection.basePrice.toLocaleString()} per person</p>
            <p className="text-[#6B7280]">+ Baggage: ${currentSelection.baggageFee}</p>
            <p className="text-[#6B7280]">+ Seats: ${currentSelection.seatFee}</p>
            <p className="text-[#1F2937] mt-2">Total: ${currentSelection.totalPerPerson.toLocaleString()} per person</p>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-[#D1D5DB] text-[#6B7280]"
            onClick={(e) => {
              e.stopPropagation();
              openFlightDetails(currentSelection);
            }}
          >
            View Details
          </Button>
        </div>

        {/* Recommended Option Card */}
        <div 
          onClick={() => setSelectedFlightId('recommended')}
          className={`bg-white rounded-2xl p-5 mb-6 border-l-4 shadow-sm cursor-pointer transition-all ${
            selectedFlightId === 'recommended' 
              ? 'border-[#4AA3F2] ring-2 ring-[#4AA3F2] ring-opacity-50' 
              : 'border-[#10B981]'
          }`}
        >
          <div className="inline-block bg-[#10B981] px-3 py-1 rounded-lg mb-4">
            <span className="text-white uppercase">⭐ Recommended</span>
          </div>
          
          <h3 className="text-[#1F2937] mb-2">{recommendedOption.title}</h3>
          <div className="space-y-2 mb-4">
            <div>
              <p className="text-[#6B7280]">Outbound: {recommendedOption.outbound.airline} • {recommendedOption.outbound.stops}</p>
              <p className="text-[#6B7280]">Dec 15: {recommendedOption.outbound.route} ({recommendedOption.outbound.duration})</p>
            </div>
            <div>
              <p className="text-[#6B7280]">Return: {recommendedOption.return.airline} • {recommendedOption.return.stops}</p>
              <p className="text-[#6B7280]">Dec 22: {recommendedOption.return.route} ({recommendedOption.return.duration})</p>
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4 mb-4">
            <p className="text-[#1F2937] text-xl mb-2">${recommendedOption.basePrice.toLocaleString()} per person</p>
            <p className="text-[#6B7280]">+ Baggage: ${recommendedOption.baggageFee}</p>
            <p className="text-[#6B7280]">+ Seats: ${recommendedOption.seatFee}</p>
            <p className="text-[#1F2937] mt-2">Total: ${recommendedOption.totalPerPerson.toLocaleString()} per person</p>
          </div>

          <div className="bg-[#10B981] rounded-full px-4 py-2 mb-4 inline-block">
            <span className="text-white">💰 Save ${recommendedOption.savings} per person</span>
          </div>

          {/* Platform Comparison Section */}
          <div className="bg-[#F9FAFB] rounded-xl p-4 mb-4 border border-[#E5E7EB]">
            <p className="text-[#6B7280] mb-3">Available on:</p>
            {getPlatformPrices(recommendedOption.totalPerPerson, 'recommended', expandedPlatformCards['recommended']).map((platform, idx) => (
              <div key={idx} className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={platform.isBest ? "text-[#1F2937]" : "text-[#6B7280]"}>{platform.name}</span>
                  {platform.isBest && <span className="text-[#10B981]">✅</span>}
                </div>
                <span className={platform.isBest ? "text-[#1F2937]" : "text-[#6B7280]"}>${platform.price.toLocaleString()}</span>
              </div>
            ))}
            <p className="text-[#9CA3AF] italic mt-2">Prices may vary on platform</p>
          </div>

          <div className="space-y-2 mb-3">
            <Button 
              className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Book on Skyscanner <ExternalLink className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-[#E5E7EB] text-[#6B7280]"
              onClick={(e) => {
                e.stopPropagation();
                togglePlatformExpansion('recommended');
              }}
            >
              {expandedPlatformCards['recommended'] ? 'Show Less Platforms ↑' : 'Compare Platforms ↓'}
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-[#4AA3F2] text-[#4AA3F2]"
            onClick={(e) => {
              e.stopPropagation();
              openFlightDetails(recommendedOption);
            }}
          >
            View Full Details →
          </Button>
        </div>

        {/* Impact Card - appears under recommended option if selected */}
        {selectedFlightId === 'recommended' && <ImpactCard />}

        {/* Alternative Options */}
        <h2 className="text-[#1F2937] text-xl mb-4">Alternative Options</h2>
        <div className="space-y-4 mb-6">
          {alternativeOptions.map((option) => (
            <div key={option.id}>
              <div 
                onClick={() => setSelectedFlightId(option.id)}
                className={`bg-white rounded-2xl p-5 border shadow-sm cursor-pointer transition-all ${
                  selectedFlightId === option.id 
                    ? 'border-[#4AA3F2] ring-2 ring-[#4AA3F2] ring-opacity-50 mb-6' 
                    : 'border-[#E5E7EB] mb-0'
                }`}
              >
                <h3 className="text-[#1F2937] mb-2">{option.title}</h3>
                <p className="text-[#6B7280] mb-3">{option.outbound.airline} / {option.return.airline} • {option.type}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[#1F2937] text-xl">${option.totalPerPerson.toLocaleString()} per person</p>
                  </div>
                  {option.savings && (
                    <div className="bg-[#10B981] rounded-full px-3 py-1">
                      <span className="text-white">Save ${option.savings}</span>
                    </div>
                  )}
                </div>

                {option.features && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {option.features.map((feature, idx) => (
                      <span key={idx} className="bg-[#F3F4F6] text-[#6B7280] px-3 py-1 rounded-lg">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}

                {/* Show platform comparison when this card is selected */}
                {selectedFlightId === option.id && (
                  <>
                    {/* Platform Comparison Section */}
                    <div className="bg-[#F9FAFB] rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                      <p className="text-[#6B7280] mb-3">Available on:</p>
                      {getPlatformPrices(option.totalPerPerson, option.id, expandedPlatformCards[option.id]).map((platform, idx) => (
                        <div key={idx} className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={platform.isBest ? "text-[#1F2937]" : "text-[#6B7280]"}>{platform.name}</span>
                            {platform.isBest && <span className="text-[#10B981]">✅</span>}
                          </div>
                          <span className={platform.isBest ? "text-[#1F2937]" : "text-[#6B7280]"}>${platform.price.toLocaleString()}</span>
                        </div>
                      ))}
                      <p className="text-[#9CA3AF] italic mt-2">Prices may vary on platform</p>
                    </div>

                    <div className="space-y-2 mb-3">
                      <Button 
                        className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        Book on Skyscanner <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#E5E7EB] text-[#6B7280]"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlatformExpansion(option.id);
                        }}
                      >
                        {expandedPlatformCards[option.id] ? 'Show Less Platforms ↑' : 'Compare Platforms ↓'}
                      </Button>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full border-[#4AA3F2] text-[#4AA3F2]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFlightDetails(option);
                      }}
                    >
                      View Full Details →
                    </Button>
                  </>
                )}

                {/* Show compact buttons when card is not selected */}
                {selectedFlightId !== option.id && (
                  <Button 
                    variant="outline" 
                    className="w-full border-[#E5E7EB] text-[#6B7280]"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFlightDetails(option);
                    }}
                  >
                    View Details & Book
                  </Button>
                )}
              </div>
              
              {/* Impact Card - appears under this alternative option if selected */}
              {selectedFlightId === option.id && <ImpactCard />}
            </div>
          ))}
        </div>

        {/* Disclaimer Box */}
        <div className="bg-[#FEF3C7] rounded-2xl p-5 mb-6 border-2 border-[#F59E0B]">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-1" />
            <p className="text-[#1F2937]">
              You'll be redirected to complete booking on your chosen platform. Bookmark this page to return and update your itinerary.
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 mb-8">
          <Button 
            className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] h-14"
            onClick={onSelectFlight}
          >
            Finalize Flight Selection
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-[#E5E7EB] text-[#6B7280]"
            >
              Save Options
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-[#E5E7EB] text-[#6B7280]"
              onClick={onBackToPreferences}
            >
              Back to Preferences
            </Button>
          </div>
        </div>
      </div>

      <BottomNav activeTab="bookings" />

      {/* Flight Details Modal */}
      <Dialog open={!!selectedFlightDetails} onOpenChange={(open) => !open && closeFlightDetails()}>
        <DialogContent className="max-w-[90vw] h-[80vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-[#E5E7EB]">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-[#1F2937] text-xl mb-1">Flight Details</DialogTitle>
                {selectedFlightDetails && (
                  <p className="text-[#6B7280]">
                    {selectedFlightDetails.outbound.airline} + {selectedFlightDetails.return.airline} • {selectedFlightDetails.type}
                  </p>
                )}
              </div>
              <button 
                onClick={closeFlightDetails}
                className="text-[#6B7280] hover:text-[#1F2937]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <DialogDescription className="sr-only">
              View detailed flight information, baggage options, pricing breakdown, and policies for the selected flight.
            </DialogDescription>
          </DialogHeader>

          {selectedFlightDetails && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start px-6 bg-transparent border-b border-[#E5E7EB] rounded-none">
                <TabsTrigger value="flight-info" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4AA3F2] rounded-none">
                  Flight Info
                </TabsTrigger>
                <TabsTrigger value="bags" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4AA3F2] rounded-none">
                  Bags
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4AA3F2] rounded-none">
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="policies" className="data-[state=active]:border-b-2 data-[state=active]:border-[#4AA3F2] rounded-none">
                  Policies
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="flight-info" className="p-6 mt-0">
                  {/* Outbound Flight */}
                  <div className="mb-8">
                    <h3 className="text-[#1F2937] mb-4">Outbound Flight • Dec 15, 2024</h3>
                    <div className="bg-[#F9FAFB] rounded-xl p-5 border border-[#E5E7EB]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                          <Plane className="w-6 h-6 text-[#4AA3F2]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1F2937] mb-1">{selectedFlightDetails.outbound.flightNumber}</p>
                          <p className="text-[#6B7280] mb-3">{selectedFlightDetails.outbound.aircraft}</p>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-[#1F2937] text-xl">{selectedFlightDetails.outbound.departure}</p>
                              <p className="text-[#6B7280]">MUC</p>
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="h-px bg-[#E5E7EB] relative">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                  <Plane className="w-4 h-4 text-[#4AA3F2]" />
                                </div>
                              </div>
                              <p className="text-center text-[#6B7280] mt-1">{selectedFlightDetails.outbound.duration}</p>
                            </div>
                            <div>
                              <p className="text-[#1F2937] text-xl">{selectedFlightDetails.outbound.arrival}</p>
                              <p className="text-[#6B7280]">VIE</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[#6B7280]">
                            <span>{selectedFlightDetails.outbound.stops}</span>
                            <span>•</span>
                            <span>{selectedFlightDetails.outbound.terminal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight */}
                  <div>
                    <h3 className="text-[#1F2937] mb-4">Return Flight • Dec 22, 2024</h3>
                    <div className="bg-[#F9FAFB] rounded-xl p-5 border border-[#E5E7EB]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                          <Plane className="w-6 h-6 text-[#4AA3F2]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1F2937] mb-1">{selectedFlightDetails.return.flightNumber}</p>
                          <p className="text-[#6B7280] mb-3">{selectedFlightDetails.return.aircraft}</p>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-[#1F2937] text-xl">{selectedFlightDetails.return.departure}</p>
                              <p className="text-[#6B7280]">VIE</p>
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="h-px bg-[#E5E7EB] relative">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                  <Plane className="w-4 h-4 text-[#4AA3F2]" />
                                </div>
                              </div>
                              <p className="text-center text-[#6B7280] mt-1">{selectedFlightDetails.return.duration}</p>
                            </div>
                            <div>
                              <p className="text-[#1F2937] text-xl">{selectedFlightDetails.return.arrival}</p>
                              <p className="text-[#6B7280]">MUC</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[#6B7280]">
                            <span>{selectedFlightDetails.return.stops}</span>
                            {selectedFlightDetails.return.layover && (
                              <>
                                <span>•</span>
                                <span className="text-[#FF8C00]">{selectedFlightDetails.return.layover}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bags" className="p-6 mt-0">
                  <div className="space-y-6">
                    {/* Outbound Flight Baggage */}
                    <div>
                      <h3 className="text-[#1F2937] mb-4">Outbound Flight • Dec 15, 2024</h3>
                      <div className="space-y-4">
                        <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-[#10B981]" />
                            <span className="text-[#1F2937]">Carry-on bag</span>
                          </div>
                          <p className="text-[#6B7280]">Included for all passengers</p>
                          <p className="text-[#6B7280]">1 bag up to 8kg (55 x 40 x 23 cm)</p>
                        </div>
                        <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[#1F2937]">Checked bags</span>
                            <span className="text-[#4AA3F2]">+ ${Math.floor(selectedFlightDetails.baggageFee / 2)} per person</span>
                          </div>
                          <Select defaultValue="1">
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">No checked bags</SelectItem>
                              <SelectItem value="1">1 bag per person (23kg)</SelectItem>
                              <SelectItem value="2">2 bags per person (23kg each)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[#6B7280] mt-2">3 passengers × 1 bag = ${Math.floor(selectedFlightDetails.baggageFee / 2) * 3} total</p>
                        </div>
                      </div>
                    </div>

                    {/* Return Flight Baggage */}
                    <div>
                      <h3 className="text-[#1F2937] mb-4">Return Flight • Dec 22, 2024</h3>
                      <div className="space-y-4">
                        <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-[#10B981]" />
                            <span className="text-[#1F2937]">Carry-on bag</span>
                          </div>
                          <p className="text-[#6B7280]">Included for all passengers</p>
                          <p className="text-[#6B7280]">1 bag up to 8kg (55 x 40 x 23 cm)</p>
                        </div>
                        <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[#1F2937]">Checked bags</span>
                            <span className="text-[#4AA3F2]">+ ${Math.floor(selectedFlightDetails.baggageFee / 2)} per person</span>
                          </div>
                          <Select defaultValue="1">
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">No checked bags</SelectItem>
                              <SelectItem value="1">1 bag per person (23kg)</SelectItem>
                              <SelectItem value="2">2 bags per person (23kg each)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[#6B7280] mt-2">3 passengers × 1 bag = ${Math.floor(selectedFlightDetails.baggageFee / 2) * 3} total</p>
                        </div>
                      </div>
                    </div>

                    <a href="#" className="text-[#4AA3F2] hover:underline inline-block">
                      Add special baggage (sports equipment, musical instruments, etc.)
                    </a>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="p-6 mt-0">
                  <div className="space-y-4">
                    {/* Outbound Flight Pricing */}
                    <div>
                      <h3 className="text-[#1F2937] mb-3">Outbound Flight • Dec 15, 2024</h3>
                      <div className="space-y-2 pl-4">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-[#6B7280]">Base fare</span>
                          <span className="text-[#1F2937]">${Math.floor(selectedFlightDetails.basePrice / 2)} × 3 = ${(Math.floor(selectedFlightDetails.basePrice / 2) * 3).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-[#6B7280]">Checked baggage</span>
                          <span className="text-[#1F2937]">${Math.floor(selectedFlightDetails.baggageFee / 2) * 3}</span>
                        </div>
                      </div>
                    </div>

                    {/* Return Flight Pricing */}
                    <div>
                      <h3 className="text-[#1F2937] mb-3">Return Flight • Dec 22, 2024</h3>
                      <div className="space-y-2 pl-4">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-[#6B7280]">Base fare</span>
                          <span className="text-[#1F2937]">${Math.ceil(selectedFlightDetails.basePrice / 2)} × 3 = ${(Math.ceil(selectedFlightDetails.basePrice / 2) * 3).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-[#6B7280]">Checked baggage</span>
                          <span className="text-[#1F2937]">${Math.ceil(selectedFlightDetails.baggageFee / 2) * 3}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#E5E7EB] pt-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[#6B7280]">Taxes & fees</span>
                        <span className="text-[#1F2937]">${selectedFlightDetails.taxesFees}</span>
                      </div>
                    </div>
                    
                    <div className="border-t-2 border-[#E5E7EB] pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1F2937] text-xl">Total</span>
                        <span className="text-[#1F2937] text-2xl">${((selectedFlightDetails.basePrice * 3) + selectedFlightDetails.baggageFee + selectedFlightDetails.taxesFees).toLocaleString()} for 3 passengers</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#6B7280]">${Math.floor((selectedFlightDetails.basePrice * 3 + selectedFlightDetails.baggageFee + selectedFlightDetails.taxesFees) / 3).toLocaleString()} per person</span>
                      </div>
                      
                      {selectedFlightDetails.savings && (
                        <div className="bg-[#10B981] rounded-lg p-3 mt-4">
                          <p className="text-white text-center">💰 ${(selectedFlightDetails.savings * 3).toLocaleString()} total savings</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="policies" className="p-6 mt-0">
                  <div className="space-y-6">
                    {/* Outbound Flight Policies */}
                    <div>
                      <h3 className="text-[#1F2937] mb-4">Outbound Flight • Dec 15, 2024</h3>
                      <div className="space-y-4 pl-4">
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Cancellation</h4>
                          <p className="text-[#6B7280]">Free cancellation up to 24 hours before departure. After that, cancellation fee of $150 per person applies.</p>
                        </div>
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Changes</h4>
                          <p className="text-[#6B7280]">Changes allowed up to 3 hours before departure. Change fee of $75 per person plus fare difference.</p>
                        </div>
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Baggage Policy</h4>
                          <p className="text-[#6B7280] mb-1">Carry-on: 1 bag up to 8kg (55 x 40 x 23 cm)</p>
                          <p className="text-[#6B7280] mb-1">Checked bag: Up to 23kg per bag</p>
                          <p className="text-[#6B7280]">Overweight: $50 per bag for 23-32kg</p>
                        </div>
                      </div>
                    </div>

                    {/* Return Flight Policies */}
                    <div>
                      <h3 className="text-[#1F2937] mb-4">Return Flight • Dec 22, 2024</h3>
                      <div className="space-y-4 pl-4">
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Cancellation</h4>
                          <p className="text-[#6B7280]">Free cancellation up to 24 hours before departure. After that, cancellation fee of $150 per person applies.</p>
                        </div>
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Changes</h4>
                          <p className="text-[#6B7280]">Changes allowed up to 3 hours before departure. Change fee of $75 per person plus fare difference.</p>
                        </div>
                        <div>
                          <h4 className="text-[#1F2937] mb-2">Baggage Policy</h4>
                          <p className="text-[#6B7280] mb-1">Carry-on: 1 bag up to 8kg (55 x 40 x 23 cm)</p>
                          <p className="text-[#6B7280] mb-1">Checked bag: Up to 23kg per bag</p>
                          <p className="text-[#6B7280]">Overweight: $50 per bag for 23-32kg</p>
                        </div>
                      </div>
                    </div>

                    {/* General Policies */}
                    <div className="border-t border-[#E5E7EB] pt-4">
                      <h3 className="text-[#1F2937] mb-3">Refund Policy</h3>
                      <p className="text-[#6B7280]">Refundable fare available for additional $200 per person. Standard fares are non-refundable but can be used as credit within 12 months.</p>
                    </div>
                  </div>
                </TabsContent>
              </div>

              <div className="p-6 border-t border-[#E5E7EB] bg-white">
                {/* Platform Selection Section */}
                <h3 className="text-[#1F2937] mb-4">Choose Booking Platform</h3>
                
                <div className="space-y-3 mb-4">
                  {/* Skyscanner Card */}
                  <div className="bg-[#F9FAFB] rounded-xl p-4 border-2 border-[#10B981]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center">
                          <Plane className="w-6 h-6 text-[#4AA3F2]" />
                        </div>
                        <div>
                          <p className="text-[#1F2937]">Skyscanner</p>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#10B981] rounded px-2 py-0.5">
                              <span className="text-white">✅ Best Price</span>
                            </div>
                            <span className="text-[#6B7280]">4.2★</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#1F2937] text-xl">${selectedFlightDetails.totalPerPerson.toLocaleString()}</p>
                        <p className="text-[#6B7280]">per person</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] flex items-center justify-center gap-2"
                      onClick={() => {
                        closeFlightDetails();
                        onSelectFlight();
                      }}
                    >
                      Book on Skyscanner <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Booking.com Card */}
                  <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center">
                          <Plane className="w-6 h-6 text-[#6B7280]" />
                        </div>
                        <div>
                          <p className="text-[#1F2937]">Booking.com</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F59E0B]">+$8 vs best</span>
                            <span className="text-[#6B7280]">4.5★</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#1F2937] text-xl">${(selectedFlightDetails.totalPerPerson + 8).toLocaleString()}</p>
                        <p className="text-[#6B7280]">per person</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full border-[#E5E7EB] text-[#6B7280] flex items-center justify-center gap-2"
                    >
                      Book on Booking.com <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* MakeMyTrip Card */}
                  <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center">
                          <Plane className="w-6 h-6 text-[#6B7280]" />
                        </div>
                        <div>
                          <p className="text-[#1F2937]">MakeMyTrip</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F59E0B]">+$15 vs best</span>
                            <span className="text-[#6B7280]">4.1★</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#1F2937] text-xl">${(selectedFlightDetails.totalPerPerson + 15).toLocaleString()}</p>
                        <p className="text-[#6B7280]">per person</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full border-[#E5E7EB] text-[#6B7280] flex items-center justify-center gap-2"
                    >
                      Book on MakeMyTrip <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="space-y-1 mb-4 bg-[#FEF3C7] rounded-lg p-3 border border-[#F59E0B]">
                  <p className="text-[#1F2937]">Prices shown are estimates. Final price confirmed on booking platform.</p>
                  <p className="text-[#1F2937]">Opens in new tab. Return here to update your trip itinerary.</p>
                </div>

                {/* Secondary Actions */}
                <Button 
                  variant="outline" 
                  className="w-full border-[#E5E7EB] text-[#6B7280]"
                >
                  Compare All Platforms
                </Button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
