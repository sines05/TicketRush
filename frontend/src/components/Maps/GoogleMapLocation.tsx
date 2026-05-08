import React, { useEffect, useRef, useState } from 'react';

interface Location {
  lat: number;
  lng: number;
}

interface GoogleMapLocationProps {
  initialLocation?: Location;
  onLocationChange?: (location: Location) => void;
  readOnly?: boolean;
  apiKey?: string;
}

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 }; // Hanoi

export const GoogleMapLocation: React.FC<GoogleMapLocationProps> = ({
  initialLocation,
  onLocationChange,
  readOnly = false,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API Key is missing. Please set VITE_GOOGLE_MAPS_API_KEY.');
      return;
    }

    const loadScript = () => {
      if (window.google) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => setError('Failed to load Google Maps script.');
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;

      const mapOptions: google.maps.MapOptions = {
        center: initialLocation || DEFAULT_CENTER,
        zoom: 15,
        styles: [
          {
            "elementType": "geometry",
            "stylers": [{ "color": "#242f3e" }]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#242f3e" }]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#746855" }]
          },
          // ... Premium dark mode styles
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#17263c" }]
          }
        ],
        disableDefaultUI: readOnly,
      };

      const newMap = new google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);

      const newMarker = new google.maps.Marker({
        position: initialLocation || DEFAULT_CENTER,
        map: newMap,
        draggable: !readOnly,
        animation: google.maps.Animation.DROP,
      });

      setMarker(newMarker);

      if (!readOnly) {
        newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            newMarker.setPosition(pos);
            onLocationChange?.(pos);
          }
        });

        newMarker.addListener('dragend', () => {
          const pos = newMarker.getPosition();
          if (pos) {
            const newPos = { lat: pos.lat(), lng: pos.lng() };
            onLocationChange?.(newPos);
          }
        });
      }
    };

    loadScript();
  }, [apiKey]);

  // Update marker if initialLocation changes from outside
  useEffect(() => {
    if (marker && initialLocation) {
      marker.setPosition(initialLocation);
      map?.panTo(initialLocation);
    }
  }, [initialLocation, marker, map]);

  return (
    <div className="flex flex-col gap-2 w-full h-full min-h-[400px]">
      {error ? (
        <div className="flex items-center justify-center w-full h-full bg-slate-800 rounded-xl border border-red-500/50 text-red-400 p-4 text-center">
          {error}
        </div>
      ) : (
        <div className="relative w-full h-full flex-grow rounded-xl overflow-hidden border border-slate-700 shadow-xl">
          <div ref={mapRef} className="w-full h-full" />
          {!readOnly && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600 text-xs text-white shadow-lg pointer-events-none">
              Click on the map or drag the pin to set location
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleMapLocation;
