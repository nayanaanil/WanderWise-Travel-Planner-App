import { useState } from 'react';
import { SlidersHorizontal, Calendar, Plus, CheckCircle2 } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { ActivityCard } from './ActivityCard';
import { FilterSheet } from './FilterSheet';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface AdditionalBookingsScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function AdditionalBookingsScreen({ onBack, onComplete }: AdditionalBookingsScreenProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const activities = [
    {
      id: '1',
      name: 'Ocean Avenue Art Walk',
      image: 'https://images.unsplash.com/photo-1628371217613-714161455f6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY3ViYSUyMGRpdmluZyUyMGFkdmVudHVyZXxlbnwxfHx8fDE3NjIxNTEyNDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      duration: '2 hours',
      category: 'Culture',
      location: 'Downtown Carmel',
      price: 45,
      groupSize: 'Up to 15 people',
    },
    {
      id: '2',
      name: 'Wine Tasting at Carmel Valley',
      image: 'https://images.unsplash.com/photo-1687877954846-00876ced28bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW5lJTIwdGFzdGluZyUyMHRvdXJ8ZW58MXx8fHwxNzYyMTgyMzIyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      duration: '4 hours',
      category: 'Food & Drink',
      location: 'Carmel Valley',
      price: 125,
      groupSize: 'Up to 12 people',
    },
    {
      id: '3',
      name: 'Coastal Kayaking Tour',
      image: 'https://images.unsplash.com/photo-1628371217613-714161455f6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY3ViYSUyMGRpdmluZyUyMGFkdmVudHVyZXxlbnwxfHx8fDE3NjIxNTEyNDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      duration: '3 hours',
      category: 'Adventure',
      location: 'Carmel Beach',
      price: 85,
      groupSize: 'Up to 8 people',
    },
  ];

  const tickets = [
    {
      id: 't1',
      name: 'Point Lobos State Reserve Entry',
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHJlc29ydHxlbnwxfHx8fDE3NjIxNTUwMzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      duration: 'Full day access',
      category: 'Sightseeing',
      location: 'Point Lobos',
      price: 10,
      groupSize: '1 person',
    },
  ];

  const handleActivityToggle = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const isActivitySelected = (activityId: string) => selectedActivities.includes(activityId);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <Header onBack={onBack} />
      
      <div className="pt-16 px-4 max-w-md mx-auto">
        {/* Trip Info */}
        <div className="mt-6 mb-6">
          <h1 className="text-[#1F2937] mb-2">Add Activities & Tickets</h1>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Calendar className="w-4 h-4" />
            <span>Carmel-by-the-Sea</span>
          </div>
          <div className="text-[#6B7280] mt-1">
            Jan 13-14, 2025
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-[#E5E7EB]">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <div className="text-[#6B7280] mb-1">Flight</div>
                <div className="text-[#1F2937]">United Airlines UA 1234</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#4AA3F2]" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#6B7280] mb-1">Accommodation</div>
                <div className="text-[#1F2937]">The Cypress Inn</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#4AA3F2]" />
            </div>
          </div>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(true)}
          className="w-full mb-6 border-[#E5E7EB] text-[#1F2937] flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </Button>

        {/* Tabs for Activities and Tickets */}
        <Tabs defaultValue="activities" className="mb-6">
          <TabsList className="w-full mb-6 bg-[#E5E7EB]">
            <TabsTrigger value="activities" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-[#4AA3F2]">
              Activities
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-[#4AA3F2]">
              Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="relative">
                  {isActivitySelected(activity.id) && (
                    <div className="absolute top-3 right-3 z-10 bg-[#4AA3F2] rounded-full p-1">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <ActivityCard
                    {...activity}
                    onSelect={() => handleActivityToggle(activity.id)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="relative">
                  {isActivitySelected(ticket.id) && (
                    <div className="absolute top-3 right-3 z-10 bg-[#4AA3F2] rounded-full p-1">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <ActivityCard
                    {...ticket}
                    onSelect={() => handleActivityToggle(ticket.id)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Continue Button */}
        <div className="fixed bottom-20 left-0 right-0 px-4 py-4 bg-white border-t border-[#E5E7EB]">
          <div className="max-w-md mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-[#4AA3F2] text-[#4AA3F2]"
              onClick={onComplete}
            >
              Skip for Now
            </Button>
            <Button
              className="flex-1 bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
              onClick={onComplete}
              disabled={selectedActivities.length === 0}
            >
              Continue ({selectedActivities.length})
            </Button>
          </div>
        </div>
      </div>

      <BottomNav activeTab="trips" />
      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        type="activities"
      />
    </div>
  );
}
