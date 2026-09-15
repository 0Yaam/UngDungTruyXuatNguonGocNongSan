import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '../../core/theme';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createMapPinIcon,
  formatCoordinate,
  hasValidCoordinates,
  type Coordinates,
} from './mapUtils';

interface FarmingAreaMapPickerProps {
  coordinates?: Coordinates;
  address?: string;
  height?: number;
  onCoordinatesChange: (coordinates: Coordinates) => void;
}

const pickerIcon = createMapPinIcon('+');

const MapViewportSync: React.FC<{ center: Coordinates }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom(), {
      duration: 0.6,
    });
  }, [center, map]);

  return null;
};

const MapSelectionEvents: React.FC<{
  onCoordinatesChange: (coordinates: Coordinates) => void;
}> = ({ onCoordinatesChange }) => {
  useMapEvents({
    click(event) {
      onCoordinatesChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
};

const FarmingAreaMapPicker: React.FC<FarmingAreaMapPickerProps> = ({
  coordinates,
  address,
  height = 360,
  onCoordinatesChange,
}) => {
  const center = hasValidCoordinates(coordinates)
    ? coordinates
    : DEFAULT_MAP_CENTER;

  const markerPosition = useMemo(
    () => (hasValidCoordinates(coordinates) ? coordinates : center),
    [center, coordinates]
  );

  return (
    <div className="agri-map">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing[3],
          flexWrap: 'wrap',
          marginBottom: spacing[3],
        }}
      >
        <div>
          <div
            style={{
              fontWeight: typography.weights.semibold,
              color: colors.textPrimary,
              marginBottom: spacing[1],
            }}
          >
            Chon vi tri vung trong
          </div>
          <div
            style={{
              fontSize: typography.sizes.xs,
              lineHeight: 1.6,
              color: colors.textSecondary,
              maxWidth: 460,
            }}
          >
            Bam tren ban do hoac keo pin de cap nhat toa do. He thong se goi y
            lai dia chi gan nhat.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              background: colors.primary[50],
              color: colors.primary[700],
              borderRadius: borderRadius.full,
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.sizes.xs,
              fontWeight: typography.weights.semibold,
            }}
          >
            Lat: {formatCoordinate(markerPosition.lat)}
          </span>
          <span
            style={{
              background: colors.neutral[100],
              color: colors.textSecondary,
              borderRadius: borderRadius.full,
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.sizes.xs,
              fontWeight: typography.weights.semibold,
            }}
          >
            Lng: {formatCoordinate(markerPosition.lng)}
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height,
          borderRadius: borderRadius['2xl'],
          overflow: 'hidden',
          border: `1px solid ${colors.neutral[200]}`,
          boxShadow: shadows.lg,
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapViewportSync center={center} />
          <MapSelectionEvents onCoordinatesChange={onCoordinatesChange} />
          <Marker
            position={[markerPosition.lat, markerPosition.lng]}
            icon={pickerIcon as L.Icon | L.DivIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target as L.Marker;
                const position = marker.getLatLng();
                onCoordinatesChange({
                  lat: position.lat,
                  lng: position.lng,
                });
              },
            }}
          />
        </MapContainer>

        <div
          style={{
            position: 'absolute',
            top: spacing[3],
            left: spacing[3],
            right: spacing[3],
            display: 'flex',
            justifyContent: 'space-between',
            gap: spacing[3],
            pointerEvents: 'none',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              borderRadius: borderRadius.full,
              padding: `${spacing[2]} ${spacing[3]}`,
              boxShadow: shadows.md,
              fontSize: typography.sizes.xs,
              color: colors.textPrimary,
              fontWeight: typography.weights.semibold,
            }}
          >
            Bam tren map hoac keo pin
          </div>
          {address && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                borderRadius: borderRadius.xl,
                padding: `${spacing[2]} ${spacing[3]}`,
                boxShadow: shadows.md,
                fontSize: typography.sizes.xs,
                color: colors.textSecondary,
                maxWidth: 360,
                lineHeight: 1.5,
              }}
            >
              {address}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmingAreaMapPicker;
