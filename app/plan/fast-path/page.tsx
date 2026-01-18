"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { DestinationSelectionScreen, DestinationData } from '@/components/DestinationSelectionScreen';
import { Calendar } from 'lucide-react';
import { routes } from '@/lib/navigation';
import { saveTripState, getTripState, resetAllTripState } from '@/lib/tripState';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

export default function FastPathPage() {
  const router = useRouter();
  const [step, setStep] = useState<'destination' | 'dates'>('destination');
  const [destination, setDestination] = useState<DestinationData | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Reset trip state on mount for Fast Path
  useEffect(() => {
    resetAllTripState();
  }, []);

  const handleDestinationSelected = (dest: string | DestinationData) => {
    let destinationData: DestinationData;

    if (typeof dest === 'string') {
      destinationData = {
        type: 'searchPhrase',
        value: dest,
      };
    } else {
      destinationData = dest;
    }

    setDestination(destinationData);
    // Save destination to tripState
    saveTripState({
      destination: destinationData,
    });
    setStep('dates');
  };

  const handleDatesSelected = () => {
    if (!dateRange.from || !dateRange.to) {
      return; // Validation handled by UI
    }

    // Set defaults with assumed metadata
    const tripState = getTripState();
    saveTripState({
      ...tripState,
      destination: destination || tripState.destination,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      },
      // Fast Path defaults
      pace: 'moderate',
      styles: [], // Empty interests
      adults: 2,
      kids: 0,
      budget: undefined,
      budgetType: undefined,
      // Mark defaults as assumed
      assumed: {
        pace: true,
        styles: true,
        adults: true,
        kids: true,
        budget: true,
        budgetType: true,
      },
    });

    // Navigate directly to processing page
    router.push(routes.plan.processing);
  };

  const handleBack = () => {
    if (step === 'destination') {
      router.push(routes.home);
    } else {
      setStep('destination');
    }
  };

  // When showing destination step, match destination page exactly
  if (step === 'destination') {
    return (
      <>
        <main>
          <DestinationSelectionScreen
            onDestinationSelected={handleDestinationSelected}
            onBack={handleBack}
          />
        </main>
        <Footer />
      </>
    );
  }

  // Dates step
  return (
    <>
      <div className="fixed inset-0 bg-gray-900 -z-10" />
      <main className="min-h-[100dvh] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50">
        <StepHeader
          title="When are you traveling?"
          currentStep={2}
          totalSteps={2}
          onBack={handleBack}
        />

        <div className="flex-1 overflow-y-auto pt-[120px] pb-40">
          <div className="max-w-md mx-auto px-6">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  When are you traveling?
                </h2>
                <p className="text-gray-600">
                  Select your start and end dates
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#FE4C40]" />
                  </div>
                  <h3 className="text-gray-900">Travel Dates</h3>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full px-4 py-4 bg-gradient-to-r from-[#FFF5F4] to-white border-2 border-gray-200 rounded-xl text-left hover:border-[#FE4C40] transition-colors">
                      {dateRange.from && dateRange.to ? (
                        <div>
                          <span className="text-gray-900">
                            {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">Select your travel dates</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                      numberOfMonths={1}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <button
                onClick={handleDatesSelected}
                disabled={!dateRange.from || !dateRange.to}
                className="w-full h-14 bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-300/40 flex items-center justify-center gap-3 transition-all duration-300"
              >
                <span>Generate my trip</span>
              </button>

              <p className="text-xs text-gray-500 text-center">
                We&apos;ll create a personalized itinerary based on reasonable defaults. You can refine it later.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
