"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

export type RouteMapProps = {
  cities: Array<{
    city: string;
    lat: number;
    lng: number;
    role: 'BASE' | 'OUTBOUND' | 'INBOUND';
  }>;
  activeCity: string | null;
  onMarkerClick?: (city: string) => void;
};

// Component to handle map view updates when activeCity changes
function MapController({ activeCity, cities }: { activeCity: string | null; cities: RouteMapProps['cities'] }) {
  const map = useMap();

  useEffect(() => {
    if (activeCity) {
      const cityData = cities.find(c => c.city === activeCity);
      if (cityData) {
        map.flyTo([cityData.lat, cityData.lng], 11, {
          duration: 0.6,
        });
      }
    }
  }, [activeCity, cities, map]);

  return null;
}

// Custom marker icons with pulse animation
const createMarkerIcon = (isActive: boolean, role: 'BASE' | 'OUTBOUND' | 'INBOUND') => {
  const color = isActive ? '#FE4C40' : role === 'BASE' ? '#4B5563' : '#9CA3AF';
  const size = isActive ? 36 : 24;
  const borderWidth = isActive ? 4 : 3;
  
  return L.divIcon({
    className: `custom-marker ${isActive ? 'active-marker' : ''}`,
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: ${isActive ? '0 0 0 0 rgba(254, 76, 64, 0.7)' : '0 2px 8px rgba(0,0,0,0.3)'};
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        animation: ${isActive ? 'pulse 500ms ease-out' : 'none'};
        transition: all 300ms ease;
      ">
        ${isActive ? '📍' : '📍'}
      </div>
      <style>
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(254, 76, 64, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(254, 76, 64, 0);
            transform: scale(1.1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(254, 76, 64, 0);
            transform: scale(1);
          }
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function RouteMap({ cities, activeCity, onMarkerClick }: RouteMapProps) {
  // Filter out cities without valid coordinates
  const validCities = cities.filter(c => c.lat !== 0 && c.lng !== 0 && !isNaN(c.lat) && !isNaN(c.lng));
  
  // Calculate center and bounds from valid cities
  const center: [number, number] = validCities.length > 0
    ? [validCities[0].lat, validCities[0].lng]
    : [0, 0];

  const bounds = validCities.length > 0
    ? L.latLngBounds(validCities.map(c => [c.lat, c.lng]))
    : null;

  if (validCities.length === 0) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100 text-gray-500">
        <p>No cities to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border-2 border-gray-200">
      <MapContainer
        center={center}
        zoom={bounds ? undefined : 6}
        bounds={bounds || undefined}
        boundsOptions={{ padding: [50, 50] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController activeCity={activeCity} cities={validCities} />
        
        {validCities.map((cityData, index) => {
          const isActive = cityData.city === activeCity;
          return (
            <Marker
              key={`${cityData.city}-${cityData.role}-${index}`}
              position={[cityData.lat, cityData.lng]}
              icon={createMarkerIcon(isActive, cityData.role)}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) {
                    onMarkerClick(cityData.city);
                  }
                },
              }}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">{cityData.city}</p>
                  <p className="text-xs text-gray-500">{cityData.role}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

