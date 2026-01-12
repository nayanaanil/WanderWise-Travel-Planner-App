"use client";

import { ImageWithFallback } from '@/components/ImageWithFallback';
import { useState } from 'react';
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
  ChevronLeft
} from 'lucide-react';
import { Switch } from '@/ui/switch';
import { Calendar as CalendarComponent } from '@/ui/calendar';
import { StepHeader } from '@/components/StepHeader';

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

interface ItineraryPlannerScreenProps {
  bookedItems?: BookedItem[];
  onAddToTrip?: (item: any, category: string) => void;
  tripParams?: TripParams;
  onSave?: () => void;
}

export function ItineraryPlannerScreen({ bookedItems = [], onAddToTrip, tripParams, onSave }: ItineraryPlannerScreenProps) {
  const router = useRouter();
  
  // Calculate number of days from trip params
  const calculateDays = () => {
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
  const [days, setDays] = useState<Day[]>(generateInitialDays());
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'calendar'>('itinerary');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(tripParams?.dateRange?.from || new Date());
  const [expandedStyle, setExpandedStyle] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('balanced');

  // Generate itinerary based on style
  const generateStyleItinerary = (style: string): Day[] => {
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

  const toggleStyle = (styleId: string) => {
    if (expandedStyle === styleId) {
      setExpandedStyle(null);
    } else {
      setExpandedStyle(styleId);
      setSelectedStyle(styleId);
      // Update the main days with the selected style's itinerary
      setDays(generateStyleItinerary(styleId));
    }
  };

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
    <div className="min-h-screen bg-white pb-20">
      <StepHeader
        title={`${calculateDays()} ${calculateDays() === 1 ? 'Day' : 'Days'} in ${tripParams?.destination || 'Your Destination'}`}
        currentStep={5}
        totalSteps={9}
        onBack={() => router.push(routes.plan.destination)}
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
                <>
                  <span>{tripParams.adults + (tripParams.kids || 0)} {tripParams.adults + (tripParams.kids || 0) === 1 ? 'traveler' : 'travelers'}</span>
                  <span>•</span>
                </>
              )}
              {tripParams?.budget && (
                <span className="text-[#205A5D]">
                  ₹{(parseInt(tripParams.budget) / 1000).toFixed(0)}k Budget
                </span>
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
          <div className="px-4 py-4 pt-[200px] overflow-y-auto max-h-[calc(100vh-200px)] max-w-md mx-auto">
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

            {/* Explore Your Style Section - MOVED TO TOP */}
            <div className="mb-8">
              <div className="mb-6">
                <h2 className="text-lg text-gray-900 mb-2">Explore your style</h2>
                <p className="text-sm text-gray-600">Discover different ways to experience {tripParams?.destination || 'your destination'}</p>
              </div>

              <div className="space-y-4">
                {/* Balanced Style */}
                <div className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${selectedStyle === 'balanced' ? 'ring-4 ring-[#FE4C40]' : ''}`}>
                  <div 
                    onClick={() => toggleStyle('balanced')}
                    className="relative h-48 cursor-pointer"
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1642287040066-2bd340523289?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwYXJjaGl0ZWN0dXJlJTIwbmlnaHR8ZW58MXx8fHwxNzYzMTQwNTMyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Balanced itinerary"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                    
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-start justify-between">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <span className="opacity-90">Top Attractions</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Local Life</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Hidden Gems</span>
                          </div>
                          <h3 className="text-2xl mb-1">BALANCED</h3>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Sparkles className="w-4 h-4" />
                            <span>{calculateDays()} Days</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4">
                    <p className="text-gray-600 text-sm mb-3">Perfect mix of must-sees and hidden gems</p>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-900">
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 0.9 / 1000).toFixed(0) : '40'}k</span>
                        <span className="text-gray-600"> - </span>
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 1.1 / 1000).toFixed(0) : '55'}k</span>
                        <span className="text-gray-600 text-sm ml-2">per person</span>
                      </div>
                      <button
                        onClick={() => toggleStyle('balanced')}
                        className="px-4 py-2 bg-[#FE4C40] text-white rounded-lg hover:bg-[#E63C30] transition-colors text-sm"
                      >
                        {expandedStyle === 'balanced' ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Itinerary */}
                  {expandedStyle === 'balanced' && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="p-4">
                        <h3 className="text-gray-900 mb-4">Detailed {calculateDays()}-Day Itinerary</h3>
                        <div className="space-y-3">
                          {generateStyleItinerary('balanced').map((day) => (
                            <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[#FE4C40]">Day {day.dayNumber}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-900">{day.title}</span>
                              </div>
                              <div className="space-y-3">
                                {day.activities.map((activity) => (
                                  <div key={activity.id} className="flex items-start gap-3">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#FE4C40] rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-1">
                                        {getActivityIcon(activity.type)}
                                        <p className="text-sm text-gray-900 flex-1">{activity.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{activity.time}</span>
                                      </div>
                                      {activity.distance && (
                                        <p className="text-xs text-gray-400">↕ {activity.distance}</p>
                                      )}
                                    </div>
                                    <button className="text-gray-400 hover:text-[#FE4C40] transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button className="flex items-center gap-2 text-[#FE4C40] text-sm mt-4 hover:text-[#E63C30] transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Relaxed Style */}
                <div className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${selectedStyle === 'relaxed' ? 'ring-4 ring-[#FE4C40]' : ''}`}>
                  <div 
                    onClick={() => toggleStyle('relaxed')}
                    className="relative h-48 cursor-pointer"
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1735151055127-73c610ae901f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMHplbiUyMGdhcmRlbnxlbnwxfHx8fDE3NjMwODI1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Relaxed itinerary"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                    
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-start justify-between">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <span className="opacity-90">Leisure Time</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Slow Travel</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Wellness</span>
                          </div>
                          <h3 className="text-2xl mb-1">RELAXED</h3>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Coffee className="w-4 h-4" />
                            <span>{calculateDays()} Days</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4">
                    <p className="text-gray-600 text-sm mb-3">Slow-paced journey with plenty of downtime</p>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-900">
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 0.8 / 1000).toFixed(0) : '35'}k</span>
                        <span className="text-gray-600"> - </span>
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 0.95 / 1000).toFixed(0) : '48'}k</span>
                        <span className="text-gray-600 text-sm ml-2">per person</span>
                      </div>
                      <button
                        onClick={() => toggleStyle('relaxed')}
                        className="px-4 py-2 bg-[#FE4C40] text-white rounded-lg hover:bg-[#E63C30] transition-colors text-sm"
                      >
                        {expandedStyle === 'relaxed' ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Itinerary */}
                  {expandedStyle === 'relaxed' && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="p-4">
                        <h3 className="text-gray-900 mb-4">Detailed {calculateDays()}-Day Itinerary</h3>
                        <div className="space-y-3">
                          {generateStyleItinerary('relaxed').map((day) => (
                            <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[#FE4C40]">Day {day.dayNumber}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-900">{day.title}</span>
                              </div>
                              <div className="space-y-3">
                                {day.activities.map((activity) => (
                                  <div key={activity.id} className="flex items-start gap-3">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#FE4C40] rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-1">
                                        {getActivityIcon(activity.type)}
                                        <p className="text-sm text-gray-900 flex-1">{activity.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{activity.time}</span>
                                      </div>
                                      {activity.distance && (
                                        <p className="text-xs text-gray-400">↕ {activity.distance}</p>
                                      )}
                                    </div>
                                    <button className="text-gray-400 hover:text-[#FE4C40] transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button className="flex items-center gap-2 text-[#FE4C40] text-sm mt-4 hover:text-[#E63C30] transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Premium Experience Style */}
                <div className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${selectedStyle === 'premium' ? 'ring-4 ring-[#FE4C40]' : ''}`}>
                  <div 
                    onClick={() => toggleStyle('premium')}
                    className="relative h-48 cursor-pointer"
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1729708475316-88ec2dc0083e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXNvcnQlMjBiZWFjaHxlbnwxfHx8fDE3NjMxODQ5OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Premium itinerary"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                    
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-start justify-between">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <span className="opacity-90">Luxury Stays</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Fine Dining</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">VIP Access</span>
                          </div>
                          <h3 className="text-2xl mb-1">PREMIUM</h3>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Sparkles className="w-4 h-4" />
                            <span>{calculateDays()} Days</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1729708475316-88ec2dc0083e?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4">
                    <p className="text-gray-600 text-sm mb-3">Luxury experiences and exclusive access</p>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-900">
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 1.5 / 1000).toFixed(0) : '75'}k</span>
                        <span className="text-gray-600"> - </span>
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 2 / 1000).toFixed(0) : '100'}k</span>
                        <span className="text-gray-600 text-sm ml-2">per person</span>
                      </div>
                      <button
                        onClick={() => toggleStyle('premium')}
                        className="px-4 py-2 bg-[#FE4C40] text-white rounded-lg hover:bg-[#E63C30] transition-colors text-sm"
                      >
                        {expandedStyle === 'premium' ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Itinerary */}
                  {expandedStyle === 'premium' && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="p-4">
                        <h3 className="text-gray-900 mb-4">Detailed {calculateDays()}-Day Itinerary</h3>
                        <div className="space-y-3">
                          {generateStyleItinerary('premium').map((day) => (
                            <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[#FE4C40]">Day {day.dayNumber}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-900">{day.title}</span>
                              </div>
                              <div className="space-y-3">
                                {day.activities.map((activity) => (
                                  <div key={activity.id} className="flex items-start gap-3">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#FE4C40] rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-1">
                                        {getActivityIcon(activity.type)}
                                        <p className="text-sm text-gray-900 flex-1">{activity.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{activity.time}</span>
                                      </div>
                                      {activity.distance && (
                                        <p className="text-xs text-gray-400">↕ {activity.distance}</p>
                                      )}
                                    </div>
                                    <button className="text-gray-400 hover:text-[#FE4C40] transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button className="flex items-center gap-2 text-[#FE4C40] text-sm mt-4 hover:text-[#E63C30] transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Explorer Style */}
                <div className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${selectedStyle === 'explorer' ? 'ring-4 ring-[#FE4C40]' : ''}`}>
                  <div 
                    onClick={() => toggleStyle('explorer')}
                    className="relative h-48 cursor-pointer"
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1603741614953-4187ed84cc50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGhpa2luZyUyMGFkdmVudHVyZXxlbnwxfHx8fDE3NjMxMTMwMzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Explorer itinerary"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                    
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-start justify-between">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <span className="opacity-90">Adventure</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Off-Path</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-90">Active</span>
                          </div>
                          <h3 className="text-2xl mb-1">EXPLORER</h3>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Compass className="w-4 h-4" />
                            <span>{calculateDays()} Days</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1603741614953-4187ed84cc50?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=100"
                              alt="Activity preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4">
                    <p className="text-gray-600 text-sm mb-3">Action-packed adventure with unique experiences</p>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-900">
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 1.1 / 1000).toFixed(0) : '55'}k</span>
                        <span className="text-gray-600"> - </span>
                        <span className="text-lg">₹{tripParams?.budget ? (parseInt(tripParams.budget) * 1.3 / 1000).toFixed(0) : '65'}k</span>
                        <span className="text-gray-600 text-sm ml-2">per person</span>
                      </div>
                      <button
                        onClick={() => toggleStyle('explorer')}
                        className="px-4 py-2 bg-[#FE4C40] text-white rounded-lg hover:bg-[#E63C30] transition-colors text-sm"
                      >
                        {expandedStyle === 'explorer' ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Itinerary */}
                  {expandedStyle === 'explorer' && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="p-4">
                        <h3 className="text-gray-900 mb-4">Detailed {calculateDays()}-Day Itinerary</h3>
                        <div className="space-y-3">
                          {generateStyleItinerary('explorer').map((day) => (
                            <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[#FE4C40]">Day {day.dayNumber}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-900">{day.title}</span>
                              </div>
                              <div className="space-y-3">
                                {day.activities.map((activity) => (
                                  <div key={activity.id} className="flex items-start gap-3">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                      <ImageWithFallback
                                        src={activity.image}
                                        alt={activity.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#FE4C40] rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-1">
                                        {getActivityIcon(activity.type)}
                                        <p className="text-sm text-gray-900 flex-1">{activity.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{activity.time}</span>
                                      </div>
                                      {activity.distance && (
                                        <p className="text-xs text-gray-400">↕ {activity.distance}</p>
                                      )}
                                    </div>
                                    <button className="text-gray-400 hover:text-[#FE4C40] transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button className="flex items-center gap-2 text-[#FE4C40] text-sm mt-4 hover:text-[#E63C30] transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Itinerary Section - NOW AFTER EXPLORE YOUR STYLE */}
            <div className="mb-6 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-gray-900">Detailed Itinerary <span className="text-gray-600 text-sm">{calculateDays()} days</span></h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Distances</span>
                  <Switch checked={showDistances} onCheckedChange={setShowDistances} />
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Days List */}
              <div className="space-y-4">
                {days.map((day) => (
                  <div key={day.id} className="border border-gray-200 rounded-xl overflow-hidden">
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
                        <span className="text-base flex-shrink-0">🏖️</span>
                        <span className="text-gray-900 text-sm truncate">{day.title}</span>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-600 hidden sm:inline">{day.date}</span>
                        <button 
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Day Activities */}
                    {day.isExpanded && (
                      <div className="px-4 py-3 space-y-3">
                        {day.activities.map((activity, index) => (
                          <div key={activity.id} className="relative">
                            {/* Vertical Timeline Line */}
                            {index < day.activities.length - 1 && (
                              <div className="absolute left-8 top-16 bottom-0 w-px border-l-2 border-dashed border-gray-300" />
                            )}
                            
                            <div className="flex items-start gap-4 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors group relative">
                              {/* Activity Image with Timeline Dot */}
                              <div className="flex-shrink-0 relative">
                                <ImageWithFallback
                                  src={activity.image}
                                  alt={activity.name}
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                                />
                                {/* Timeline Dot */}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FE4C40] rounded-full border-2 border-white flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                              </div>

                              {/* Activity Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                                  <h4 className="text-gray-900 text-base font-semibold">{activity.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  <span>{activity.time}</span>
                                </div>
                                {showDistances && activity.distance && index < day.activities.length - 1 && (
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                    <span>↓ {activity.distance}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteActivity(day.id, activity.id)}
                                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Activity Button */}
                        <button
                          onClick={() => addActivity(day.id)}
                          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-gray-600 hover:border-[#205A5D] hover:text-[#205A5D] hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">Add Activity</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Day */}
                <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-600 hover:border-[#205A5D] hover:text-[#205A5D] hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Day</span>
                </button>

                {/* Go to Bookings Button */}
                <button onClick={() => router.push("/bookings/customize")} className="w-full py-4 bg-[#FE4C40] text-white rounded-xl hover:bg-[#E63C30] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg mt-4">
                  <span>Go to Bookings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Tab Content */}
        {activeTab === 'map' && (
          <div className="px-4 py-6 pt-[200px] h-[calc(100vh-200px)]">
            <div className="w-full h-full bg-gradient-to-br from-blue-100 via-green-50 to-gray-100 rounded-2xl overflow-hidden relative shadow-lg">
              {/* Simulated Map */}
              <div className="absolute inset-0">
                <div className="relative w-full h-full">
                  {/* Map Grid Background */}
                  <svg className="w-full h-full opacity-10" viewBox="0 0 100 100">
                    <defs>
                      <pattern id="grid-map" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid-map)" />
                  </svg>

                  {/* Location Markers */}
                  <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#FE4C40] rounded-full shadow-xl flex items-center justify-center border-3 border-white cursor-pointer hover:scale-110 transition-transform">
                        <span className="text-white">1</span>
                      </div>
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                        <p className="font-medium text-gray-900">Local Bakery</p>
                        <p className="text-xs text-gray-600">9:00 AM</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#FE4C40] rounded-full shadow-xl flex items-center justify-center border-3 border-white cursor-pointer hover:scale-110 transition-transform">
                        <span className="text-white">2</span>
                      </div>
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                        <p className="font-medium text-gray-900">Main Street</p>
                        <p className="text-xs text-gray-600">10:00 AM</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-2/3 right-1/3 transform translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#FE4C40] rounded-full shadow-xl flex items-center justify-center border-3 border-white cursor-pointer hover:scale-110 transition-transform">
                        <span className="text-white">3</span>
                      </div>
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                        <p className="font-medium text-gray-900">Beach Walk</p>
                        <p className="text-xs text-gray-600">5:00 PM</p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="33%" y1="25%" x2="50%" y2="33%" stroke="#205A5D" strokeWidth="3" strokeDasharray="8,4" opacity="0.6"/>
                    <line x1="50%" y1="33%" x2="67%" y2="67%" stroke="#205A5D" strokeWidth="3" strokeDasharray="8,4" opacity="0.6"/>
                  </svg>
                </div>
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button className="p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <MapIcon className="w-5 h-5 text-gray-700" />
                </button>
                <button className="p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Map Attribution */}
              <div className="absolute bottom-4 left-4 bg-white px-4 py-3 rounded-lg shadow-md">
                <p className="text-gray-900">{tripParams?.destination || 'Your Destination'}</p>
                <p className="text-xs text-gray-600 mt-1">{calculateDays()} day itinerary</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <div className="px-4 py-6 pt-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
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