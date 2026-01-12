"use client";

import { useRef, useEffect, useState, ReactNode, isValidElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCarouselProps {
  children: ReactNode;
  /**
   * Whether to prevent manual scrolling (wheel/touch)
   * Default: false (allows touch scrolling for mobile)
   * Set to true to force arrow-only navigation (like destination carousel)
   */
  preventManualScroll?: boolean;
  /**
   * Gap between items in pixels (for scroll calculation and CSS)
   * Default: 16 (gap-4)
   */
  gap?: number;
  /**
   * Gap class name (e.g., "gap-3", "gap-4")
   * Default: "gap-4"
   */
  gapClass?: string;
  /**
   * Horizontal padding on carousel container
   * Default: px-20 md:px-24 (matches destination carousel)
   */
  horizontalPadding?: string;
  /**
   * Initial centered card index
   * Default: 0 (first card)
   */
  initialIndex?: number;
}

/**
 * Horizontal Carousel Component
 * 
 * Reusable carousel with arrow navigation and peek effect.
 * Copied exactly from DestinationSelectionScreen.tsx carousel logic.
 */
export function HorizontalCarousel({ 
  children, 
  preventManualScroll = false,
  gap = 16,
  gapClass = 'gap-4',
  horizontalPadding = 'px-20 md:px-24',
  initialIndex = 0,
}: HorizontalCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [centeredCardIndex, setCenteredCardIndex] = useState(initialIndex);
  const hasScrolledToInitial = useRef(false);

  // Get children as array
  const childrenArray = Array.isArray(children) ? children : [children];
  const validChildren = childrenArray.filter(child => child != null && child !== false);
  const childCount = validChildren.length;

  // Initialize card refs array
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, childCount);
  }, [childCount]);

  // Scroll carousel functions - center cards for peek effect
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current && cardRefs.current.length > 0) {
      const carousel = carouselRef.current;
      const carouselWidth = carousel.clientWidth;

      // Find current centered card index
      let currentIndex = centeredCardIndex >= 0 ? centeredCardIndex : 0;

      // Calculate next index
      const nextIndex = direction === 'left' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(cardRefs.current.length - 1, currentIndex + 1);

      // Scroll to center the next card
      const targetCard = cardRefs.current[nextIndex];
      if (targetCard) {
        const cardWidth = targetCard.offsetWidth;
        const gapPx = gap; // gap between cards
        const cardLeft = targetCard.offsetLeft;
        const scrollPosition = cardLeft + cardWidth / 2 - carouselWidth / 2;
        carousel.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  };

  // Prevent manual scrolling while allowing programmatic scrolling (optional)
  useEffect(() => {
    if (!preventManualScroll) return; // Skip if manual scroll is allowed
    
    const carousel = carouselRef.current;
    if (!carousel) return;

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();
    };

    // Prevent wheel and touch scrolling
    carousel.addEventListener('wheel', preventScroll, { passive: false });
    carousel.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      carousel.removeEventListener('wheel', preventScroll);
      carousel.removeEventListener('touchmove', preventScroll);
    };
  }, [preventManualScroll]);

  // Scroll to initial index on mount
  useEffect(() => {
    if (hasScrolledToInitial.current || initialIndex === 0) return;
    
    const carousel = carouselRef.current;
    if (!carousel || cardRefs.current.length === 0) return;

    const scrollToInitial = () => {
      const targetCard = cardRefs.current[initialIndex];
      if (targetCard) {
        const carouselWidth = carousel.clientWidth;
        const cardWidth = targetCard.offsetWidth;
        const cardLeft = targetCard.offsetLeft;
        const scrollPosition = cardLeft + cardWidth / 2 - carouselWidth / 2;
        carousel.scrollTo({ left: scrollPosition, behavior: 'auto' });
        setCenteredCardIndex(initialIndex);
        hasScrolledToInitial.current = true;
      }
    };

    // Wait for cards to be rendered
    const timeoutId = setTimeout(scrollToInitial, 100);
    scrollToInitial(); // Also try immediately

    return () => clearTimeout(timeoutId);
  }, [childCount, initialIndex]);

  // Detect centered card on scroll
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const carouselRect = carousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - carouselCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setCenteredCardIndex(closestIndex);
    };

    carousel.addEventListener('scroll', handleScroll);
    
    // Initial check after a short delay to ensure cards are rendered
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 100);
    handleScroll(); // Also run immediately

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [childCount]);

  // Wrap children to add refs and peek effect styling
  const enhancedChildren = validChildren.map((child, index) => {
    const isCentered = centeredCardIndex === index;
    const scale = isCentered ? 1 : 0.92;
    const opacity = isCentered ? 1 : 0.7;

    // Extract key safely
    let key: string | number = index;
    if (isValidElement(child)) {
      key = child.key !== null && child.key !== undefined ? child.key : index;
    }

    // Wrap child in a div with ref and styles for peek effect
    return (
      <div
        key={key}
        ref={(el) => {
          cardRefs.current[index] = el;
        }}
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: 'all 0.3s',
        }}
        className="flex-shrink-0"
      >
        {child}
      </div>
    );
  });

  return (
    <div className="relative">
      {/* Left Arrow - Overlay on peeking card */}
      <button
        onClick={() => scrollCarousel('left')}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center hover:opacity-80 transition-opacity bg-white/90 md:bg-white/80 rounded-full p-2 shadow-lg"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700 drop-shadow-md" />
      </button>

      {/* Carousel with peek effect */}
      <div
        ref={carouselRef}
        className={`flex ${gapClass} overflow-x-auto pb-6 scroll-smooth ${horizontalPadding} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        style={{ 
          scrollBehavior: 'smooth',
        }}
      >
        {enhancedChildren}
      </div>

      {/* Right Arrow - Overlay on peeking card */}
      <button
        onClick={() => scrollCarousel('right')}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center hover:opacity-80 transition-opacity bg-white/90 md:bg-white/80 rounded-full p-2 shadow-lg"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-700 drop-shadow-md" />
      </button>
    </div>
  );
}
