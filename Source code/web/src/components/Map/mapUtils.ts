import L from 'leaflet';
import type { Coordinates } from '../../core/api/location.api';

export type { Coordinates };

export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 11.94042,
  lng: 108.45831,
};

export const DEFAULT_MAP_ZOOM = 15;

export const isValidCoordinate = (
  value: number,
  min: number,
  max: number
) => Number.isFinite(value) && value >= min && value <= max;

export const hasValidCoordinates = (
  coordinates?: Coordinates
): coordinates is Coordinates =>
  Boolean(
    coordinates &&
      isValidCoordinate(coordinates.lat, -90, 90) &&
      isValidCoordinate(coordinates.lng, -180, 180)
  );

export const formatCoordinate = (value: number) => value.toFixed(6);

export const createMapPinIcon = (label = 'o') =>
  L.divIcon({
    className: 'agri-map-pin',
    html: `
      <div class="agri-map-pin__core">
        <span>${label}</span>
      </div>
      <div class="agri-map-pin__shadow"></div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 40],
  });
