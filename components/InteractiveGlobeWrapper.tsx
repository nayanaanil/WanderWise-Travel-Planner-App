"use client";

import { useEffect, useState } from 'react';

export function InteractiveGlobeWrapper() {
  const [GlobeComponent, setGlobeComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only import React Three Fiber after component mounts
    import('./InteractiveGlobe').then((mod) => {
      setGlobeComponent(() => mod.InteractiveGlobe);
    }).catch((error) => {
      console.error('Failed to load InteractiveGlobe:', error);
    });
  }, []);

  if (!GlobeComponent) {
    return null;
  }

  return <GlobeComponent />;
}

