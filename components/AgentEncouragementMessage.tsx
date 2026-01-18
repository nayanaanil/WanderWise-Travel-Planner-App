"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentEncouragementMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function AgentEncouragementMessage({ message, onDismiss }: AgentEncouragementMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onDismiss?.();
      }, 300); // Wait for fade-out animation
    }, 3500); // Auto-dismiss after 3.5 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="absolute top-16 right-4 z-20 bg-white border border-orange-200 rounded-lg px-3 py-2 shadow-lg max-w-[240px]"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
