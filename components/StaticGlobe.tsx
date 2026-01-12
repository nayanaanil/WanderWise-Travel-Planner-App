"use client";

export function StaticGlobe() {
  // Calculate points for a sphere wireframe
  const centerX = 200;
  const centerY = 200;
  const radius = 180;
  
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center opacity-60">
      <svg
        width="400"
        height="400"
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[400px] max-h-[400px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base sphere - light orange/beige circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="#ffedd5"
          opacity="0.6"
        />
        
        {/* Wireframe lines - darker orange */}
        <g stroke="#c2410c" strokeWidth="1.5" fill="none" opacity="0.6">
          {/* Horizontal latitude lines (ellipses) */}
          {[-150, -100, -50, 0, 50, 100, 150].map((lat, index) => {
            const yOffset = (lat / 180) * radius;
            const y = centerY + yOffset;
            const ellipseRadiusY = Math.abs(Math.cos((lat * Math.PI) / 180) * radius);
            const ellipseRadiusX = Math.sqrt(radius * radius - yOffset * yOffset);
            
            if (ellipseRadiusX <= 0) return null;
            
            return (
              <ellipse
                key={`lat-${index}`}
                cx={centerX}
                cy={y}
                rx={ellipseRadiusX}
                ry={ellipseRadiusY * 0.35}
              />
            );
          })}
          
          {/* Vertical longitude lines (proper arcs) */}
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((lon, index) => {
            const angle = (lon - 90) * (Math.PI / 180);
            const startX = centerX + Math.cos(angle) * radius;
            const startY = centerY + Math.sin(angle) * radius;
            const endX = centerX - Math.cos(angle) * radius;
            const endY = centerY - Math.sin(angle) * radius;
            const largeArc = lon > 90 && lon < 270 ? 1 : 0;
            
            return (
              <path
                key={`lon-${index}`}
                d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
              />
            );
          })}
        </g>
        
        {/* Marker dots - orange */}
        <g fill="#f97316" opacity="0.8">
          <circle cx="250" cy="160" r="4" />
          <circle cx="150" cy="180" r="4" />
          <circle cx="240" cy="260" r="4" />
        </g>
      </svg>
    </div>
  );
}
