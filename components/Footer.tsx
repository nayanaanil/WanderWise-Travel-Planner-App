"use client";

import { useRouter, usePathname } from 'next/navigation';
import { Home, Sparkles, Briefcase, User } from 'lucide-react';

interface FooterProps {
  activeTab?: 'home' | 'inspire' | 'trips' | 'profile';
  onHomeClick?: () => void;
  onInspireClick?: () => void;
  onTripsClick?: () => void;
  onProfileClick?: () => void;
}

export function Footer({ activeTab, onHomeClick, onInspireClick, onTripsClick, onProfileClick }: FooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab from pathname if not provided
  const getActiveTab = () => {
    if (activeTab) return activeTab;
    if (pathname === '/') return 'home';
    if (pathname === '/explore') return 'inspire';
    if (pathname === '/trips') return 'trips';
    if (pathname === '/profile') return 'profile';
    return 'home';
  };
  
  const currentTab = getActiveTab();
  
  // Apply pastel gradient background for destination, timing, duration, pace, locations, processing, itinerary, logistics, map, and flight options pages
  const isDestinationPage = pathname === '/plan/destination';
  const isTimingPage = pathname === '/plan/timing';
  const isDurationPage = pathname === '/plan/duration';
  const isPacePage = pathname === '/plan/pace';
  const isLocationsPage = pathname === '/plan/locations';
  const isProcessingPage = pathname === '/plan/processing';
  const isItineraryPage = pathname === '/plan/itinerary';
  const isLogisticsPage = pathname === '/plan/logistics';
  const isMapPage = pathname === '/plan/map';
  const isFlightOptionsPage = pathname === '/bookings/flights/options';
  const isBookingsPage = pathname === '/bookings';
  const isProfilePage = pathname === '/profile';
  
  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      router.push('/');
    }
  };
  
  const handleInspireClick = () => {
    if (onInspireClick) {
      onInspireClick();
    } else {
      router.push('/explore');
    }
  };
  
  const handleTripsClick = () => {
    if (onTripsClick) {
      onTripsClick();
    } else {
      router.push('/trips');
    }
  };
  
  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      router.push('/profile');
    }
  };
  
  return (
    <footer className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 ${(isDestinationPage || isTimingPage || isDurationPage || isPacePage || isLocationsPage || isProcessingPage || isItineraryPage || isLogisticsPage || isMapPage || isFlightOptionsPage || isBookingsPage || isProfilePage) ? 'bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 border-t border-orange-100/50' : 'bg-white border-t border-gray-100'} shadow-lg`}>
      <div className="flex items-center justify-around py-2">
        <button
          onClick={handleHomeClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'home' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>
        
        <button
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'inspire' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-xs">Inspire Me</span>
        </button>
        
        <button
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'trips' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Briefcase className="w-6 h-6" />
          <span className="text-xs">My Trips</span>
        </button>
        
        <button
          onClick={handleProfileClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'profile' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">My Profile</span>
        </button>
      </div>
    </footer>
  );
}

