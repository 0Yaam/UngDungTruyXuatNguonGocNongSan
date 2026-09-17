import axiosClient from './axiosClient';
import type {
  DiseaseDetection,
  DiseaseDetectionCapabilities,
  DiseaseRiskLevel,
} from '../types';

export interface DiseaseDetectionInput {
  product: string;
  crop_name?: string;
  symptoms: string[];
  notes?: string;
  images: File[];
}

const toFormData = (data: DiseaseDetectionInput) => {
  const formData = new FormData();
  formData.append('product', data.product);
  if (data.crop_name) formData.append('crop_name', data.crop_name);
  if (data.notes) formData.append('notes', data.notes);
  formData.append('symptoms', JSON.stringify(data.symptoms));
  (data.images || []).forEach((file) => formData.append('images', file));
  return formData;
};

export const diseaseDetectionApi = {
  getCapabilities: (productId?: string) =>
    axiosClient.get<DiseaseDetectionCapabilities>(
      '/disease-detections/capabilities',
      { params: productId ? { product: productId } : undefined }
    ),
  getAll: (params?: { product?: string; risk?: DiseaseRiskLevel }) =>
    axiosClient.get<{ detections: DiseaseDetection[]; count: number }>(
      '/disease-detections',
      { params }
    ),
  getByProduct: (productId: string) =>
    axiosClient.get<{ detections: DiseaseDetection[]; count: number }>(
      `/disease-detections/product/${productId}`
    ),
  create: (data: DiseaseDetectionInput) =>
    axiosClient.post<{ detection: DiseaseDetection; msg: string }>(
      '/disease-detections',
      toFormData(data),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  delete: (id: string) => axiosClient.delete(`/disease-detections/${id}`),
};
