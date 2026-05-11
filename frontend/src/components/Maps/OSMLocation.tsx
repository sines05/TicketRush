import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue in Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lng: number;
}

interface OSMLocationProps {
  initialLocation?: Location;
  onLocationChange?: (location: Location) => void;
  readOnly?: boolean;
}

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 }; // Hanoi

// Internal component to handle map interactions and programmatic updates
const MapController = ({ onLocationChange, readOnly, position }: { 
  onLocationChange?: (location: Location) => void, 
  readOnly: boolean,
  position: Location
}) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!readOnly) {
        onLocationChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  // Sync map view when position changes (e.g. from external initialLocation update)
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom());
  }, [position, map]);

  return null;
};

export const OSMLocation: React.FC<OSMLocationProps> = ({
  initialLocation,
  onLocationChange,
  readOnly = false,
}) => {
  const [position, setPosition] = useState<Location>(initialLocation || DEFAULT_CENTER);

  // Update internal state if initialLocation prop changes
  useEffect(() => {
    if (initialLocation && typeof initialLocation.lat === 'number' && typeof initialLocation.lng === 'number') {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

  const handleLocationChange = (newPos: Location) => {
    setPosition(newPos);
    onLocationChange?.(newPos);
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full min-h-[400px]">
      <div className="relative w-full h-full flex-grow rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={15}
          scrollWheelZoom={!readOnly}
          style={{ height: '100%', width: '100%', background: '#1e293b' }}
          zoomControl={!readOnly}
          dragging={!readOnly}
          doubleClickZoom={!readOnly}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker 
            position={[position.lat, position.lng]}
            draggable={!readOnly}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                handleLocationChange({ lat: pos.lat, lng: pos.lng });
              },
            }}
          >
            <Popup>
              Location: {position.lat?.toFixed(4) ?? '0.0000'}, {position.lng?.toFixed(4) ?? '0.0000'}
            </Popup>
          </Marker>
          <MapController 
            onLocationChange={handleLocationChange} 
            readOnly={readOnly} 
            position={position}
          />
        </MapContainer>
        
        {!readOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600 text-xs text-white shadow-lg pointer-events-none z-[1000]">
            Click on the map or drag the pin to set location
          </div>
        )}
      </div>
    </div>
  );
};

export default OSMLocation;

