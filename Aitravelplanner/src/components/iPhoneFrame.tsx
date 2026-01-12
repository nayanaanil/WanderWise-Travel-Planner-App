import { ReactNode } from 'react';

interface IPhoneFrameProps {
  children: ReactNode;
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-8">
      {/* iPhone Device Frame */}
      <div className="relative w-full max-w-[390px] mx-auto">
        {/* Device Shadow */}
        <div className="absolute inset-0 bg-gray-400/10 rounded-[48px] blur-2xl"></div>
        
        {/* Device Body - Clean White Frame */}
        <div className="relative bg-white rounded-[48px] overflow-hidden shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
          {/* Screen Content */}
          <div className="relative bg-white w-full h-[844px] overflow-hidden">
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-white z-40 flex items-center justify-between px-6 pt-2">
              <div className="flex items-center gap-1">
                <span className="text-[15px]" style={{ fontWeight: 600 }}>9:41</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Signal */}
                <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                  <rect width="3" height="12" rx="1" fill="currentColor" opacity="0.4"/>
                  <rect x="5" width="3" height="12" rx="1" fill="currentColor" opacity="0.4"/>
                  <rect x="10" width="3" height="12" rx="1" fill="currentColor" opacity="0.7"/>
                  <rect x="15" width="2" height="12" rx="1" fill="currentColor"/>
                </svg>
                {/* WiFi */}
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="ml-1">
                  <path d="M8 12C8.73638 12 9.33333 11.403 9.33333 10.6667C9.33333 9.93029 8.73638 9.33333 8 9.33333C7.26362 9.33333 6.66667 9.93029 6.66667 10.6667C6.66667 11.403 7.26362 12 8 12Z" fill="currentColor"/>
                  <path d="M8 7.33333C9.47276 7.33333 10.8145 7.87838 11.8284 8.77778C12.0952 9.01515 12.5048 9.01515 12.7716 8.77778C13.0383 8.54041 13.0383 8.17172 12.7716 7.93434C11.4379 6.74747 9.72414 6 8 6C6.27586 6 4.56207 6.74747 3.22843 7.93434C2.96168 8.17172 2.96168 8.54041 3.22843 8.77778C3.49517 9.01515 3.90484 9.01515 4.17158 8.77778C5.18547 7.87838 6.52724 7.33333 8 7.33333Z" fill="currentColor"/>
                  <path d="M8 2C10.7614 2 13.3793 3.03535 15.4142 4.82828C15.681 5.06566 16.0906 5.06566 16.3574 4.82828C16.6241 4.59091 16.6241 4.22222 16.3574 3.98485C14.0103 1.91919 11.0345 0.666667 8 0.666667C4.96552 0.666667 1.98966 1.91919 -0.357421 3.98485C-0.624167 4.22222 -0.624167 4.59091 -0.357421 4.82828C-0.0906755 5.06566 0.318996 5.06566 0.585742 4.82828C2.62069 3.03535 5.23862 2 8 2Z" fill="currentColor"/>
                </svg>
                {/* Battery */}
                <svg width="25" height="12" viewBox="0 0 25 12" fill="none" className="ml-1">
                  <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.4"/>
                  <path opacity="0.4" d="M23 4V8C23.8047 7.66122 24.3333 6.87313 24.3333 6C24.3333 5.12687 23.8047 4.33878 23 4Z" fill="currentColor"/>
                  <rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor"/>
                </svg>
              </div>
            </div>
            
            {/* App Content - Scrollable */}
            <div className="w-full h-full overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}