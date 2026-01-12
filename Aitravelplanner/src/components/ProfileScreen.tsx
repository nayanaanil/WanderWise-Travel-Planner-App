import { ChevronRight, User, LogOut } from 'lucide-react';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  return (
    <div className="min-h-screen pt-16 pb-20 bg-white">
      <div className="max-w-md mx-auto">
        {/* Profile Header */}
        <div className="px-6 py-6 bg-gradient-to-br from-[#FFF5F4]/50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FE4C40] to-[#E63C30] flex items-center justify-center text-white"
              style={{ fontSize: '28px', fontWeight: 700 }}
            >
              JD
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 mb-1" style={{ fontSize: '24px', fontWeight: 600 }}>
                John Doe
              </h2>
              <p className="text-gray-600" style={{ fontSize: '14px' }}>
                john@example.com
              </p>
            </div>
          </div>
          <button 
            className="w-full py-3 bg-white text-gray-900 rounded-xl border border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40] transition-all"
            style={{ fontSize: '16px', fontWeight: 600 }}
          >
            Edit Profile
          </button>
        </div>

        {/* Travel Preferences */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Travel Preferences
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Travel Style</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Preferred Airlines</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Dietary Preferences</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Saved Items */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Saved Items
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Saved Destinations</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Saved Itineraries</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Documents
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Passport (upload/view)</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Visa (upload/view)</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Vaccination Records</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Account Settings
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Language</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Currency</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Notifications</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Privacy & Permissions</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Trip History */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Trip History
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Past trips</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Billing & Payments */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Billing & Payments
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Saved cards</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Subscription</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="px-6 py-4">
          <h3 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: 600 }}>
            Support
          </h3>
          <div 
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Help Center</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <span className="text-gray-900" style={{ fontSize: '16px' }}>Contact Support</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <div className="p-4 flex items-center justify-center gap-4 text-sm text-gray-600">
              <button className="hover:text-[#FE4C40] transition-colors">T&C</button>
              <span>|</span>
              <button className="hover:text-[#FE4C40] transition-colors">Privacy Policy</button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="px-6 py-4 pb-8">
          <button 
            onClick={onLogout}
            className="w-full py-4 bg-white text-[#FE4C40] rounded-xl border-2 border-[#FE4C40] hover:bg-[#FE4C40] hover:text-white transition-all flex items-center justify-center gap-2"
            style={{ fontSize: '16px', fontWeight: 600 }}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
