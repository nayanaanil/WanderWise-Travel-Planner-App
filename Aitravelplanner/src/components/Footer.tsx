import { Home, Sparkles, Briefcase, User } from 'lucide-react';

interface FooterProps {
  activeTab: 'home' | 'inspire' | 'trips' | 'profile';
  onHomeClick: () => void;
  onInspireClick: () => void;
  onTripsClick: () => void;
  onProfileClick: () => void;
}

export function Footer({ activeTab, onHomeClick, onInspireClick, onTripsClick, onProfileClick }: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto py-2">
        <button
          onClick={onHomeClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'home' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>
        
        <button
          onClick={onInspireClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'inspire' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-xs">Inspire Me</span>
        </button>
        
        <button
          onClick={onTripsClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'trips' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Briefcase className="w-6 h-6" />
          <span className="text-xs">My Trips</span>
        </button>
        
        <button
          onClick={onProfileClick}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'profile' ? 'text-[#FE4C40]' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">My Profile</span>
        </button>
      </div>
    </footer>
  );
}