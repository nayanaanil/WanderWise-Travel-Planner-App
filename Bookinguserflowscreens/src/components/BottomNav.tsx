import { Home, Compass, Briefcase, User } from 'lucide-react';

interface BottomNavProps {
  activeTab?: string;
}

export function BottomNav({ activeTab = 'trips' }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'inspire', icon: Compass, label: 'Inspire Me' },
    { id: 'trips', icon: Briefcase, label: 'My Trips' },
    { id: 'profile', icon: User, label: 'My Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className="flex flex-col items-center gap-1 py-1 px-3 transition-colors"
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'text-[#4AA3F2]' : 'text-[#6B7280]'}`}
                fill={isActive ? '#4AA3F2' : 'none'}
              />
              <span className={`${isActive ? 'text-[#4AA3F2]' : 'text-[#6B7280]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
