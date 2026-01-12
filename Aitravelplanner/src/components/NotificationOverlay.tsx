import { X, Bell } from 'lucide-react';
import { useState } from 'react';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationOverlay({ isOpen, onClose }: NotificationOverlayProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  const notifications = [
    {
      id: 1,
      icon: '✈️',
      iconBg: '#FE4C40',
      title: 'Trip to Paris Updated',
      message: 'Your itinerary has been updated with new restaurant recommendations',
      time: '5m ago',
      unread: true,
      type: 'trip'
    },
    {
      id: 2,
      icon: '💰',
      iconBg: '#10B981',
      title: 'Price Drop Alert',
      message: 'Flight to Bali dropped by ₹5,000! Book now to save.',
      time: '1h ago',
      unread: true,
      type: 'price'
    },
    {
      id: 3,
      icon: '✨',
      iconBg: '#8B5CF6',
      title: 'New Destination Inspiration',
      message: 'Check out our curated guide for Switzerland in winter',
      time: '3h ago',
      unread: true,
      type: 'inspiration'
    },
    {
      id: 4,
      icon: '📍',
      iconBg: '#F59E0B',
      title: 'Bookmark Saved',
      message: 'You saved "Santorini Sunset Cruise" to your wishlist',
      time: '1d ago',
      unread: false,
      type: 'activity'
    },
    {
      id: 5,
      icon: '✅',
      iconBg: '#06B6D4',
      title: 'Booking Confirmed',
      message: 'Your hotel reservation at The Ritz is confirmed',
      time: '2d ago',
      unread: false,
      type: 'booking'
    },
    {
      id: 6,
      icon: '🎉',
      iconBg: '#EC4899',
      title: 'Welcome to WanderWise!',
      message: 'Start planning your dream vacation with AI assistance',
      time: '5d ago',
      unread: false,
      type: 'system'
    }
  ];

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => n.unread) 
    : notifications;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-gray-900">Notifications</h2>
              <p className="text-xs text-gray-500">{notifications.filter(n => n.unread).length} unread</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-6 py-3 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-[#FE4C40] text-gray-900'
                : 'border-transparent text-gray-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`pb-2 border-b-2 transition-colors relative ${
              activeTab === 'unread'
                ? 'border-[#FE4C40] text-gray-900'
                : 'border-transparent text-gray-500'
            }`}
          >
            Unread
            {notifications.filter(n => n.unread).length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[#FE4C40] text-white rounded-full text-xs">
                {notifications.filter(n => n.unread).length}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">No Unread Notifications</h3>
              <p className="text-sm text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    notification.unread ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: notification.iconBg + '20' }}
                    >
                      <span className="text-xl">{notification.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-gray-900">{notification.title}</h4>
                        {notification.unread && (
                          <div className="w-2 h-2 rounded-full bg-[#FE4C40] flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button className="w-full py-3 text-[#FE4C40] hover:bg-gray-50 rounded-xl transition-colors">
            Mark All as Read
          </button>
        </div>
      </div>
    </div>
  );
}
