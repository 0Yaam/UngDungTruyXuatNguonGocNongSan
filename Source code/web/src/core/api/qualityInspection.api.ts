import axiosClient from './axiosClient';
import type { InspectionMetric, QualityInspection } from '../types';

export type QualityInspectionInput = {
  product: string;
  report_number: string;
  inspection_type: QualityInspection['inspection_type'];
  laboratory: string;
  sample_date: string;
  result_date?: string;
  result: QualityInspection['result'];
  summary?: string;
  document_url?: string;
  metrics?: InspectionMetric[];
};

export const qualityInspectionApi = {
  getAll: (params?: { product?: string; result?: string; inspection_type?: string }) =>
    axiosClient.get<{ inspections: QualityInspection[]; count: number }>(
      '/quality-inspections',
      { params }
    ),
  getByProduct: (productId: string) =>
    axiosClient.get<{ inspections: QualityInspection[]; count: number }>(
      `/quality-inspections/product/${productId}`
    ),
  create: (data: QualityInspectionInput) =>
    axiosClient.post<{ inspection: QualityInspection }>('/quality-inspections', data),
  update: (id: string, data: Partial<QualityInspectionInput>) =>
    axiosClient.patch<{ inspection: QualityInspection }>(
      `/quality-inspections/${id}`,
      data
    ),
  delete: (id: string) => axiosClient.delete(`/quality-inspections/${id}`),
};
