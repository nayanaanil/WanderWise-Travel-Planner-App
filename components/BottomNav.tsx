"use client";

import { useRouter, usePathname } from 'next/navigation';
import { Home, Compass, Briefcase, User } from 'lucide-react';

interface BottomNavProps {
  activeTab?: 'home' | 'inspire' | 'trips' | 'profile' | 'bookings';
}

export function BottomNav({ activeTab }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname if not provided
  const getActiveTab = (): 'home' | 'inspire' | 'trips' | 'profile' => {
    if (activeTab === 'bookings' || activeTab === 'trips') {
      // For booking flow, show trips as active
      return 'trips';
    }
    if (activeTab) {
      return activeTab;
    }
    // Auto-detect from pathname
    if (pathname === '/') return 'home';
    if (pathname === '/explore') return 'inspire';
    if (pathname?.startsWith('/bookings') || pathname?.startsWith('/trips')) return 'trips';
    if (pathname === '/profile') return 'profile';
    return 'home';
  };

  const currentTab = getActiveTab();

  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Home', path: '/' },
    { id: 'inspire' as const, icon: Compass, label: 'Inspire Me', path: '/explore' },
    { id: 'trips' as const, icon: Briefcase, label: 'My Trips', path: '/trips' },
    { id: 'profile' as const, icon: User, label: 'My Profile', path: '/profile' },
  ];

  const handleTabClick = (path: string) => {
    router.push(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className="flex flex-col items-center gap-1 py-1 px-3 transition-colors"
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'text-[#4AA3F2]' : 'text-[#6B7280]'}`}
                fill={isActive ? '#4AA3F2' : 'none'}
              />
              <span className={`text-xs ${isActive ? 'text-[#4AA3F2]' : 'text-[#6B7280]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}







