import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ChatOverlay } from './components/ChatOverlay';
import { NotificationOverlay } from './components/NotificationOverlay';
import { HomeScreen } from './components/HomeScreen';
import { DestinationSelectionScreen } from './components/DestinationSelectionScreen';
import { DurationParametersScreen } from './components/DurationParametersScreen';
import { PaceStyleParametersScreen } from './components/PaceStyleParametersScreen';
import { MustSeeItemsScreen } from './components/MustSeeItemsScreen';
import { AIProcessingScreen } from './components/AIProcessingScreen';
import { ItineraryPlannerScreen } from './components/ItineraryPlannerScreen';
import { ExploreScreen } from './components/ExploreScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { IPhoneFrame } from './components/iPhoneFrame';
import { TripStepper } from './components/TripStepper';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { ChevronRight, User } from 'lucide-react';

type Screen = 
  | 'home' 
  | 'destination-selection'
  | 'duration-parameters' 
  | 'pace-style-parameters'
  | 'must-see-items'
  | 'ai-processing'
  | 'itinerary-planner' 
  | 'explore' 
  | 'trips' 
  | 'saved' 
  | 'settings' 
  | 'help';

interface BookedItem {
  id: number;
  name: string;
  location: string;
  rating: number;
  image: string;
  type: string;
  price?: string;
  category: 'transport' | 'stays' | 'food' | 'activities' | 'attractions';
}

interface TripParams {
  destination: string;
  dateRange?: { from: Date; to: Date };
  adults?: number;
  kids?: number;
  budget?: string;
  pace?: string;
  styles?: string[];
  mustSeeItems?: string[];
  bookedItems?: BookedItem[];
}

