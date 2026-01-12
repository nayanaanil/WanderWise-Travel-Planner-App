"use client";

import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
  onChatClick?: () => void;
}

export function Header({ onLogoClick, onChatClick }: HeaderProps) {
  const router = useRouter();
  
  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      router.push('/');
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="text-2xl">🧭</div>
          <span className="text-xl tracking-tight text-gray-900">WanderWise</span>
        </button>
        
        <button
          onClick={onChatClick}
          className="relative p-2 bg-gray-900 hover:bg-black rounded-full transition-colors shadow-lg"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-white" />
          {/* Notification Badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#FE4C40] rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
            3
          </span>
        </button>
      </div>
    </header>
  );
}

