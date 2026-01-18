"use client";

import { ImageWithFallback } from '@/components/ImageWithFallback';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/navigation';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Map as MapIcon,
  UtensilsCrossed,
  ShoppingBag,
  MapPin,
  Sparkles,
  Coffee,
  Zap,
  Compass,
  ChevronLeft,
  ChevronRight,
  Plane,
  Train,
  Car,
  Ship
} from 'lucide-react';
import { Switch } from '@/ui/switch';
import { Calendar as CalendarComponent } from '@/ui/calendar';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState, DraftItinerary } from '@/lib/tripState';
import dynamic from 'next/dynamic';
import cityCoordinates from '@/lib/data/cityCoordinates.json';

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

interface Activity {
  id: string;
  name: string;
  type: 'food' | 'shopping' | 'attraction' | 'other';
  time: string;
  image: string;
  distance?: string;
}

interface Day {
  id: string;
  dayNumber: number;
  title: string;
  date: string;
  activities: Activity[];
  isExpanded: boolean;
  city?: string; // City for this day
  dayTitle?: string; // 2-6 word summary
}

interface TransportEntry {
  id: string;
  type: 'outbound' | 'inter-city' | 'return';
  transportType: 'flight' | 'train' | 'car' | 'ferry';
  from: string;
  to: string;
  icon: React.ReactNode;
}

interface AccommodationEntry {
  id: string;
  city: string;
  checkInDay: number;
  checkOutDay: number;
}

interface TimeGroupedActivities {
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
}

interface BookedItem {
  id: number;
  name: string;
  location: string;
  rating: number;
  image: string;
  type: string;
  price?: string;
  category: 'transport' | 'stays' | 'food' | 'activities' | 'attractions';
}

interface TripParams {
  destination: string;
  dateRange?: { from: Date; to: Date };
  adults?: number;
  kids?: number;
  budget?: string;
  pace?: string;
  styles?: string[];
  mustSeeItems?: string[];
  bookedItems?: BookedItem[];
}

interface DetailedItineraryScreenProps {
  bookedItems?: BookedItem[];
  onAddToTrip?: (item: any, category: string) => void;
  tripParams?: TripParams;
  onSave?: () => void;
  onBack?: () => void;
}

