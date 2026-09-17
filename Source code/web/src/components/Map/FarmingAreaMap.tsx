import React, { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
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

interface FarmingAreaMapProps {
  coordinates?: Coordinates;
  title?: string;
  address?: string;
  height?: number;
  interactive?: boolean;
}

const markerIcon = createMapPinIcon();

const FarmingAreaMap: React.FC<FarmingAreaMapProps> = ({
  coordinates,
  title = 'Ban do vung trong',
  address,
  height = 220,
  interactive = false,
}) => {
  const center = hasValidCoordinates(coordinates)
    ? coordinates
    : DEFAULT_MAP_CENTER;

  const mapLink = useMemo(
    () =>
      `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=15/${center.lat}/${center.lng}`,
    [center]
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
            {title}
          </div>
          <div
            style={{
              fontSize: typography.sizes.xs,
              color: colors.textSecondary,
              maxWidth: 460,
            }}
          >
            {address || 'Chua co dia chi cu the cho vi tri nay.'}
          </div>
        </div>
        <a
          href={mapLink}
          target="_blank"
          rel="noreferrer"
          style={{
            color: colors.primary[700],
            textDecoration: 'none',
            fontWeight: typography.weights.semibold,
            fontSize: typography.sizes.sm,
          }}
        >
          Mo ban do lon
        </a>
      </div>

      <div
        style={{
          position: 'relative',
          height,
          borderRadius: borderRadius['2xl'],
          overflow: 'hidden',
          border: `1px solid ${colors.neutral[200]}`,
          boxShadow: shadows.md,
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={interactive}
          dragging={interactive}
          zoomControl={interactive}
          doubleClickZoom={interactive}
          attributionControl
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {hasValidCoordinates(coordinates) && (
            <Marker
              position={[coordinates.lat, coordinates.lng]}
              icon={markerIcon as L.Icon | L.DivIcon}
            />
          )}
        </MapContainer>

        {!hasValidCoordinates(coordinates) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(244, 247, 244, 0.94) 0%, rgba(235, 244, 236, 0.94) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing[6],
              textAlign: 'center',
            }}
          >
            <div style={{ maxWidth: 360 }}>
              <div
                style={{
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.semibold,
                  color: colors.textPrimary,
                  marginBottom: spacing[2],
                }}
              >
                Chua co toa do
              </div>
              <div
                style={{
                  fontSize: typography.sizes.sm,
                  lineHeight: 1.7,
                  color: colors.textSecondary,
                }}
              >
                Nhap dia chi hoac chon vi tri tren ban do de hien thi vung trong
                mot cach truc quan.
              </div>
            </div>
          </div>
        )}
      </div>

      {hasValidCoordinates(coordinates) && (
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            flexWrap: 'wrap',
            marginTop: spacing[3],
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
            Lat: {formatCoordinate(coordinates.lat)}
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
            Lng: {formatCoordinate(coordinates.lng)}
          </span>
        </div>
      )}
    </div>
  );
};

export default FarmingAreaMap;
