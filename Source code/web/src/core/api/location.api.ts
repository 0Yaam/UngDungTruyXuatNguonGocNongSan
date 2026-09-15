export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  displayName: string;
  coordinates: Coordinates;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const buildHeaders = () =>
  new Headers({
    Accept: 'application/json',
    'Accept-Language': 'vi',
  });

const normalizeSuggestion = (item: any): LocationSuggestion => ({
  id: item.place_id?.toString() || `${item.lat}-${item.lon}`,
  name: item.name || item.display_name?.split(',')[0] || 'Vi tri da tim thay',
  displayName: item.display_name || '',
  coordinates: {
    lat: Number(item.lat),
    lng: Number(item.lon),
  },
});

export const locationApi = {
  async searchAddress(
    query: string,
    signal?: AbortSignal
  ): Promise<LocationSuggestion[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return [];
    }

    const params = new URLSearchParams({
      q: trimmedQuery,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'vn',
    });

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
      {
        method: 'GET',
        headers: buildHeaders(),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error('Khong the tim vi tri luc nay');
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map(normalizeSuggestion)
      .filter(
        (item) =>
          Number.isFinite(item.coordinates.lat) &&
          Number.isFinite(item.coordinates.lng)
      );
  },

  async reverseGeocode(
    coordinates: Coordinates,
    signal?: AbortSignal
  ): Promise<LocationSuggestion | null> {
    const params = new URLSearchParams({
      lat: coordinates.lat.toString(),
      lon: coordinates.lng.toString(),
      format: 'jsonv2',
      zoom: '18',
      addressdetails: '1',
    });

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
      {
        method: 'GET',
        headers: buildHeaders(),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error('Khong the lay dia chi tu toa do');
    }

    const payload = await response.json();
    if (!payload || !payload.lat || !payload.lon) {
      return null;
    }

    return normalizeSuggestion(payload);
  },
};