export function DetailedItineraryScreen({ bookedItems = [], onAddToTrip, tripParams, onSave, onBack }: DetailedItineraryScreenProps) {
  const router = useRouter();
  
  // Fix Leaflet icon issue (must run on client side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);
  
  // CRITICAL: Load selected itinerary with a delay to allow state to persist after navigation
  // Use useState instead of useMemo to allow re-reading state after it's saved
  const [selectedItineraryId, setSelectedItineraryIdState] = useState<string | null>(null);
  const [selectedItinerary, setSelectedItineraryState] = useState<DraftItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load selected itinerary with a small delay to allow state persistence
  useEffect(() => {
    // Give state a moment to persist if it was just set during navigation
    const loadTimer = setTimeout(() => {
      const currentState = getTripState();
      const currentSelectedId = currentState.selectedDraftItineraryId || currentState.ui?.selectedItinerary || null;
      
      console.log('Loading selected itinerary:', currentSelectedId);
      
      if (currentSelectedId && currentState.draftItineraries) {
        setSelectedItineraryIdState(currentSelectedId);
        if (currentSelectedId && currentState.draftItineraries) {
          const selectedItinerary = currentState.draftItineraries.find(it => it.id === currentSelectedId);
          setSelectedItineraryState(selectedItinerary || null);
        }
        setIsLoading(false);
      } else {
        // Only redirect if still missing after delay
        console.warn('No selected itinerary found after delay, redirecting to Explore Options');
        setIsLoading(false);
        router.push(routes.plan.itinerary);
      }
    }, 150); // Small delay to allow sessionStorage write to complete
    
    return () => clearTimeout(loadTimer);
  }, []); // Only run once on mount
  
  // Calculate number of days from master itinerary or trip params
  const calculateDays = () => {
    // DraftItinerary uses cities array instead of detailedDayPlan
    if (selectedItinerary?.cities && selectedItinerary.cities.length > 0) {
      return selectedItinerary.cities.reduce((total, city) => total + (city.nights || 1), 0);
    }
    if (tripParams?.dateRange?.from && tripParams?.dateRange?.to) {
      const diffTime = Math.abs(tripParams.dateRange.to.getTime() - tripParams.dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 2; // Default to 2 days if no date range
  };

  // Calculate budget range (minimum to 20% above selected budget)
  const calculateBudgetRange = () => {
    if (tripParams?.budget) {
      const selectedBudget = parseInt(tripParams.budget);
      const minBudget = Math.floor(selectedBudget * 0.9); // 10% below
      const maxBudget = Math.ceil(selectedBudget * 1.1); // 10% above
      return {
        min: minBudget.toLocaleString('en-IN'),
        max: maxBudget.toLocaleString('en-IN')
      };
    }
    return { min: '0', max: '0' };
  };

  // Generate day labels based on date range
  const generateDayLabels = () => {
    const numDays = calculateDays();
    const labels: Array<{ date: string; dayOfWeek: string }> = [];
    
    if (tripParams?.dateRange?.from) {
      for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(tripParams.dateRange.from);
        currentDate.setDate(currentDate.getDate() + i);
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push({ date: `${dayOfWeek}, ${monthDay}`, dayOfWeek });
      }
    } else {
      // Default labels
      for (let i = 0; i < numDays; i++) {
        labels.push({ date: `Day ${i + 1}`, dayOfWeek: '' });
      }
    }
    
    return labels;
  };

  // Generate initial days based on trip params
  const generateInitialDays = (): Day[] => {
    const numDays = calculateDays();
    const dayLabels = generateDayLabels();
    const initialDays: Day[] = [];

    // Sample activities to distribute across days
    const sampleActivities = [
      {
        id: 'act-1',
        name: 'Local Bakery',
        type: 'food' as const,
        time: '9:00 AM - 9:45 AM',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlcnklMjBpbnRlcmlvciUyMGZvb2R8ZW58MXx8fHwxNzYwNjA5MjQ5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        distance: '0.15 mi',
      },
      {
        id: 'act-2',
        name: 'Main Street Shopping',
        type: 'shopping' as const,
        time: '10:00 AM - 10:45 AM',
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXN5JTIwc3RyZWV0JTIwbWFya2V0fGVufDF8fHx8MTc2MDYwOTI1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        distance: '0.04 mi',
      },
      {
        id: 'act-3',
        name: 'Local Plaza',
        type: 'shopping' as const,
        time: '11:00 AM - 11:30 AM',
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF6YSUyMHNob3BwaW5nJTIwZGlzdHJpY3R8ZW58MXx8fHwxNzYwNjA5MjUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
        distance: '0.18 mi',
      },
      {
        id: 'act-4',
        name: 'Sunset Beach Walk',
        type: 'attraction' as const,
        time: '5:00 PM - 6:30 PM',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwYmVhY2glMjBzdW5zZXR8ZW58MXx8fHwxNzYwNjA5MjUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      },
    ];

    for (let i = 0; i < numDays; i++) {
      const activitiesForDay = i === 0 ? sampleActivities.slice(0, 3) : [sampleActivities[3]];
      
      initialDays.push({
        id: `day-${i + 1}`,
        dayNumber: i + 1,
        title: i === 0 ? 'Exploration & Local Culture' : 'Sightseeing',
        date: dayLabels[i].date,
        isExpanded: false,
        activities: activitiesForDay,
      });
    }

    return initialDays;
  };

  const [showDistances, setShowDistances] = useState(true);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'calendar'>('itinerary');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(tripParams?.dateRange?.from || new Date());
  
  const [days, setDays] = useState<Day[]>([]);

  // Helper function to extract ordered cities from itinerary
  const getOrderedCities = (itinerary: DraftItinerary | null): string[] => {
    if (!itinerary || !itinerary.cities || itinerary.cities.length === 0) {
      return [];
    }
    // DraftItinerary has cities array with { name, nights, activities } objects
    // Extract city names and remove duplicates while preserving order
    const seen = new Set<string>();
    return itinerary.cities
      .map(city => city.name)
      .filter(cityName => {
        const normalized = cityName.toLowerCase().trim();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });
  };

  // Helper function to get coordinates for a city
  const getCityCoordinates = (cityName: string): { lat: number; lng: number } | null => {
    const normalized = cityName.toLowerCase().trim();
    const coords = (cityCoordinates as any)[normalized];
    if (coords && coords.lat && coords.lng) {
      return { lat: coords.lat, lng: coords.lng };
    }
    // Try alternative formats (e.g., "New York" -> "new york")
    const alternatives = [
      normalized.replace(/\s+/g, ' '),
      normalized.replace(/\s+/g, '_'),
    ];
    for (const alt of alternatives) {
      const altCoords = (cityCoordinates as any)[alt];
      if (altCoords && altCoords.lat && altCoords.lng) {
        return { lat: altCoords.lat, lng: altCoords.lng };
      }
    }
    return null;
  };

  // Get cities with coordinates for the map
  const getCitiesWithCoordinates = useMemo(() => {
    if (!selectedItinerary) {
      return [];
    }
    const cities = getOrderedCities(selectedItinerary);
    const citiesWithCoords: Array<{ name: string; lat: number; lng: number }> = [];
    const missingCities: string[] = [];

    for (const city of cities) {
      const coords = getCityCoordinates(city);
      if (coords) {
        citiesWithCoords.push({
          name: city,
          lat: coords.lat,
          lng: coords.lng,
        });
      } else {
        missingCities.push(city);
      }
    }

    if (missingCities.length > 0) {
      console.warn('Cities not found in coordinates file:', missingCities);
    }

    return citiesWithCoords;
  }, [selectedItinerary]);

  // Helper: Generate day title using simple rule-based system (2-4 words max)
  const generateDayTitle = (activities: Activity[], city?: string): string => {
    if (activities.length === 0) {
      return city ? `Explore ${city}` : 'Free Day';
    }
    
    const allActivityText = activities.map(a => a.name).join(' ').toLowerCase();
    const cityName = city || '';
    
    // Rule 1: Arrive
    if (allActivityText.includes('arrive')) {
      return cityName ? `Arrive in ${cityName}` : 'Arrival Day';
    }
    
    // Rule 2: Depart/Leave
    if (allActivityText.includes('depart') || allActivityText.includes('leave')) {
      return cityName ? `Depart ${cityName}` : 'Departure Day';
    }
    
    // Rule 3: Transport
    if (allActivityText.includes('flight') || allActivityText.includes('train') || allActivityText.includes('bus') || allActivityText.includes('transfer')) {
      return 'Travel Day';
    }
    
    // Rule 4: Drive
    if (allActivityText.includes('drive')) {
      return cityName ? `Drive to ${cityName}` : 'Drive Day';
    }
    
    // Rule 5: Hike
    if (allActivityText.includes('hike') || allActivityText.includes('hiking') || allActivityText.includes('trek')) {
      return 'Hiking Day';
    }
    
    // Rule 6: Museum
    if (allActivityText.includes('museum')) {
      return cityName ? `${cityName} Museums` : 'Museum Day';
    }
    
    // Rule 7: Market
    if (allActivityText.includes('market')) {
      return 'Local Markets';
    }
    
    // Rule 8: Beach
    if (allActivityText.includes('beach')) {
      return 'Beach Day';
    }
    
    // Rule 9: Food/Culinary
    if (allActivityText.includes('food') || allActivityText.includes('culinary') || allActivityText.includes('restaurant') || allActivityText.includes('dining')) {
      return 'Food Tour';
    }
    
    // Rule 10: Walk
    if (allActivityText.includes('walk') || allActivityText.includes('walking')) {
      return 'City Walk';
    }
    
    // Fallback: Explore city
    return cityName ? `Explore ${cityName}` : 'Explore Day';
  };

  // Helper: Group activities by time of day
  const groupActivitiesByTime = (activities: Activity[]): TimeGroupedActivities => {
    const grouped: TimeGroupedActivities = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    
    activities.forEach((activity) => {
      const timeLower = activity.time.toLowerCase();
      if (timeLower.includes('morning') || timeLower.includes('breakfast') || timeLower.includes('am') && parseInt(activity.time) < 12) {
        grouped.morning.push(activity);
      } else if (timeLower.includes('afternoon') || timeLower.includes('lunch') || (timeLower.includes('pm') && parseInt(activity.time) >= 12 && parseInt(activity.time) < 17)) {
        grouped.afternoon.push(activity);
      } else {
        grouped.evening.push(activity);
      }
    });
    
    // If no time indicators, distribute evenly
    if (grouped.morning.length === 0 && grouped.afternoon.length === 0 && grouped.evening.length === 0) {
      const total = activities.length;
      const morningCount = Math.ceil(total / 3);
      const afternoonCount = Math.ceil((total - morningCount) / 2);
      
      grouped.morning = activities.slice(0, morningCount);
      grouped.afternoon = activities.slice(morningCount, morningCount + afternoonCount);
      grouped.evening = activities.slice(morningCount + afternoonCount);
    }
    
    return grouped;
  };

  // Helper: Determine city for each day based on itinerary cities
  const assignCitiesToDays = (days: Day[], itinerary: DraftItinerary | null): Day[] => {
    if (!itinerary || !itinerary.cities || itinerary.cities.length === 0) {
      return days;
    }
    
    const cities = getOrderedCities(itinerary);
    if (cities.length === 0) return days;
    
    // Simple distribution: assign cities in order
    const daysPerCity = Math.ceil(days.length / cities.length);
    
    return days.map((day, index) => {
      const cityIndex = Math.floor(index / daysPerCity);
      return {
        ...day,
        city: cities[Math.min(cityIndex, cities.length - 1)],
      };
    });
  };

  // Helper: Calculate distance between two cities in kilometers using Haversine
  const calculateCityDistance = (city1: string, city2: string): number | null => {
    const coords1 = getCityCoordinates(city1);
    const coords2 = getCityCoordinates(city2);
    
    if (!coords1 || !coords2) return null;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const dLng = ((coords2.lng - coords1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1.lat * Math.PI) / 180) *
        Math.cos((coords2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper: Check if a city is a day trip (appears on only one day with transport in/out)
  const isDayTripCity = (city: string, days: Day[]): boolean => {
    const cityDays = days.filter(d => d.city === city);
    if (cityDays.length !== 1) return false; // Not a one-day city
    
    const dayIndex = days.findIndex(d => d.city === city);
    if (dayIndex === -1) return false;
    
    // Check if there's transport in (previous day was different city)
    const hasTransportIn = Boolean(dayIndex > 0 && 
                          days[dayIndex - 1]?.city && 
                          days[dayIndex - 1].city !== city &&
                          days[dayIndex - 1].city !== 'Unknown');
    
    // Check if there's transport out (next day is different city)
    const hasTransportOut = Boolean(dayIndex < days.length - 1 && 
                           days[dayIndex + 1]?.city &&
                           days[dayIndex + 1].city !== city &&
                           days[dayIndex + 1].city !== 'Unknown');
    
    // Check if previous day did NOT end in this city
    const previousDayEndedHere = Boolean(dayIndex > 0 && days[dayIndex - 1]?.city === city);
    
    return hasTransportIn && hasTransportOut && !previousDayEndedHere;
  };

  // Helper: Get last overnight city (not a day trip, not Unknown)
  const getLastOvernightCity = (days: Day[]): string | null => {
    // Go backwards through days to find the last city that's not a day trip
    for (let i = days.length - 1; i >= 0; i--) {
      const city = days[i]?.city;
      if (city && city !== 'Unknown' && !isDayTripCity(city, days)) {
        return city;
      }
    }
    // Fallback: last city in ordered list if no overnight city found
    const cities = getOrderedCities(selectedItinerary);
    return cities.length > 0 ? cities[cities.length - 1] : null;
  };

  // Helper: Generate transport entries
  const generateTransportEntries = (): TransportEntry[] => {
    if (!selectedItinerary) return [];
    
    const cities = getOrderedCities(selectedItinerary);
    if (cities.length === 0) return [];
    
    // Get user's actual source location from tripState
    const tripState = getTripState();
    const fromLocation = tripState.fromLocation?.value || 'Your Location';
    
    // Get resolved airports from itinerary (DraftItinerary doesn't have transport field)
    const departureAirport = undefined; // Transport info not available in DraftItinerary
    const returnAirport = undefined;
    
    // Get last overnight city (not a day trip)
    const lastOvernightCity = getLastOvernightCity(days);
    
    const entries: TransportEntry[] = [];
    
    // Outbound transport (before Day 1)
    // Note: DraftItinerary doesn't have transport info, so we use fallback
    entries.push({
      id: 'transport-outbound',
      type: 'outbound',
      transportType: 'flight',
      from: fromLocation,
      to: cities[0],
      icon: <Plane className="w-4 h-4 text-[#FE4C40]" />,
    });
    
    // Inter-city transport (between cities)
    // Only show when: city changes AND distance < 500km AND not a day trip
    for (let i = 0; i < cities.length - 1; i++) {
      const currentCity = cities[i];
      const nextCity = cities[i + 1];
      
      // Skip if either city is Unknown
      if (currentCity === 'Unknown' || nextCity === 'Unknown') {
        continue;
      }
      
      // Skip if next city is a day trip (no inter-city transport needed)
      if (isDayTripCity(nextCity, days)) {
        continue;
      }
      
      // Calculate distance
      const distance = calculateCityDistance(currentCity, nextCity);
      
      // Only show if distance < 500km
      if (distance !== null && distance < 500) {
        // Determine transport type based on distance
        let transportType: 'train' | 'car' | 'ferry' = 'train';
        let icon = <Train className="w-4 h-4 text-[#FE4C40]" />;
        
        if (distance < 100) {
          transportType = 'car';
          icon = <Car className="w-4 h-4 text-[#FE4C40]" />;
        } else if (distance < 200) {
          transportType = 'train';
          icon = <Train className="w-4 h-4 text-[#FE4C40]" />;
        } else {
          // For longer distances, prefer train but could be ferry for coastal routes
          transportType = 'train';
          icon = <Train className="w-4 h-4 text-[#FE4C40]" />;
        }
        
        entries.push({
          id: `transport-inter-${i}`,
          type: 'inter-city',
          transportType,
          from: currentCity,
          to: nextCity,
          icon,
        });
      }
    }
    
    // Return transport (after last day)
    // Note: DraftItinerary doesn't have transport info, so we use fallback
    if (lastOvernightCity) {
      // Fallback: show return from last overnight city
      entries.push({
        id: 'transport-return',
        type: 'return',
        transportType: 'flight',
        from: lastOvernightCity,
        to: fromLocation,
        icon: <Plane className="w-4 h-4 text-[#FE4C40]" />,
      });
    } else {
      // Final fallback: generic message
      entries.push({
        id: 'transport-return',
        type: 'return',
        transportType: 'flight',
        from: cities[cities.length - 1],
        to: fromLocation,
        icon: <Plane className="w-4 h-4 text-[#FE4C40]" />,
      });
    }
    
    return entries;
  };

  // Get transport entries (depends on both selectedItinerary and days for day trip detection)
  const transportEntries = useMemo(() => generateTransportEntries(), [selectedItinerary, days]);

  // Helper: Generate accommodation entries for each city block
  const generateAccommodationEntries = (days: Day[]): AccommodationEntry[] => {
    if (days.length === 0) return [];
    
    const entries: AccommodationEntry[] = [];
    const cityMap = new Map<string, { 
      firstDayIndex: number; 
      lastDayIndex: number; 
      firstDayNumber: number; 
      lastDayNumber: number;
      dayIndices: number[];
    }>();
    
    // Group days by city and track first/last day indices
    days.forEach((day, index) => {
      const cityKey = day.city || 'Unknown';
      
      // Skip Unknown cities entirely
      if (cityKey === 'Unknown' || !cityKey) {
        return;
      }
      
      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          firstDayIndex: index,
          lastDayIndex: index,
          firstDayNumber: day.dayNumber,
          lastDayNumber: day.dayNumber,
          dayIndices: [index],
        });
      } else {
        const cityData = cityMap.get(cityKey)!;
        cityData.lastDayIndex = index;
        cityData.lastDayNumber = day.dayNumber;
        cityData.dayIndices.push(index);
      }
    });
    
    // Sort cities by their first day index to process in order
    const sortedCities = Array.from(cityMap.entries()).sort(
      (a, b) => a[1].firstDayIndex - b[1].firstDayIndex
    );
    
    // Track previous city's checkout day to ensure seamless transitions
    let previousCheckOutDay: number | null = null;
    
    // Check for day trips and create accommodation entries
    sortedCities.forEach(([city, cityData]) => {
      // Never create entries for Unknown cities
      if (city === 'Unknown' || !city) {
        return;
      }
      
      const isOneDayCity = cityData.dayIndices.length === 1;
      const dayIndex = cityData.firstDayIndex;
      const dayNumber = cityData.firstDayNumber;
      
      // Check if this is a day trip
      if (isOneDayCity) {
        // Condition 1: City appears on only ONE day ✓ (already checked)
        
        // Condition 2: There is transport INTO the city on that same day
        // (Previous day was a different city, meaning transport happened)
        const hasTransportIn = dayIndex > 0 && 
                               days[dayIndex - 1]?.city && 
                               days[dayIndex - 1].city !== city &&
                               days[dayIndex - 1].city !== 'Unknown';
        
        // Condition 3: There is transport OUT of the city on that same day
        // (Next day is a different city, meaning transport happens)
        const hasTransportOut = dayIndex < days.length - 1 && 
                               days[dayIndex + 1]?.city &&
                               days[dayIndex + 1].city !== city &&
                               days[dayIndex + 1].city !== 'Unknown';
        
        // Condition 4: The previous day did NOT end in that city
        // (User did not wake up in this city)
        const previousDayEndedHere = dayIndex > 0 && days[dayIndex - 1]?.city === city;
        
        // Day trip: ALL conditions must be true
        const isDayTrip = hasTransportIn && hasTransportOut && !previousDayEndedHere;
        
        if (isDayTrip) {
          // Skip accommodation entry for day trips
          return;
        }
        
        // One-day city that requires accommodation (overnight stay)
        // Check if there's transport out the next day (morning departure)
        const hasNextDayTransportOut = dayIndex < days.length - 1 && 
                                       days[dayIndex + 1]?.city &&
                                       days[dayIndex + 1].city !== city &&
                                       days[dayIndex + 1].city !== 'Unknown';
        
        // Check-in day: if this city's first day is the day after previous checkout, use previous checkout day
        // This ensures seamless transition: checkout Day 3 → checkin Day 3 (same day)
        // Otherwise use the city's first day
        const checkInDay = previousCheckOutDay !== null && 
                          cityData.firstDayNumber === previousCheckOutDay + 1
          ? previousCheckOutDay
          : dayNumber;
        const checkOutDay = hasNextDayTransportOut ? dayNumber + 1 : dayNumber;
        
        entries.push({
          id: `accommodation-${city}`,
          city,
          checkInDay,
          checkOutDay,
        });
        
        previousCheckOutDay = checkOutDay;
      } else {
        // Multi-day city: use exact day indices
        // Check-in day: if this city's first day is the day after previous checkout, use previous checkout day
        // This ensures seamless transition: checkout Day 3 → checkin Day 3 (same day)
        // Otherwise use the city's first day
        const checkInDay = previousCheckOutDay !== null && 
                          cityData.firstDayNumber === previousCheckOutDay + 1
          ? previousCheckOutDay
          : cityData.firstDayNumber;
        const checkOutDay = cityData.lastDayNumber;
        
        entries.push({
          id: `accommodation-${city}`,
          city,
          checkInDay,
          checkOutDay,
        });
        
        previousCheckOutDay = checkOutDay;
      }
    });
    
    return entries;
  };

  // Get accommodation entries
  const accommodationEntries = useMemo(() => generateAccommodationEntries(days), [days]);
  
  // Convert DraftItinerary to Day[] format
  // Note: DraftItinerary doesn't have detailedDayPlan, so we'll return empty array for now
  // This component needs refactoring to work with the new DraftItinerary structure
  const convertMasterItineraryToDays = (itinerary: NonNullable<typeof selectedItinerary>): Day[] => {
    // DraftItinerary structure doesn't match what this function expects
    // Returning empty array - component needs refactoring
    return [];
  };
  
  const _convertMasterItineraryToDays_OLD = (itinerary: NonNullable<typeof selectedItinerary>): Day[] => {
    // This function is no longer used as DraftItinerary doesn't have detailedDayPlan
    if (!(itinerary as any).detailedDayPlan || !(itinerary as any).detailedDayPlan.days) {
      return [];
    }
    
    const dayLabels = generateDayLabels();
    
    return (itinerary as any).detailedDayPlan.days.map((dayData: any, index: number) => {
      // Parse activities from the API response
      const activities: Activity[] = dayData.activities.map((activityText: string, actIndex: number) => {
        // Extract time if present (e.g., "Morning: Activity description")
        const timeMatch = activityText.match(/^(Morning|Afternoon|Evening|Night):\s*(.+)$/i);
        const time = timeMatch 
          ? `${timeMatch[1]}: ${timeMatch[2]}` 
          : activityText;
        const name = timeMatch ? timeMatch[2] : activityText;
        
        // Determine activity type based on keywords
        const lowerText = activityText.toLowerCase();
        let type: Activity['type'] = 'other';
        if (lowerText.includes('food') || lowerText.includes('restaurant') || lowerText.includes('dining') || lowerText.includes('breakfast') || lowerText.includes('lunch') || lowerText.includes('dinner') || lowerText.includes('cafe') || lowerText.includes('bakery')) {
          type = 'food';
        } else if (lowerText.includes('shopping') || lowerText.includes('market') || lowerText.includes('store')) {
          type = 'shopping';
        } else if (lowerText.includes('museum') || lowerText.includes('tour') || lowerText.includes('attraction') || lowerText.includes('visit') || lowerText.includes('monument') || lowerText.includes('park') || lowerText.includes('beach')) {
          type = 'attraction';
        }
        
        // Use a placeholder image (you could enhance this with image search API)
        const imagePlaceholders = {
          food: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
          shopping: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400',
          attraction: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400',
          other: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
        };
        
        return {
          id: `day-${index}-act-${actIndex}`,
          name,
          type,
          time,
          image: imagePlaceholders[type],
        };
      });
      
      // Assign city to day first (needed for day title generation)
      const cities = getOrderedCities(itinerary);
      const daysPerCity = cities.length > 0 ? Math.ceil((itinerary as any).detailedDayPlan.days.length / cities.length) : 0;
      const cityIndex = daysPerCity > 0 ? Math.floor(index / daysPerCity) : 0;
      const city = cities.length > 0 ? cities[Math.min(cityIndex, cities.length - 1)] : undefined;
      
      // Generate day title from activities and city (rule-based, 2-4 words)
      const dayTitle = generateDayTitle(activities, city);
      
      return {
        id: `day-${index + 1}`,
        dayNumber: index + 1,
        title: dayLabels[index]?.date || dayData.date,
        date: dayData.date,
        activities,
        isExpanded: false, // Default to collapsed
        city,
        dayTitle,
      };
    });
  };
  
  // Initialize days from selected master itinerary - NO REGENERATION
  // Wait for selectedItinerary to be loaded before initializing days
  useEffect(() => {
    if (isLoading || !selectedItinerary) {
      return; // Wait for itinerary to load
    }
    
    console.log('Rendering details page with itinerary', selectedItinerary.id);
    
    // CRITICAL: Only read from current master state - never use stale data
    // Note: DraftItinerary structure is different - component needs refactoring
    // For now, we'll work with cities array instead of detailedDayPlan
    if (selectedItinerary.cities && selectedItinerary.cities.length > 0) {
      // Clear any previous days state to prevent stale data
      setDays([]);
      
      // Convert itinerary data to days (returns empty for now until refactored)
      const convertedDays = convertMasterItineraryToDays(selectedItinerary);
      setDays(convertedDays);
    } else {
      // Guardrail: If no cities, redirect
      console.warn('No cities found in selected itinerary');
      router.push(routes.plan.itinerary);
    }
  }, [selectedItinerary, isLoading, router]); // Depend on selectedItinerary and loading state

  // REMOVED: generateStyleItinerary - now using API-generated itinerary
  // This function is no longer used as we fetch itinerary from the API
  const _generateStyleItinerary_removed = (style: string): Day[] => {
    const numDays = calculateDays();
    const dayLabels = generateDayLabels();
    const styleDays: Day[] = [];

    // Different activities for different styles
    const styleActivities: { [key: string]: Activity[][] } = {
      balanced: [
        [
          {
            id: 'bal-1',
            name: 'Morning Coffee & Pastries',
            type: 'food',
            time: '8:00 AM - 9:00 AM',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            distance: '0.2 mi',
          },
          {
            id: 'bal-2',
            name: 'City Walking Tour',
            type: 'attraction',
            time: '9:30 AM - 12:30 PM',
            image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400',
            distance: '1.5 mi',
          },
          {
            id: 'bal-3',
            name: 'Local Market Shopping',
            type: 'shopping',
            time: '1:00 PM - 3:00 PM',
            image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400',
            distance: '0.3 mi',
          },
          {
            id: 'bal-4',
            name: 'Sunset Viewpoint',
            type: 'attraction',
            time: '5:30 PM - 7:00 PM',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
          },
        ],
        [
          {
            id: 'bal-5',
            name: 'Beach Breakfast',
            type: 'food',
            time: '8:30 AM - 9:30 AM',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            distance: '0.5 mi',
          },
          {
            id: 'bal-6',
            name: 'Museum Visit',
            type: 'attraction',
            time: '10:00 AM - 1:00 PM',
            image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400',
            distance: '0.8 mi',
          },
          {
            id: 'bal-7',
            name: 'Evening Market',
            type: 'shopping',
            time: '6:00 PM - 8:00 PM',
            image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400',
          },
        ],
      ],
      relaxed: [
        [
          {
            id: 'rel-1',
            name: 'Leisurely Brunch',
            type: 'food',
            time: '10:00 AM - 11:30 AM',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            distance: '0.1 mi',
          },
          {
            id: 'rel-2',
            name: 'Spa & Wellness',
            type: 'other',
            time: '12:00 PM - 3:00 PM',
            image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
            distance: '0.4 mi',
          },
          {
            id: 'rel-3',
            name: 'Beach Sunset',
            type: 'attraction',
            time: '5:00 PM - 6:30 PM',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
          },
        ],
        [
          {
            id: 'rel-4',
            name: 'Yoga Session',
            type: 'other',
            time: '7:00 AM - 8:00 AM',
            image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
            distance: '0.2 mi',
          },
          {
            id: 'rel-5',
            name: 'Poolside Lunch',
            type: 'food',
            time: '12:30 PM - 2:00 PM',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            distance: '0.1 mi',
          },
          {
            id: 'rel-6',
            name: 'Garden Walk',
            type: 'attraction',
            time: '4:00 PM - 5:30 PM',
            image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400',
          },
        ],
      ],
      premium: [
        [
          {
            id: 'pre-1',
            name: 'Michelin Star Breakfast',
            type: 'food',
            time: '9:00 AM - 10:30 AM',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
            distance: '0.3 mi',
          },
          {
            id: 'pre-2',
            name: 'Private Yacht Tour',
            type: 'attraction',
            time: '11:00 AM - 3:00 PM',
            image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400',
            distance: '1.2 mi',
          },
          {
            id: 'pre-3',
            name: 'Luxury Shopping District',
            type: 'shopping',
            time: '4:00 PM - 6:00 PM',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
            distance: '0.5 mi',
          },
          {
            id: 'pre-4',
            name: 'Fine Dining Experience',
            type: 'food',
            time: '7:30 PM - 10:00 PM',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
          },
        ],
        [
          {
            id: 'pre-5',
            name: 'Helicopter City Tour',
            type: 'attraction',
            time: '9:00 AM - 11:00 AM',
            image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=400',
            distance: '2.0 mi',
          },
          {
            id: 'pre-6',
            name: 'Private Art Gallery',
            type: 'attraction',
            time: '12:00 PM - 2:00 PM',
            image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
            distance: '0.6 mi',
          },
          {
            id: 'pre-7',
            name: 'Exclusive Rooftop Dinner',
            type: 'food',
            time: '8:00 PM - 10:30 PM',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          },
        ],
      ],
      explorer: [
        [
          {
            id: 'exp-1',
            name: 'Street Food Breakfast',
            type: 'food',
            time: '7:00 AM - 8:00 AM',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
            distance: '0.4 mi',
          },
          {
            id: 'exp-2',
            name: 'Mountain Hiking Trail',
            type: 'attraction',
            time: '8:30 AM - 12:30 PM',
            image: 'https://images.unsplash.com/photo-1603741614953-4187ed84cc50?w=400',
            distance: '3.5 mi',
          },
          {
            id: 'exp-3',
            name: 'Local Village Tour',
            type: 'attraction',
            time: '2:00 PM - 5:00 PM',
            image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400',
            distance: '2.1 mi',
          },
          {
            id: 'exp-4',
            name: 'Night Market Adventure',
            type: 'shopping',
            time: '7:00 PM - 9:30 PM',
            image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400',
          },
        ],
        [
          {
            id: 'exp-5',
            name: 'Kayaking Adventure',
            type: 'attraction',
            time: '6:00 AM - 10:00 AM',
            image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
            distance: '4.0 mi',
          },
          {
            id: 'exp-6',
            name: 'Hidden Waterfall Trek',
            type: 'attraction',
            time: '11:00 AM - 3:00 PM',
            image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400',
            distance: '5.2 mi',
          },
          {
            id: 'exp-7',
            name: 'Traditional Food Tour',
            type: 'food',
            time: '6:00 PM - 8:00 PM',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
          },
        ],
      ],
    };

    const activities = styleActivities[style] || styleActivities.balanced;
    const dayTitles: { [key: string]: string[] } = {
      balanced: ['Cultural Immersion', 'Urban Exploration'],
      relaxed: ['Wellness & Relaxation', 'Peaceful Discovery'],
      premium: ['Luxury Experience', 'Exclusive Adventures'],
      explorer: ['Adventure Awaits', 'Off The Beaten Path'],
    };

    for (let i = 0; i < numDays; i++) {
      const activitiesForDay = activities[i % activities.length];
      const titles = dayTitles[style] || dayTitles.balanced;
      
      styleDays.push({
        id: `${style}-day-${i + 1}`,
        dayNumber: i + 1,
        title: titles[i % titles.length],
        date: dayLabels[i].date,
        isExpanded: false,
        activities: activitiesForDay,
      });
    }

    return styleDays;
  };

  // Style selection is handled on the options page, not here

  const toggleDay = (dayId: string) => {
    setDays(days.map(day => 
      day.id === dayId ? { ...day, isExpanded: !day.isExpanded } : day
    ));
  };

  const deleteActivity = (dayId: string, activityId: string) => {
    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, activities: day.activities.filter(act => act.id !== activityId) }
        : day
    ));
  };

  const addActivity = (dayId: string) => {
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      name: 'New Activity',
      type: 'other',
      time: '12:00 PM - 1:00 PM',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwYmVhY2glMjBzdW5zZXR8ZW58MXx8fHwxNzYwNjA5MjUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    };
    
    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, activities: [...day.activities, newActivity] }
        : day
    ));
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'food':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-gray-600" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-gray-600" />;
      case 'attraction':
        return <MapPin className="w-3.5 h-3.5 text-gray-600" />;
      default:
        return <MapIcon className="w-3.5 h-3.5 text-gray-600" />;
    }
  };


  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <StepHeader
        title={selectedItinerary?.title || `Itinerary for ${tripParams?.destination || 'Your Destination'}`}
        currentStep={5}
        totalSteps={9}
        onBack={onBack || (() => router.push(routes.plan.itinerary))}
        rightAction={onSave ? {
          label: '⭐ Save',
          onClick: onSave
        } : undefined}
      />

      {/* Trip Info and Tabs - Fixed below StepHeader */}
      <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-[#E5E7EB] z-30 max-w-md mx-auto">
        <div className="px-4 py-3">
          {/* Trip Details */}
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              {tripParams?.dateRange?.from && tripParams?.dateRange?.to && (
                <>
                  <span>
                    {tripParams.dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {tripParams.dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span>•</span>
                </>
              )}
              {tripParams?.adults && (
                  <span>{tripParams.adults + (tripParams.kids || 0)} {tripParams.adults + (tripParams.kids || 0) === 1 ? 'traveler' : 'travelers'}</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`pb-2 border-b-2 transition-colors text-sm ${
                activeTab === 'itinerary'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Itinerary
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`pb-2 border-b-2 transition-colors text-sm ${
                activeTab === 'map'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-2 border-b-2 transition-colors text-sm ${
                activeTab === 'calendar'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

        {/* Tab Content - Itinerary */}
        {activeTab === 'itinerary' && (
          <div className="flex-1 overflow-y-auto pb-40 pt-[200px] px-4 py-4 max-w-md mx-auto">
            {/* Trip Summary */}
            {selectedItinerary?.summary && (
              <div className="mb-6 p-4 bg-gradient-to-br from-[#FFF5F4] to-white rounded-2xl border border-[#FE4C40]/20 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trip Overview</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedItinerary.summary}</p>
              </div>
            )}

            {/* Booked Items Section */}
            {bookedItems.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Your Bookings <span className="text-gray-500 text-sm">{bookedItems.length} items</span></h3>
                </div>
                <div className="space-y-2">
                  {bookedItems.map((item, index) => (
                    <div key={index} className="bg-gradient-to-r from-[#e8f4f5] to-white p-3 rounded-xl border border-[#205A5D]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">
                              {item.category === 'transport' && '✈️'}
                              {item.category === 'stays' && '🏨'}
                              {item.category === 'food' && '🍴'}
                              {item.category === 'activities' && '🎭'}
                              {item.category === 'attractions' && '🌆'}
                            </span>
                            <h4 className="text-sm text-gray-900 truncate">{item.name}</h4>
                          </div>
                          <p className="text-xs text-gray-600">{item.location}</p>
                          {item.price && (
                            <p className="text-xs text-[#D66800] mt-1">{item.price}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Itinerary Section */}
            <div className="mb-6 pt-8">
              <div className="mb-4">
                <h2 className="text-lg text-gray-900">Detailed Itinerary</h2>
              </div>

              {/* Transport Entries */}
              {transportEntries.length > 0 && (
                <div className="space-y-3 mb-6">
                  {/* Outbound Transport */}
                  {transportEntries.filter(t => t.type === 'outbound').map((transport) => {
                    const hasResolvedAirport = false; // Transport info not available in DraftItinerary
                    return (
                      <button
                        key={transport.id}
                        onClick={() => router.push(routes.bookings.flights.options)}
                        className="w-full p-4 bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          {transport.icon}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {transport.transportType === 'flight' ? 'Fly from' : transport.transportType === 'train' ? 'Train' : transport.transportType === 'car' ? 'Drive' : 'Ferry'}: {transport.from}
                            </p>
                            {!hasResolvedAirport && (
                              <p className="text-xs text-amber-600 mt-1">Flight booking will be finalized later</p>
                            )}
                            {hasResolvedAirport && (
                              <p className="text-xs text-gray-500 mt-1">Tap to book</p>
                                      )}
                                    </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                                  </div>
                              </button>
                    );
                  })}
                    </div>
                  )}

              {/* Days List with City Headers - Grouped by City */}
              <div className="space-y-4">
                {(() => {
                  // Group days by city
                  const cityGroups: { city: string; days: Day[] }[] = [];
                  const cityMap = new Map<string, Day[]>();
                  
                  days.forEach(day => {
                    const cityKey = day.city || 'Unknown';
                    if (!cityMap.has(cityKey)) {
                      cityMap.set(cityKey, []);
                    }
                    cityMap.get(cityKey)!.push(day);
                  });
                  
                  // Convert to array preserving order
                  const seenCities = new Set<string>();
                  days.forEach(day => {
                    const cityKey = day.city || 'Unknown';
                    if (!seenCities.has(cityKey)) {
                      seenCities.add(cityKey);
                      cityGroups.push({
                        city: cityKey,
                        days: cityMap.get(cityKey)!,
                      });
                    }
                  });
                  
                  return cityGroups.map((cityGroup, cityIndex) => {
                    const daysInCity = cityGroup.days.length;
                    const nextCityGroup = cityGroups[cityIndex + 1];
                    
                    return (
                      <div key={cityGroup.city}>
                        {/* City Header */}
                        {cityGroup.city !== 'Unknown' && (
                          <div className="mb-3 mt-4 first:mt-0">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <MapPin className="w-4 h-4 text-[#FE4C40]" />
                              <span className="font-semibold">{cityGroup.city}</span>
                              <span className="text-gray-500">— {daysInCity} {daysInCity === 1 ? 'night' : 'nights'}</span>
                              </div>
                                      </div>
                        )}
                        
                        {/* Accommodation Entry */}
                        {(() => {
                          const accommodation = accommodationEntries.find(acc => acc.city === cityGroup.city);
                          if (!accommodation || cityGroup.city === 'Unknown') return null;
                          
                          return (
                            <div className="mb-4">
                              <button
                                onClick={() => router.push(routes.bookings.accommodation)}
                                className="w-full p-4 bg-gradient-to-r from-green-50 to-white border-2 border-green-200 rounded-xl hover:border-green-400 transition-all text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">🏨</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                      Accommodation for {accommodation.city}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span>Check-in: Day {accommodation.checkInDay}</span>
                                      <span>Check-out: Day {accommodation.checkOutDay}</span>
                          </div>
                                    <p className="text-xs text-gray-500 mt-2">Tap to book</p>
                          </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                              </button>
                          </div>
                          );
                        })()}
                        
                        {/* Days for this city */}
                        <div className="space-y-4">
                          {cityGroup.days.map((day) => {
                            // Group activities by time
                            const timeGrouped = groupActivitiesByTime(day.activities);
                            
                            return (
                              <div key={day.id}>
                                {/* Day Card */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                  {/* Day Header */}
                                  <div className="w-full flex items-center justify-between p-3 bg-gray-50">
                      <button
                                      onClick={() => toggleDay(day.id)}
                                      className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                                    >
                                      {day.isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                      ) : (
                                        <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                      )}
                                      <span className="text-gray-500 text-sm flex-shrink-0">Day {day.dayNumber}</span>
                                      {day.dayTitle && (
                                        <span className="text-gray-900 text-sm truncate">— {day.dayTitle}</span>
                                      )}
                      </button>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-gray-600 hidden sm:inline">{day.date}</span>
                    </div>
                  </div>

                    {/* Day Activities - Grouped by Time */}
                    {day.isExpanded && (() => {
                      const timeGrouped = groupActivitiesByTime(day.activities);
                      return (
                        <div className="px-4 py-3 space-y-4">
                          {/* Morning Activities */}
                          {timeGrouped.morning.length > 0 && (
                        <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                <span>🌅</span>
                                <span>Morning</span>
                              </div>
                              {timeGrouped.morning.map((activity, index) => (
                                <div key={activity.id} className="relative">
                                  {index < timeGrouped.morning.length - 1 && (
                                    <div className="absolute left-8 top-16 bottom-0 w-px border-l-2 border-dashed border-gray-300" />
                                  )}
                                  <div className="flex items-start gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors group relative">
                                    <div className="flex-shrink-0 relative">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                                      />
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FE4C40] rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-2">
                                        <div className="mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                                        <h4 className="text-gray-900 text-base font-semibold">{activity.name}</h4>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{activity.time}</span>
                                      </div>
                                    </div>
                                  </div>
                            </div>
                          ))}
                    </div>
                  )}

                          {/* Afternoon Activities */}
                          {timeGrouped.afternoon.length > 0 && (
                        <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                <span>☀️</span>
                                <span>Afternoon</span>
                              </div>
                              {timeGrouped.afternoon.map((activity, index) => (
                                <div key={activity.id} className="relative">
                                  {index < timeGrouped.afternoon.length - 1 && (
                                    <div className="absolute left-8 top-16 bottom-0 w-px border-l-2 border-dashed border-gray-300" />
                                  )}
                                  <div className="flex items-start gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors group relative">
                                    <div className="flex-shrink-0 relative">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                                      />
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FE4C40] rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-2">
                                        <div className="mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                                        <h4 className="text-gray-900 text-base font-semibold">{activity.name}</h4>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{activity.time}</span>
                                      </div>
                                    </div>
                                  </div>
                            </div>
                          ))}
                    </div>
                  )}

                          {/* Evening Activities */}
                          {timeGrouped.evening.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                <span>🌙</span>
                                <span>Evening</span>
                </div>
                              {timeGrouped.evening.map((activity, index) => (
                          <div key={activity.id} className="relative">
                                  {index < timeGrouped.evening.length - 1 && (
                              <div className="absolute left-8 top-16 bottom-0 w-px border-l-2 border-dashed border-gray-300" />
                            )}
                            <div className="flex items-start gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors group relative">
                              <div className="flex-shrink-0 relative">
                                <ImageWithFallback
                                  src={activity.image}
                                  alt={activity.name}
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FE4C40] rounded-full border-2 border-white flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                                  <h4 className="text-gray-900 text-base font-semibold">{activity.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  <span>{activity.time}</span>
                                </div>
                                  </div>
                              </div>
                              </div>
                              ))}
                                  </div>
                                )}
                              </div>
                        );
                      })()}
                              </div>
                            </div>
                            );
                          })}
                          </div>
                        
                        {/* Inter-city Transport (after this city group, before next city) */}
                        {nextCityGroup && cityGroup.city !== 'Unknown' && nextCityGroup.city !== 'Unknown' && (
                          <div className="my-4">
                            {transportEntries
                              .filter(t => t.type === 'inter-city' && t.from === cityGroup.city && t.to === nextCityGroup.city)
                              .map((transport) => (
                        <button
                                  key={transport.id}
                                  onClick={() => router.push(routes.bookings.transport)}
                                  className="w-full p-3 bg-gradient-to-r from-purple-50 to-white border-2 border-purple-200 rounded-xl hover:border-purple-400 transition-all text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    {transport.icon}
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {transport.transportType === 'train' ? 'Train' : transport.transportType === 'car' ? 'Drive' : 'Ferry'}: {transport.from} → {transport.to}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">Tap to book</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  </div>
                        </button>
                              ))}
                      </div>
                    )}
                  </div>
                    );
                  });
                })()}
                
                {/* Return Transport (after last city group) */}
                {transportEntries.filter(t => t.type === 'return').map((transport) => {
                  const hasResolvedAirport = false; // Transport info not available in DraftItinerary
                  return (
                    <button
                      key={transport.id}
                      onClick={() => router.push(routes.bookings.flights.options)}
                      className="w-full p-4 bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        {transport.icon}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            Fly back to {transport.to}
                          </p>
                          {!hasResolvedAirport && (
                            <p className="text-xs text-amber-600 mt-1">Return flight booking will be finalized later</p>
                          )}
                          {hasResolvedAirport && (
                            <p className="text-xs text-gray-500 mt-1">Tap to book</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                </button>
                  );
                })}

              </div>
            </div>
          </div>
        )}

        {/* Map Tab Content */}
        {activeTab === 'map' && (
          <div className="flex-1 overflow-y-auto pb-40 pt-[200px] px-4 py-4 max-w-md mx-auto">
            {getCitiesWithCoordinates.length === 0 ? (
              <div className="w-full h-[480px] bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-center px-6">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-base">Map not available for this itinerary.</p>
                      </div>
                      </div>
            ) : (
              <div className="relative w-full h-[480px] rounded-2xl overflow-hidden shadow-lg">
                <MapContainer
                  center={[getCitiesWithCoordinates[0].lat, getCitiesWithCoordinates[0].lng]}
                  zoom={getCitiesWithCoordinates.length === 1 ? 7 : 5}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  scrollWheelZoom={true}
                  className="w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Render markers for each city */}
                  {getCitiesWithCoordinates.map((city, index) => (
                    <Marker key={`${city.name}-${index}`} position={[city.lat, city.lng]}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{city.name}</p>
                          {index === 0 && <p className="text-xs text-gray-500 mt-1">Start</p>}
                          {index === getCitiesWithCoordinates.length - 1 && index > 0 && (
                            <p className="text-xs text-gray-500 mt-1">End</p>
                          )}
                      </div>
                      </Popup>
                    </Marker>
                  ))}
                  
                  {/* Render polyline connecting cities (only if more than one city) */}
                  {getCitiesWithCoordinates.length > 1 && (
                    <Polyline
                      positions={getCitiesWithCoordinates.map(city => [city.lat, city.lng])}
                      color="#FE4C40"
                      weight={3}
                      opacity={0.7}
                    />
                  )}
                </MapContainer>
                
                {/* Map Attribution Overlay */}
                <div className="absolute bottom-4 left-4 bg-white px-4 py-3 rounded-lg shadow-md z-[1000]">
                  <p className="text-gray-900 font-medium">{tripParams?.destination || 'Your Destination'}</p>
                <p className="text-xs text-gray-600 mt-1">{calculateDays()} day itinerary</p>
                  {getCitiesWithCoordinates.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getCitiesWithCoordinates.length} {getCitiesWithCoordinates.length === 1 ? 'city' : 'cities'}
                    </p>
                  )}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <div className="flex-1 overflow-y-auto pb-40 pt-[200px] px-4 py-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="mb-6">
                  <h2 className="text-2xl text-gray-900 mb-2">Trip Calendar</h2>
                  <p className="text-gray-600">View and manage your trip dates</p>
                </div>

                <div className="flex justify-center">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: tripParams?.dateRange?.from,
                      to: tripParams?.dateRange?.to,
                    }}
                    onSelect={(range: any) => {
                      if (range?.from) {
                        setSelectedDate(range.from);
                      }
                    }}
                    className="rounded-lg border-none"
                    numberOfMonths={1}
                  />
                </div>

                {/* Trip Details */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg text-gray-900 mb-4">Trip Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Start Date</span>
                      <span className="text-gray-900">
                        {tripParams?.dateRange?.from?.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">End Date</span>
                      <span className="text-gray-900">
                        {tripParams?.dateRange?.to?.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Duration</span>
                      <span className="text-gray-900">{calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Travelers</span>
                      <span className="text-gray-900">
                        {tripParams?.adults && `${tripParams.adults + (tripParams.kids || 0)} ${tripParams.adults + (tripParams.kids || 0) === 1 ? 'person' : 'people'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Activities Preview */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg text-gray-900 mb-4">Daily Schedule</h3>
                  <div className="space-y-3">
                    {days.map((day) => (
                      <div key={day.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-12 h-12 bg-[#FE4C40] rounded-lg flex items-center justify-center text-white">
                          {day.dayNumber}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900">{day.title}</p>
                          <p className="text-sm text-gray-600">{day.date}</p>
                          <p className="text-xs text-gray-500 mt-1">{day.activities.length} activities planned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
