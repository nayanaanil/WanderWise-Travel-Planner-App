import { ArrowLeft, Bell } from 'lucide-react';
import wanderWiseLogo from 'figma:asset/1b200376c455c118fb8bad391df3d223f57fa606.png';

interface HeaderProps {
  onBack?: () => void;
  showNotifications?: boolean;
}

export function Header({ onBack, showNotifications = true }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#E5E7EB] z-40">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1 hover:bg-[#E5E7EB] rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#1F2937]" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E5E7EB] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#6B7280]" />
            </div>
            <span className="text-[#1F2937]">WanderWise</span>
          </div>
        </div>
        {showNotifications && (
          <button className="p-2 bg-[#FF6B6B] rounded-full hover:bg-[#ff5252] transition-colors">
            <Bell className="w-5 h-5 text-white" fill="white" />
          </button>
        )}
      </div>
    </header>
  );
}
