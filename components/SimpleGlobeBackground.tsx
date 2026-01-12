"use client";

/**
 * Simple background with subtle swirling lines pattern
 * This avoids React Three Fiber compatibility issues with Next.js
 */
export function SimpleGlobeBackground() {
  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
    >
      {/* Base subtle glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(255, 237, 213, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Swirling lines pattern using SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        style={{ mixBlendMode: 'multiply' }}
      >
        <defs>
          <pattern id="swirl" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 100 100 Q 150 50 200 100 T 300 100"
              fill="none"
              stroke="rgba(194, 65, 12, 0.3)"
              strokeWidth="1"
            />
            <path
              d="M 100 100 Q 50 150 100 200 T 100 300"
              fill="none"
              stroke="rgba(194, 65, 12, 0.3)"
              strokeWidth="1"
            />
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(194, 65, 12, 0.2)" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(194, 65, 12, 0.2)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#swirl)" />
      </svg>
    </div>
  );
}
