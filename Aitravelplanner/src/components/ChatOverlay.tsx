import { X, Send } from 'lucide-react';
import { useState } from 'react';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatOverlay({ isOpen, onClose }: ChatOverlayProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi! I\'m your WanderWise AI assistant. How can I help you plan your trip today?' },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { type: 'user', text: message }]);
    setMessage('');
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { type: 'bot', text: 'I can help you plan that! Let me create a personalized itinerary for you.' }
      ]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#FE4C40] to-[#E63C30] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h3 className="text-white">WanderWise AI Assistant</h3>
              <p className="text-xs text-white/80">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-[#FE4C40] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button 
              onClick={() => {
                setMessages([...messages, { type: 'user', text: 'Plan a trip to Bali' }]);
                setTimeout(() => {
                  setMessages(prev => [...prev, { type: 'bot', text: 'Great choice! Bali is amazing. Let me help you plan a perfect trip. What\'s your budget and how many days?' }]);
                }, 1000);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              Plan a trip to Bali
            </button>
            <button 
              onClick={() => {
                setMessages([...messages, { type: 'user', text: 'Budget under ₹80k' }]);
                setTimeout(() => {
                  setMessages(prev => [...prev, { type: 'bot', text: 'Perfect! I can find great destinations within ₹80,000. Where would you like to go?' }]);
                }, 1000);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              Budget under ₹80k
            </button>
            <button 
              onClick={() => {
                setMessages([...messages, { type: 'user', text: 'Add a day in Coorg' }]);
                setTimeout(() => {
                  setMessages(prev => [...prev, { type: 'bot', text: 'I\'ll add a day in Coorg to your itinerary. Coorg is beautiful for nature lovers!' }]);
                }, 1000);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              Add a day in Coorg
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4C40]"
            />
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-[#FE4C40] text-white rounded-full hover:bg-[#E63C30] transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
