"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';
import { CheckCircle, MapPin, Calendar, Train, Building2, Plane, ArrowRight } from 'lucide-react';

export default function SummaryPage() {
  const router = useRouter();
  const [finalItinerary, setFinalItinerary] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const state = getTripState();
    
    if (!state.finalItinerary) {
      router.push(routes.plan.itinerary);
      return;
    }

    setFinalItinerary(state.finalItinerary);
    setIsHydrated(true);
  }, [router]);

  const handleBackToDashboard = () => {
    router.push(routes.bookings.dashboard);
  };

  // Format date range
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDateRange = () => {
    if (!finalItinerary?.dateRange?.from || !finalItinerary?.dateRange?.to) return null;
    
    const from = finalItinerary.dateRange.from instanceof Date 
      ? finalItinerary.dateRange.from 
      : new Date(finalItinerary.dateRange.from);
    const to = finalItinerary.dateRange.to instanceof Date 
      ? finalItinerary.dateRange.to 
      : new Date(finalItinerary.dateRange.to);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
    
    return { from, to };
  };

  const dateRange = getDateRange();
  const dateRangeText = dateRange
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    : 'Dates not set';

  // Calculate counts
  const transportCount = finalItinerary?.selectedTransport 
    ? Object.keys(finalItinerary.selectedTransport).length 
    : 0;
  
  const hotelsCount = finalItinerary?.selectedHotels 
    ? Object.keys(finalItinerary.selectedHotels).length 
    : 0;
  
  const hasFlights = finalItinerary?.selectedFlights?.outbound || finalItinerary?.selectedFlights?.return;

  if (!isHydrated || !finalItinerary) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[100dvh] bg-white">
        <div className="flex-1 overflow-y-auto pb-32 pt-[80px] px-4 max-w-md mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Trip Is Ready!</h1>
            <p className="text-lg text-gray-600">Here&apos;s your final itinerary summary.</p>
          </div>

          {/* Summary Cards */}
          <div className="space-y-4">
            {/* Destination and Dates Card */}
            <div className="bg-gradient-to-br from-[#FE4C40] to-[#FF6B5A] rounded-2xl p-6 text-white shadow-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">Destination</p>
                    <p className="font-semibold text-lg">
                      {finalItinerary.destination?.label || finalItinerary.destination?.value || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">Travel Dates</p>
                    <p className="font-semibold">{dateRangeText}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cities Card */}
            {finalItinerary.draftItinerary?.cities && finalItinerary.draftItinerary.cities.length > 0 && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#FE4C40]" />
                  <h3 className="text-lg font-semibold text-gray-900">Cities</h3>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {finalItinerary.draftItinerary.cities.map((city: any, index: number) => (
                    <span key={index} className="flex items-center gap-1">
                      <span className="font-medium text-gray-900">{city.name}</span>
                      {index < finalItinerary.draftItinerary.cities.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transport Summary Card */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Train className="w-5 h-5 text-[#FE4C40]" />
                <h3 className="text-lg font-semibold text-gray-900">Transport</h3>
              </div>
              <p className="text-gray-700">
                {transportCount > 0 
                  ? `${transportCount} segment${transportCount !== 1 ? 's' : ''} selected`
                  : 'No transport selected'}
              </p>
            </div>

            {/* Hotels Summary Card */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-[#FE4C40]" />
                <h3 className="text-lg font-semibold text-gray-900">Accommodation</h3>
              </div>
              <p className="text-gray-700">
                {hotelsCount > 0 
                  ? `${hotelsCount} hotel${hotelsCount !== 1 ? 's' : ''} selected`
                  : 'No hotels selected'}
              </p>
            </div>

            {/* Flights Summary Card (conditional) */}
            {hasFlights && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-5 h-5 text-[#FE4C40]" />
                  <h3 className="text-lg font-semibold text-gray-900">Flights</h3>
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  {finalItinerary.selectedFlights?.outbound && (
                    <p>✓ Outbound flight selected</p>
                  )}
                  {finalItinerary.selectedFlights?.return && (
                    <p>✓ Return flight selected</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Back to Dashboard Button */}
          <div className="mt-8">
            <button
              onClick={handleBackToDashboard}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
