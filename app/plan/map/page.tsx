"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';
import { getCityCoordinates } from '../logistics/utils/cityCoordinates';
import { RouteReader, type RouteStep } from '@/lib/phase2/RouteReader';
import dynamic from 'next/dynamic';

// Dynamically import RouteMap to ensure it only loads on client (Leaflet requires browser APIs)
const RouteMap = dynamic(() => import('../logistics/components/RouteMap').then(mod => ({ default: mod.RouteMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl border-2 border-gray-200">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Loading map...</p>
      </div>
    </div>
  ),
});

/**
 * Map View Page
 * 
 * Dedicated page for viewing the trip route on an interactive map.
 * Shows all cities with numbered markers and route lines.
 */
export default function MapViewPage() {
  const router = useRouter();
  const [structuralRoute, setStructuralRoute] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  useEffect(() => {
    const tripState = getTripState();
    
    // Guard: Check phase is ROUTE_READY
    if (tripState.phase !== 'ROUTE_READY') {
      console.warn('[MapView] Phase is not ROUTE_READY, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    // Guard: Check for structuralRoute
    if (!tripState.structuralRoute) {
      console.warn('[MapView] No structuralRoute found, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    setStructuralRoute(tripState.structuralRoute);
    setIsHydrated(true);
  }, [router]);

  const handleBack = () => {
    router.push(routes.plan.logistics);
  };

  // Extract cities with coordinates for map
  const getMapCities = () => {
    if (!structuralRoute) return [];

    const cities: Array<{
      city: string;
      lat: number;
      lng: number;
      role: 'BASE' | 'OUTBOUND' | 'INBOUND';
    }> = [];

    const { outboundFlight, inboundFlight, groundRoute, derived } = structuralRoute;

    // Build set of cities that have stays (from draftStayCities - source of truth for stay eligibility)
    const stayCities = new Set<string>();
    const draftStayCitiesSet = new Set((derived.draftStayCities || []).map((c: string) => c.toLowerCase().trim()));
    
    // Only mark cities as BASE if they're in draftStayCities AND have valid dates
    for (const city in derived.arrivalDates) {
      const normalizedCity = city.toLowerCase().trim();
      if (!draftStayCitiesSet.has(normalizedCity)) {
        continue; // Not in original draft intent, don't mark as BASE
      }
      
      const arrivalDate = derived.arrivalDates[city];
      const departureDate = derived.departureDates[city];
      if (arrivalDate && departureDate && departureDate > arrivalDate) {
        stayCities.add(city);
      }
    }

    // Add outbound gateway
    const outboundCoords = getCityCoordinates(outboundFlight.toCity);
    if (outboundCoords) {
      cities.push({
        city: outboundFlight.toCity,
        lat: outboundCoords.lat,
        lng: outboundCoords.lng,
        role: stayCities.has(outboundFlight.toCity) ? 'BASE' : 'OUTBOUND',
      });
    }

    // Add all cities from ground route
    for (const leg of groundRoute) {
      // Add fromCity
      const fromCoords = getCityCoordinates(leg.fromCity);
      if (fromCoords && !cities.some(c => c.city === leg.fromCity)) {
        cities.push({
          city: leg.fromCity,
          lat: fromCoords.lat,
          lng: fromCoords.lng,
          role: stayCities.has(leg.fromCity) ? 'BASE' : 'OUTBOUND',
        });
      }

      // Add toCity
      const toCoords = getCityCoordinates(leg.toCity);
      if (toCoords && !cities.some(c => c.city === leg.toCity)) {
        cities.push({
          city: leg.toCity,
          lat: toCoords.lat,
          lng: toCoords.lng,
          role: stayCities.has(leg.toCity) ? 'BASE' : 'INBOUND',
        });
      }
    }

    // Add inbound gateway (if different from outbound)
    if (inboundFlight.fromCity !== outboundFlight.toCity) {
      const inboundCoords = getCityCoordinates(inboundFlight.fromCity);
      if (inboundCoords && !cities.some(c => c.city === inboundFlight.fromCity)) {
        cities.push({
          city: inboundFlight.fromCity,
          lat: inboundCoords.lat,
          lng: inboundCoords.lng,
          role: stayCities.has(inboundFlight.fromCity) ? 'BASE' : 'INBOUND',
        });
      }
    }

    return cities;
  };

  // Handle map marker click
  const handleMarkerClick = (city: string) => {
    setActiveCity(city);
  };

  // Extract ordered stops (cities with STAY steps) for button navigation
  const getOrderedStops = (): string[] => {
    if (!structuralRoute) return [];
    
    const reader = new RouteReader(structuralRoute);
    const steps = Array.from(reader.steps()) as RouteStep[];
    
    // Filter for STAY steps and extract city names in order
    const stops: string[] = [];
    for (const step of steps) {
      if (step.kind === 'STAY') {
        stops.push(step.city);
      }
    }
    
    return stops;
  };

  const orderedStops = getOrderedStops();

  // Handle stop button click
  const handleStopClick = (city: string) => {
    setActiveCity(city);
  };

  if (!isHydrated || !structuralRoute) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StepHeader
        title="Route Map"
        currentStep={6}
        totalSteps={10}
        onBack={handleBack}
      />

      <div className="min-h-[100dvh] pb-0 flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full px-6 py-6 pt-32 pb-20 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
            {/* Helper Text */}
            <div className="mb-4">
              <p className="text-sm text-[#6B7280] leading-relaxed">
                This is how your trip flows geographically.
              </p>
            </div>

            {/* Stop Navigation Buttons */}
            {orderedStops.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {orderedStops.map((city, index) => (
                    <React.Fragment key={city}>
                      <button
                        onClick={() => handleStopClick(city)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          activeCity === city
                            ? 'bg-[#FE4C40] text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40]'
                        }`}
                      >
                        {city}
                      </button>
                      {index < orderedStops.length - 1 && (
                        <span className="text-gray-400 flex-shrink-0">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            <div className="h-[calc(100dvh-240px)] min-h-[500px] mb-6">
              <RouteMap
                cities={getMapCities()}
                activeCity={activeCity}
                onMarkerClick={handleMarkerClick}
              />
            </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

