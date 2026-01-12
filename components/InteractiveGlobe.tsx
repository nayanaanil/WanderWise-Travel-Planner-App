"use client";

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function Globe() {
  return (
    <>
      {/* Base sphere */}
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#ffedd5" transparent opacity={0.6} />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.01, 32, 32]} />
        <meshBasicMaterial 
          color="#c2410c" 
          wireframe 
          transparent 
          opacity={0.6} 
        />
      </mesh>

      {/* Pulsing markers */}
      {[
        { position: [1.5, 0.8, 0.5] },
        { position: [-1.2, 0.6, 1.0] },
        { position: [0.8, -1.1, 0.3] },
      ].map((marker, index) => (
        <GlobeMarker key={index} position={marker.position as [number, number, number]} />
      ))}
    </>
  );
}

function GlobeMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#f97316" />
    </mesh>
  );
}

export function InteractiveGlobe() {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ opacity: 0.6 }}>
      <Suspense fallback={null}>
        <Canvas 
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <Globe />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={false}
            autoRotate 
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
