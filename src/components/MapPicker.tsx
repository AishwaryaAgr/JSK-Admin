'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultLat?: number;
  defaultLng?: number;
}

// Sub-component to handle map flying and pin dropping
function MapController({ 
  position, 
  onLocationSelect 
}: { 
  position: L.LatLng | null; 
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { animate: true, duration: 1.5 });
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  );
}

interface Suggestion {
  place_id: string;
  description: string;
}

export default function MapPicker({ onLocationSelect, defaultLat = 20.5937, defaultLng = 78.9629 }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<L.LatLng | null>(null);
  const [ready, setReady] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    // Small delay to ensure DOM is ready for Leaflet
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Debounced search for suggestions using Google Places API proxy
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          if (data.predictions) {
            setSuggestions(data.predictions);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 500); // Wait 500ms after user stops typing to avoid spamming the API

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setSearchQuery(suggestion.description.split(',')[0]); // Set the main name in input
    setShowDropdown(false);
    setIsSearching(true);
    
    try {
      // Geocode the place_id to get exact lat/long
      const response = await fetch(`/api/geocode?place_id=${suggestion.place_id}`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const lat = location.lat;
        const lng = location.lng;
        
        setMarkerPosition(new L.LatLng(lat, lng));
        onLocationSelect(lat, lng);
      } else {
        alert("Could not find coordinates for this location.");
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      alert("Error retrieving coordinates.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClickSelect = (lat: number, lng: number) => {
    setMarkerPosition(new L.LatLng(lat, lng));
    onLocationSelect(lat, lng);
  };

  if (!isMounted) {
    return <div style={{ height: '400px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', position: 'relative' }} ref={dropdownRef}>
      
      {/* Search Bar with Dropdown Container */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 0.5rem' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Powered by Google Maps: Search for any location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if(suggestions.length > 0) setShowDropdown(true); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          {isSearching && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Loading...</span>}
        </div>

        {/* Dropdown Suggestions */}
        {showDropdown && suggestions.length > 0 && (
          <ul style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--card-shadow)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            maxHeight: '250px',
            overflowY: 'auto',
            zIndex: 1000 // Ensure it sits above the map
          }}>
            {suggestions.map((suggestion) => (
              <li 
                key={suggestion.place_id}
                onClick={() => handleSelectSuggestion(suggestion)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MapPin size={16} color="var(--accent-color)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {suggestion.description}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div style={{ height: '350px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
        {ready && (
          <MapContainer key={`map-${isMounted}`} center={[defaultLat, defaultLng]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController position={markerPosition} onLocationSelect={handleMapClickSelect} />
          </MapContainer>
        )}
      </div>
    </div>
  );
}
