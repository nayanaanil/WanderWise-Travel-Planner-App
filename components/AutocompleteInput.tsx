"use client";

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { MapPin, Search } from 'lucide-react';

export interface City {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  region?: string;
  type?: 'city' | 'country' | 'region';
}

export interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (city: City | null) => void;
  onFreeText?: (phrase: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  label?: string;
  icon?: 'mapPin' | 'search';
  className?: string;
  inputType?: 'origin' | 'destination'; // 'origin' uses /api/cities/origin, 'destination' uses /api/cities
  allowFreeText?: boolean; // If false, only allow selection from autocomplete suggestions
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onFreeText,
  onEnter,
  placeholder = "Search...",
  label,
  icon = 'mapPin',
  className = "",
  inputType = 'destination',
  allowFreeText = true,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchCities = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Use origin endpoint for origin input type, destination endpoint otherwise
      const endpoint = inputType === 'origin' ? '/api/cities/origin' : '/api/cities';
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.cities || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce the search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const query = value.trim();
    if (query) {
      debounceTimerRef.current = setTimeout(() => {
        searchCities(query);
      }, 300);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, inputType]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedCity(null);
    setSelectedIndex(-1);
    if (newValue.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Handle city selection
  const handleSelectCity = (city: City) => {
    onChange(city.name);
    setSelectedCity(city);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSelect) {
      onSelect(city);
    }
  };

  // Handle free text (when user types and presses Enter or Continue)
  const handleFreeText = () => {
    if (!allowFreeText) {
      return; // Disallow free text if allowFreeText is false
    }
    if (value.trim() && !selectedCity) {
      if (onFreeText) {
        onFreeText(value.trim());
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Only allow free text if allowFreeText is true
        if (allowFreeText) {
          handleFreeText();
          if (onEnter && value.trim()) {
            onEnter();
          }
        }
        // If allowFreeText is false and no city is selected, do nothing
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCity(suggestions[selectedIndex]);
        } else {
          // Only allow free text if allowFreeText is true
          if (allowFreeText) {
            handleFreeText();
            if (onEnter && value.trim()) {
              onEnter();
            }
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const IconComponent = icon === 'mapPin' ? MapPin : Search;

  const hasError = className.includes('error');

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm text-gray-600 mb-2 ml-1">{label}</label>
      )}
      <div className="relative">
        <IconComponent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-12 pr-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-colors text-gray-900 placeholder:text-gray-500 shadow-sm ${
            hasError 
              ? 'border-red-500 focus:border-red-600' 
              : 'border-gray-200 focus:border-[#FE4C40]'
          }`}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isSearching) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-64 overflow-y-auto"
        >
          {isSearching ? (
            <div className="px-4 py-3 text-center text-gray-500">
              Searching...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((city, index) => (
              <button
                key={city.id}
                onClick={() => handleSelectCity(city)}
                className={`w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-[#FFF5F4] hover:to-white transition-colors border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-gradient-to-r from-[#FFF5F4] to-white' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#FE4C40] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium truncate">
                        {city.name}
                      </span>
                      {city.type === 'country' && (
                        <span className="px-2 py-0.5 bg-[#FFF5F4] text-[#FE4C40] rounded-full text-xs font-medium flex-shrink-0">
                          Country
                        </span>
                      )}
                      {city.type === 'region' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium flex-shrink-0">
                          Region
                        </span>
                      )}
                    </div>
                    {city.type === 'city' && (
                      <div className="text-sm text-gray-500 truncate">
                        {city.region ? `${city.region}, ` : ''}
                        {city.country}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : null}
        </div>
      )}

      {/* Free text indicator */}
      {allowFreeText && value.trim() && !selectedCity && suggestions.length === 0 && !isSearching && (
        <div className="absolute top-full mt-1 left-0 text-xs text-gray-500 px-2">
          Press Enter to use as free text
        </div>
      )}
      {/* No free text allowed indicator */}
      {!allowFreeText && value.trim() && !selectedCity && suggestions.length === 0 && !isSearching && (
        <div className="absolute top-full mt-1 left-0 text-xs text-amber-600 px-2">
          Please select from suggestions
        </div>
      )}
    </div>
  );
}

