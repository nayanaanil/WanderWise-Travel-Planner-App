"use client";

import React, { useState } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function ImageWithFallback({ src, alt, className, ...rest }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[IMAGE_LOAD_ERROR]', e.currentTarget.src);
    // Use a generic safe fallback; itinerary-specific images now resolve via itineraryImageMap.
    e.currentTarget.src = 'https://hegvp3kaqm660g9n.public.blob.vercel-storage.com/_default1/1.jpg';
    setDidError(true);
    if (rest.onError) {
      rest.onError(e);
    }
  };

  if (didError) {
    return (
      <div className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}>
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      {...rest} 
      onError={handleError} 
    />
  );
}

