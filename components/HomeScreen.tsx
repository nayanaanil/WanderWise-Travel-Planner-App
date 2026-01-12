"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';
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
  
  const handlePlanTrip = () => {
    if (onPlanTrip) {
      onPlanTrip();
    } else {
      router.push('/plan/destination');
    }
  };

  return (
    <div className="min-h-screen pb-0 flex flex-col relative overflow-hidden">
      {/* Gradient Background Container - constrained to max-w-md like destination page */}
      <div className="flex-1 max-w-md mx-auto w-full min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-100 relative">
        {/* 3D Globe Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <InteractiveGlobeWrapper />
            </div>

        {/* Centered Content Overlay */}
        <div className="flex-1 w-full px-6 py-6 flex items-center justify-center relative z-10 min-h-screen">
          <div className="w-full text-center space-y-8">
            {/* Compass Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-orange-300/40 mx-auto"
            >
              <Compass className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-7xl font-bold text-orange-600"
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

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="pt-4"
            >
          <button
                onClick={handlePlanTrip}
                className="w-full h-14 bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-300/40 flex items-center justify-center gap-3 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
          </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
