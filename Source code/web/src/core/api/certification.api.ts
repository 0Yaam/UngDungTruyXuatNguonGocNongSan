import axiosClient from './axiosClient';

export interface Certification {
  _id: string;
  name: string;
  type: 'VietGAP' | 'GlobalGAP' | 'Organic' | 'HACCP' | 'ISO22000' | 'Other';
  issuing_authority: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  scope?: string;
  document_url?: string;
  status: 'valid' | 'expired' | 'revoked';
  holder: { _id: string; first_name: string; last_name: string; email: string };
  farming_area?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificationData {
  name: string;
  type: Certification['type'];
  issuing_authority: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  scope?: string;
  document_url?: string;
  farming_area?: string;
}

export const certificationApi = {
  getAll: () =>
    axiosClient.get<{ certifications: Certification[]; count: number }>('/certifications'),

  getById: (id: string) =>
    axiosClient.get<{ certification: Certification }>(`/certifications/${id}`),

  getByHolder: (userId: string) =>
    axiosClient.get<{ certifications: Certification[]; count: number }>(`/certifications/holder/${userId}`),

  create: (data: CreateCertificationData) =>
    axiosClient.post<{ certification: Certification }>('/certifications', data),

  update: (id: string, data: Partial<CreateCertificationData>) =>
    axiosClient.patch<{ certification: Certification }>(`/certifications/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete(`/certifications/${id}`),
};
