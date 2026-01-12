import { useState } from 'react';
import { UtensilsCrossed, ShoppingBag, MapPin, X, Plus, Minus, Navigation } from 'lucide-react';

interface MapTabContentProps {
  selectedLocation: number | null;
  setSelectedLocation: (id: number | null) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
}

export function MapTabContent({ selectedLocation, setSelectedLocation, mapZoom, setMapZoom }: MapTabContentProps) {
  return (
    <div className="px-4 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl text-gray-900 mb-2">Interactive Trip Map</h2>
          <p className="text-gray-600">Explore your itinerary locations and plan your routes</p>
        </div>

        {/* Interactive Map Container */}
        <div className="relative bg-[#e5e3df] rounded-2xl overflow-hidden shadow-2xl border border-gray-300">
          <div 
            className="relative h-[600px] transition-transform duration-300"
            style={{ 
              transform: `scale(${mapZoom})`,
              transformOrigin: 'center',
              background: 'linear-gradient(180deg, #aad3df 0%, #e5e3df 100%)'
            }}
          >
            {/* Google Maps-style Grid Pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#999" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Simulated Roads and Areas */}
            <div className="absolute inset-0">
              {/* Water bodies */}
              <div className="absolute top-0 left-0 w-1/3 h-1/4 bg-[#aad3df] opacity-60 rounded-br-[100px]"></div>
              <div className="absolute bottom-0 right-0 w-1/4 h-1/3 bg-[#aad3df] opacity-60 rounded-tl-[80px]"></div>
              
              {/* Green spaces / Parks */}
              <div className="absolute top-1/4 right-1/4 w-1/5 h-1/5 bg-[#c3e6cb] opacity-50 rounded-2xl"></div>
              <div className="absolute bottom-1/3 left-1/4 w-1/6 h-1/6 bg-[#c3e6cb] opacity-50 rounded-full"></div>
              
              {/* Main Roads */}
              <div className="absolute top-1/2 left-0 w-full h-3 bg-[#f9d71c] opacity-70"></div>
              <div className="absolute top-0 left-1/2 w-3 h-full bg-[#f9d71c] opacity-70"></div>
              
              {/* Secondary Roads */}
              <div className="absolute top-1/3 left-0 w-full h-2 bg-white opacity-60"></div>
              <div className="absolute top-2/3 left-0 w-full h-2 bg-white opacity-60"></div>
              <div className="absolute top-0 left-1/3 w-2 h-full bg-white opacity-60"></div>
              <div className="absolute top-0 left-2/3 w-2 h-full bg-white opacity-60"></div>
            </div>

            {/* Location Markers */}
            <div className="relative h-full z-10">
              {/* Day 1 Locations */}
              <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                <button
                  onClick={() => setSelectedLocation(1)}
                  className={`group relative transition-transform hover:scale-110 ${
                    selectedLocation === 1 ? 'scale-125 z-20' : ''
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-3 border-white transition-all ${
                      selectedLocation === 1 
                        ? 'bg-[#ea4335] ring-4 ring-[#ea4335]/30' 
                        : 'bg-[#4285f4]'
                    }`}>
                      <UtensilsCrossed className="w-6 h-6 text-white" />
                    </div>
                    {/* Google Maps-style pin shadow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/20 rounded-full blur-sm"></div>
                  </div>
                  <div className={`absolute top-14 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-2xl text-sm whitespace-nowrap transition-all z-30 border border-gray-200 ${
                    selectedLocation === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                  }`}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                    <p className="text-gray-900">Carmel Bakery</p>
                    <p className="text-gray-500 text-xs">9:00 AM - 9:45 AM</p>
                  </div>
                </button>
              </div>

              <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <button
                  onClick={() => setSelectedLocation(2)}
                  className={`group relative transition-transform hover:scale-110 ${
                    selectedLocation === 2 ? 'scale-125 z-20' : ''
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-3 border-white transition-all ${
                      selectedLocation === 2 
                        ? 'bg-[#ea4335] ring-4 ring-[#ea4335]/30' 
                        : 'bg-[#4285f4]'
                    }`}>
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/20 rounded-full blur-sm"></div>
                  </div>
                  <div className={`absolute top-14 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-2xl text-sm whitespace-nowrap transition-all z-30 border border-gray-200 ${
                    selectedLocation === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                  }`}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                    <p className="text-gray-900">Ocean Avenue</p>
                    <p className="text-gray-500 text-xs">10:00 AM - 10:45 AM</p>
                  </div>
                </button>
              </div>

              <div className="absolute top-2/3 right-1/3 transform translate-x-1/2 -translate-y-1/2">
                <button
                  onClick={() => setSelectedLocation(3)}
                  className={`group relative transition-transform hover:scale-110 ${
                    selectedLocation === 3 ? 'scale-125 z-20' : ''
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-3 border-white transition-all ${
                      selectedLocation === 3 
                        ? 'bg-[#ea4335] ring-4 ring-[#ea4335]/30' 
                        : 'bg-[#4285f4]'
                    }`}>
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/20 rounded-full blur-sm"></div>
                  </div>
                  <div className={`absolute top-14 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-2xl text-sm whitespace-nowrap transition-all z-30 border border-gray-200 ${
                    selectedLocation === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                  }`}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                    <p className="text-gray-900">Carmel Plaza</p>
                    <p className="text-gray-500 text-xs">11:00 AM - 11:30 AM</p>
                  </div>
                </button>
              </div>

              {/* Day 2 Locations */}
              <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2">
                <button
                  onClick={() => setSelectedLocation(4)}
                  className={`group relative transition-transform hover:scale-110 ${
                    selectedLocation === 4 ? 'scale-125 z-20' : ''
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-3 border-white transition-all ${
                      selectedLocation === 4 
                        ? 'bg-[#ea4335] ring-4 ring-[#ea4335]/30' 
                        : 'bg-[#4285f4]'
                    }`}>
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/20 rounded-full blur-sm"></div>
                  </div>
                  <div className={`absolute top-14 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-2xl text-sm whitespace-nowrap transition-all z-30 border border-gray-200 ${
                    selectedLocation === 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                  }`}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                    <p className="text-gray-900">Point Lobos</p>
                    <p className="text-gray-500 text-xs">Day 2 Morning</p>
                  </div>
                </button>
              </div>

              {/* Connection Lines - Google Maps-style routes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <marker
                    id="arrowhead-blue"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 4, 0 8" fill="#4285f4" />
                  </marker>
                </defs>
                <line 
                  x1="33%" 
                  y1="25%" 
                  x2="50%" 
                  y2="33%" 
                  stroke="#4285f4" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  opacity="0.8"
                  markerEnd="url(#arrowhead-blue)"
                />
                <line 
                  x1="50%" 
                  y1="33%" 
                  x2="67%" 
                  y2="67%" 
                  stroke="#4285f4" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  opacity="0.8"
                  markerEnd="url(#arrowhead-blue)"
                />
                <line 
                  x1="67%" 
                  y1="67%" 
                  x2="75%" 
                  y2="50%" 
                  stroke="#4285f4" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  opacity="0.8"
                  markerEnd="url(#arrowhead-blue)"
                />
              </svg>
            </div>

            {/* Google Maps-style Map Legend */}
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-xl border border-gray-200">
              <h4 className="text-xs text-gray-700 mb-2">Map Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#4285f4] border-2 border-white shadow-md"></div>
                  <span className="text-xs text-gray-600">Your stops</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ea4335] border-2 border-white shadow-md"></div>
                  <span className="text-xs text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-[#4285f4] rounded-full"></div>
                  <span className="text-xs text-gray-600">Route</span>
                </div>
              </div>
            </div>

            {/* Google Maps-style Map Info Card */}
            <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-xl max-w-xs border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[#4285f4]" />
                <h4 className="text-sm text-gray-900">Carmel-by-the-Sea</h4>
              </div>
              <p className="text-xs text-gray-600">Click markers to view details</p>
              {selectedLocation && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-[#ea4335]">📍 Location {selectedLocation} selected</p>
                </div>
              )}
            </div>
          </div>

          {/* Google Maps-style Zoom Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-0 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
            <button
              onClick={() => setMapZoom(Math.min(2, mapZoom + 0.2))}
              className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-200"
              title="Zoom in"
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => setMapZoom(Math.max(1, mapZoom - 0.2))}
              className="p-3 hover:bg-gray-100 transition-colors"
              title="Zoom out"
            >
              <Minus className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Google Maps-style Navigation Button */}
          <div className="absolute top-6 left-6 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
            <button
              onClick={() => {
                setMapZoom(1);
                setSelectedLocation(null);
              }}
              className="p-3 hover:bg-gray-100 transition-colors flex items-center gap-2"
              title="Reset view"
            >
              <Navigation className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Location Details Card */}
        {selectedLocation && (
          <div className="mt-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg text-gray-900 mb-1">
                  {selectedLocation === 1 && 'Carmel Bakery'}
                  {selectedLocation === 2 && 'Ocean Avenue'}
                  {selectedLocation === 3 && 'Carmel Plaza'}
                  {selectedLocation === 4 && 'Point Lobos State Natural Reserve'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedLocation === 1 && '9:00 AM - 9:45 AM • 0.15 mi from start'}
                  {selectedLocation === 2 && '10:00 AM - 10:45 AM • 0.04 mi from previous'}
                  {selectedLocation === 3 && '11:00 AM - 11:30 AM • 0.18 mi from previous'}
                  {selectedLocation === 4 && 'Day 2 Morning • Scenic coastal views'}
                </p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-[#4285f4] text-white rounded-lg hover:bg-[#3367d6] transition-all text-sm shadow-md">
                Get Directions
              </button>
              <button className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 transition-all text-sm">
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Trip Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <p className="text-3xl mb-2">🚶</p>
            <p className="text-xs text-gray-600 mb-1">Total Distance</p>
            <p className="text-lg text-gray-900">2.3 mi</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <p className="text-3xl mb-2">⏱️</p>
            <p className="text-xs text-gray-600 mb-1">Est. Travel Time</p>
            <p className="text-lg text-gray-900">45 mins</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <p className="text-3xl mb-2">📍</p>
            <p className="text-xs text-gray-600 mb-1">Total Stops</p>
            <p className="text-lg text-gray-900">4 places</p>
          </div>
        </div>
      </div>
    </div>
  );
}
