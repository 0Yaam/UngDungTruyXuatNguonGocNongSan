import axiosClient from './axiosClient';

export interface FarmingArea {
  _id: string;
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  area_size?: number;
  description?: string;
  owner: { _id: string; first_name: string; last_name: string; email: string };
  images: { path: string; filename: string }[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmingAreaData {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  area_size?: number;
  description?: string;
}

export const farmingAreaApi = {
  getAll: () =>
    axiosClient.get<{ farmingAreas: FarmingArea[]; count: number }>('/farming-areas'),

  getById: (id: string) =>
    axiosClient.get<{ farmingArea: FarmingArea }>(`/farming-areas/${id}`),

  getMyAreas: () =>
    axiosClient.get<{ farmingAreas: FarmingArea[]; count: number }>('/farming-areas/my/areas'),

  create: (data: CreateFarmingAreaData) =>
    axiosClient.post<{ farmingArea: FarmingArea }>('/farming-areas', data),

  update: (id: string, data: Partial<CreateFarmingAreaData>) =>
    axiosClient.patch<{ farmingArea: FarmingArea }>(`/farming-areas/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete(`/farming-areas/${id}`),
};
