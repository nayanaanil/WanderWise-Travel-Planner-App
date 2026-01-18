"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, ArrowRight, X } from 'lucide-react';
import { InteractiveGlobeWrapper } from './InteractiveGlobeWrapper';

interface HomeScreenProps {
  onPlanTrip?: () => void;
  onExplore?: () => void;
  onChatOpen?: () => void;
  onSavedClick?: () => void;
  savedCount?: number;
}

export function HomeScreen({ onPlanTrip }: HomeScreenProps) {
  const router = useRouter();
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showClickMe, setShowClickMe] = useState(false);
  
  // Show "Click me!" tooltip after 2 seconds if compass hasn't been clicked
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showIntroModal) {
        setShowClickMe(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [showIntroModal]);

  const handlePlanTrip = () => {
    if (onPlanTrip) {
      onPlanTrip();
    } else {
      router.push('/plan/destination');
    }
  };

  const handleFastPath = () => {
    // Fast Path: Go to fast path page
    router.push('/plan/fast-path');
  };

  const handleGuidedPath = () => {
    // Guided Path: Use existing flow
    handlePlanTrip();
  };

  const handleCompassClick = () => {
    setShowClickMe(false); // Hide tooltip when clicked
    setShowIntroModal(true);
  };

  return (
    <div className="min-h-[100dvh] pb-0 flex flex-col relative overflow-y-auto">
      {/* Gradient Background Container - constrained to max-w-md like destination page */}
      <div className="flex-1 max-w-md mx-auto w-full min-h-[100dvh] bg-gradient-to-br from-orange-50 via-pink-50 to-rose-100 relative">
        {/* 3D Globe Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <InteractiveGlobeWrapper />
            </div>

        {/* Centered Content Overlay */}
        <div className="flex-1 w-full px-6 py-6 flex items-center justify-center relative z-10 min-h-[100dvh]">
          <div className="w-full text-center space-y-8">
            {/* Compass Icon */}
            <div className="relative">
              {/* "Click me!" tooltip */}
              {showClickMe && !showIntroModal && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    Click me!
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </motion.div>
              )}
              
              <motion.button
                type="button"
                onClick={handleCompassClick}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: [0, -2, 2, -2, 2, -1, 1, 0],
                  y: [0, -1, 1, -1, 1, 0],
                  rotate: [0, -3, 3, -3, 3, 0],
                }}
                transition={{ 
                  opacity: { duration: 0.6 },
                  scale: { duration: 0.6 },
                  x: {
                    duration: 1.5,
                    times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  },
                  y: {
                    duration: 1.5,
                    times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  },
                  rotate: {
                    duration: 1.5,
                    times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  },
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-orange-300/40 mx-auto cursor-pointer hover:scale-105 transition-transform"
              >
                <Compass className="w-10 h-10 text-white" />
              </motion.button>
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-7xl font-bold text-orange-600 text-center"
            >
              WanderWise
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl text-orange-500/80"
            >
              Explore the world
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="pt-4 space-y-3"
            >
              {/* Primary CTA: Fast Path */}
              <button
                onClick={handleFastPath}
                className="w-full h-14 bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-300/40 flex items-center justify-center gap-3 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                <span>Plan it for me</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              {/* Secondary CTA: Guided Path */}
              <button
                onClick={handleGuidedPath}
                className="w-full h-12 text-orange-600 hover:text-orange-700 font-medium rounded-xl border-2 border-orange-300 hover:border-orange-400 transition-all duration-300"
              >
                Customize step by step
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Intro Modal */}
      <AnimatePresence>
        {showIntroModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowIntroModal(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Meet your travel guide
                  </h2>
                </div>

                {/* Content */}
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p className="text-base font-medium text-orange-600">
                    Hey, I&apos;m WanderWise.
                  </p>
                  
                  <p className="text-sm">
                    I help you think through travel decisions the way a great human travel agent would — by showing you the trade-offs, not just the &quot;best&quot; option.
                  </p>
                  
                  <p className="text-sm">
                    Whenever things get tricky (flights, hotels, activities), I&apos;ll quietly step in with guidance — and you always stay in control.
                  </p>
                  
                  <p className="text-sm">
                    Look for me when you see the compass. I&apos;m here when you need me, and invisible when you don&apos;t.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