interface SavedItinerary {
  id: string;
  destination: string;
  dateRange?: { from: Date; to: Date };
  budget?: string;
  savedDate: Date;
  thumbnail: string;
  tripParams: TripParams;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showScreenSelector, setShowScreenSelector] = useState(true);
  const [tripParams, setTripParams] = useState<TripParams>({ destination: '' });
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);

  const getCurrentStepNumber = (): number => {
    switch (currentScreen) {
      case 'destination-selection': return 1;
      case 'duration-parameters': return 2;
      case 'pace-style-parameters': return 3;
      case 'must-see-items': return 4;
      default: return 0;
    }
  };

  const navigateToStep = (stepNumber: number) => {
    const stepMap: { [key: number]: Screen } = {
      1: 'destination-selection',
      2: 'duration-parameters',
      3: 'pace-style-parameters',
      4: 'must-see-items',
    };
    
    const targetScreen = stepMap[stepNumber];
    if (targetScreen) {
      setCurrentScreen(targetScreen);
    }
  };

  const markStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
    }
  };

  const getActiveFooterTab = () => {
    if (currentScreen === 'home') return 'home';
    if (currentScreen === 'explore') return 'inspire';
    if (currentScreen === 'trips') return 'trips';
    if (currentScreen === 'settings') return 'profile';
    return 'home';
  };

  const handleAddToTrip = (item: any, category: string) => {
    const bookedItem: BookedItem = {
      ...item,
      category: category as any
    };
    
    setTripParams({
      ...tripParams,
      bookedItems: [...(tripParams.bookedItems || []), bookedItem]
    });
    
    // Show a toast notification
    toast.success(`${item.name} added to your trip!`, {
      description: 'View it in the Itinerary tab or My Trips',
      duration: 3000,
    });
  };

  const handleSaveItinerary = () => {
    if (!tripParams.destination) {
      toast.error('Please plan a trip first!');
      return;
    }

    // Generate thumbnail based on destination
    const thumbnails: { [key: string]: string } = {
      'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
      'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
      'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400',
      'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
      'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400',
      'default': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    };

    const newSaved: SavedItinerary = {
      id: Date.now().toString(),
      destination: tripParams.destination,
      dateRange: tripParams.dateRange,
      budget: tripParams.budget,
      savedDate: new Date(),
      thumbnail: thumbnails[tripParams.destination] || thumbnails.default,
      tripParams: { ...tripParams },
    };

    setSavedItineraries([...savedItineraries, newSaved]);
    
    toast.success('Itinerary saved successfully!', {
      description: 'View it in your Saved Plans',
      duration: 3000,
    });
  };

  const handleLoadSavedItinerary = (saved: SavedItinerary) => {
    setTripParams(saved.tripParams);
    setCurrentScreen('itinerary-planner');
  };

  const handleDeleteSavedItinerary = (id: string) => {
    setSavedItineraries(savedItineraries.filter(item => item.id !== id));
    toast.success('Itinerary removed from saved');
  };

  return (
    <IPhoneFrame>
      <div className="min-h-screen bg-white">
        {/* Screen Selector - Shows different views */}
        {showScreenSelector && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2" style={{ fontSize: '12px' }}>
            <span className="text-gray-600">View:</span>
            <select
              value={currentScreen}
              onChange={(e) => setCurrentScreen(e.target.value as Screen)}
              className="bg-gradient-to-r from-[#FE4C40] to-[#E63C30] text-white px-3 py-1.5 rounded-full cursor-pointer focus:outline-none"
              style={{ fontSize: '12px' }}
            >
              <optgroup label="Home Screens">
                <option value="home">Home - Main View</option>
              </optgroup>
              <optgroup label="Plan Trip Screens">
                <option value="destination-selection">1. Destination Selection</option>
                <option value="duration-parameters">2. Duration Parameters</option>
                <option value="pace-style-parameters">3. Pace & Style</option>
                <option value="must-see-items">4. Must-See Items</option>
                <option value="ai-processing">5. AI Processing</option>
                <option value="itinerary-planner">6. Itinerary Preview</option>
              </optgroup>
              <optgroup label="Explore Screens">
                <option value="explore">Inspire Me - Categories View</option>
              </optgroup>
            </select>
            <button
              onClick={() => setShowScreenSelector(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
        )}

        {/* Header */}
        <Header
          onLogoClick={() => setCurrentScreen('home')}
          onChatClick={() => setIsNotificationOpen(true)}
        />

        {/* Main Content */}
        <main className="relative">
          {currentScreen === 'home' && (
            <HomeScreen
              onPlanTrip={() => setCurrentScreen('destination-selection')}
              onExplore={() => setCurrentScreen('explore')}
              onChatOpen={() => setIsChatOpen(true)}
              onSavedClick={() => setCurrentScreen('saved')}
              savedCount={savedItineraries.length}
            />
          )}
          
          {currentScreen === 'destination-selection' && (
            <>
              <TripStepper 
                currentStep={1}
                onStepClick={navigateToStep}
                completedSteps={completedSteps}
              />
              <DestinationSelectionScreen
                onDestinationSelected={(destination) => {
                  setTripParams({ ...tripParams, destination });
                  markStepComplete(1);
                  setCurrentScreen('duration-parameters');
                }}
                onBack={() => setCurrentScreen('home')}
              />
            </>
          )}
          
          {currentScreen === 'duration-parameters' && (
            <>
              <TripStepper 
                currentStep={2}
                onStepClick={navigateToStep}
                completedSteps={completedSteps}
              />
              <DurationParametersScreen
                destination={tripParams.destination}
                onContinue={(params) => {
                  setTripParams({ ...tripParams, ...params });
                  markStepComplete(2);
                  setCurrentScreen('pace-style-parameters');
                }}
                onBack={() => setCurrentScreen('destination-selection')}
              />
            </>
          )}
          
          {currentScreen === 'pace-style-parameters' && (
            <>
              <TripStepper 
                currentStep={3}
                onStepClick={navigateToStep}
                completedSteps={completedSteps}
              />
              <PaceStyleParametersScreen
                destination={tripParams.destination}
                onContinue={(params) => {
                  setTripParams({ ...tripParams, ...params });
                  markStepComplete(3);
                  setCurrentScreen('must-see-items');
                }}
                onBack={() => setCurrentScreen('duration-parameters')}
              />
            </>
          )}
          
          {currentScreen === 'must-see-items' && (
            <>
              <TripStepper 
                currentStep={4}
                onStepClick={navigateToStep}
                completedSteps={completedSteps}
              />
              <MustSeeItemsScreen
                destination={tripParams.destination}
                onContinue={(mustSeeItems) => {
                  setTripParams({ ...tripParams, mustSeeItems });
                  markStepComplete(4);
                  setCurrentScreen('ai-processing');
                }}
                onBack={() => setCurrentScreen('pace-style-parameters')}
              />
            </>
          )}
          
          {currentScreen === 'ai-processing' && (
            <AIProcessingScreen
              destination={tripParams.destination}
              onComplete={() => setCurrentScreen('itinerary-planner')}
              onBack={() => setCurrentScreen('must-see-items')}
            />
          )}
          
          {currentScreen === 'itinerary-planner' && (
            <ItineraryPlannerScreen 
              bookedItems={tripParams.bookedItems || []}
              onAddToTrip={handleAddToTrip}
              tripParams={tripParams}
              onSave={handleSaveItinerary}
            />
          )}
          
          {currentScreen === 'explore' && (
            <ExploreScreen 
              onAddToTrip={handleAddToTrip}
              onBack={() => setCurrentScreen('home')}
            />
          )}
          
          {currentScreen === 'trips' && (
            <div className="min-h-screen pt-16 pb-20 px-6">
              <div className="max-w-md mx-auto py-8">
                <h1 className="text-3xl text-gray-900 mb-4">My Trips</h1>
                <p className="text-gray-600 mb-8">View and manage all your planned trips</p>
                
                {tripParams.destination ? (
                  <div className="space-y-4">
                    {/* Current Trip Card - Enhanced */}
                    {tripParams.destination && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-black shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">✈️</span>
                              <h3 className="text-gray-900">{tripParams.destination}</h3>
                            </div>
                            {tripParams.dateRange && (
                              <p className="text-sm text-gray-600">
                                {new Date(tripParams.dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(tripParams.dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <div className="px-3 py-1.5 bg-[#FE4C40] text-white rounded-full text-xs">
                            Active
                          </div>
                        </div>

                        {/* Progress Indicators */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Trip Planning</span>
                            <span className="text-[#FE4C40]">80% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-[#FE4C40] to-[#E63C30] h-2 rounded-full" style={{ width: '80%' }}></div>
                          </div>
                        </div>

                        {/* Bookings Summary */}
                        {tripParams.bookedItems && tripParams.bookedItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">Bookings ({tripParams.bookedItems.length})</p>
                            <div className="flex gap-2 flex-wrap">
                              {tripParams.bookedItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">
                                  {item.category === 'transport' && '✈️'}
                                  {item.category === 'stays' && '🏨'}
                                  {item.category === 'food' && '🍴'}
                                  {item.category === 'activities' && '🎭'}
                                  {item.category === 'attractions' && '🌆'}
                                  <span className="ml-1">{item.name.slice(0, 15)}{item.name.length > 15 ? '...' : ''}</span>
                                </div>
                              ))}
                              {tripParams.bookedItems.length > 3 && (
                                <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
                                  +{tripParams.bookedItems.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentScreen('itinerary-planner');
                            }}
                            className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm flex items-center justify-center"
                          >
                            Continue Planning
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Start New Trip */}
                    <button
                      onClick={() => {
                        setTripParams({ destination: '' });
                        setCurrentScreen('destination-selection');
                      }}
                      className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-[#FE4C40] hover:text-[#FE4C40] transition-all flex items-center justify-center"
                    >
                      + Plan Another Trip
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#FFF5F4] to-white p-8 rounded-2xl text-center">
                    <div className="text-6xl mb-4">🧳</div>
                    <p className="text-gray-600">Your trips will appear here</p>
                    <button
                      onClick={() => setCurrentScreen('destination-selection')}
                      className="mt-4 px-6 py-3 bg-[#FE4C40] text-white rounded-full hover:bg-[#E63C30] transition-colors flex items-center justify-center mx-auto"
                    >
                      Plan Your First Trip
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentScreen === 'saved' && (
            <div className="min-h-screen pt-16 pb-20 px-6">
              <div className="max-w-md mx-auto py-8">
                <h1 className="text-3xl text-gray-900 mb-4">Saved Plans</h1>
                <p className="text-gray-600 mb-8">Your favorite destinations and activities</p>
                {savedItineraries.length > 0 ? (
                  <div className="space-y-4">
                    {savedItineraries.map(saved => (
                      <div key={saved.id} className="bg-white rounded-2xl p-6 border-2 border-black shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">✈️</span>
                              <h3 className="text-gray-900">{saved.destination}</h3>
                            </div>
                            {saved.dateRange && (
                              <p className="text-sm text-gray-600">
                                {new Date(saved.dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(saved.dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <div className="px-3 py-1.5 bg-[#FE4C40] text-white rounded-full text-xs">
                            Saved
                          </div>
                        </div>

                        {/* Progress Indicators */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Trip Planning</span>
                            <span className="text-[#FE4C40]">80% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-[#FE4C40] to-[#E63C30] h-2 rounded-full" style={{ width: '80%' }}></div>
                          </div>
                        </div>

                        {/* Bookings Summary */}
                        {saved.tripParams.bookedItems && saved.tripParams.bookedItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">Bookings ({saved.tripParams.bookedItems.length})</p>
                            <div className="flex gap-2 flex-wrap">
                              {saved.tripParams.bookedItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">
                                  {item.category === 'transport' && '✈️'}
                                  {item.category === 'stays' && '🏨'}
                                  {item.category === 'food' && '🍴'}
                                  {item.category === 'activities' && '🎭'}
                                  {item.category === 'attractions' && '🌆'}
                                  <span className="ml-1">{item.name.slice(0, 15)}{item.name.length > 15 ? '...' : ''}</span>
                                </div>
                              ))}
                              {saved.tripParams.bookedItems.length > 3 && (
                                <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
                                  +{saved.tripParams.bookedItems.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadSavedItinerary(saved);
                            }}
                            className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm flex items-center justify-center"
                          >
                            Load Itinerary
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedItinerary(saved.id);
                            }}
                            className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center justify-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#FFF5F4] to-white p-8 rounded-2xl text-center">
                    <div className="text-6xl mb-4">💾</div>
                    <p className="text-gray-600">No saved plans yet</p>
                    <button
                      onClick={() => setCurrentScreen('explore')}
                      className="mt-4 px-6 py-3 bg-[#FE4C40] text-white rounded-full hover:bg-[#E63C30] transition-colors flex items-center justify-center mx-auto"
                    >
                      Explore Destinations
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentScreen === 'settings' && (
            <ProfileScreen />
          )}
          
          {currentScreen === 'help' && (
            <div className="min-h-screen pt-16 pb-20 px-6">
              <div className="max-w-md mx-auto py-8">
                <h1 className="text-3xl text-gray-900 mb-4">Help & Support</h1>
                <p className="text-gray-600 mb-8">We're here to help you plan the perfect trip</p>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-[#FFF5F4] to-white p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-gray-900 mb-2">📚 FAQs</h3>
                    <p className="text-sm text-gray-600">Find answers to common questions</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#FFF5F4] to-white p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-gray-900 mb-2">💬 Chat Support</h3>
                    <p className="text-sm text-gray-600">Get instant help from our AI assistant</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#FFF5F4] to-white p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-gray-900 mb-2">📧 Contact Us</h3>
                    <p className="text-sm text-gray-600">Email us at support@wanderwise.com</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer
          activeTab={getActiveFooterTab()}
          onHomeClick={() => setCurrentScreen('home')}
          onInspireClick={() => setCurrentScreen('explore')}
          onTripsClick={() => setCurrentScreen('trips')}
          onProfileClick={() => setCurrentScreen('settings')}
        />

        {/* Chat Overlay */}
        <ChatOverlay
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Notification Overlay */}
        <NotificationOverlay
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />

        {/* Toast Notifications */}
        <Toaster />

        {/* Hidden button to show screen selector if hidden */}
        {!showScreenSelector && (
          <button
            onClick={() => setShowScreenSelector(true)}
            className="fixed bottom-24 right-4 z-50 bg-[#FE4C40] text-white p-3 rounded-full shadow-lg hover:bg-[#E63C30] transition-colors"
            title="Show screen selector"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </IPhoneFrame>
  );
}