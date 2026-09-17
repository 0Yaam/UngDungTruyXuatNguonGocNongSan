import axiosClient from './axiosClient';
import type {
  InventoryTransaction,
  Product,
  SupplyChainOrganization,
  SupplyChainRecord,
} from '../types';

export const supplyChainApi = {
  getOrganizations: () => axiosClient.get<{ organizations: SupplyChainOrganization[]; count: number }>('/supply-chain/organizations'),
  createOrganization: (data: Partial<SupplyChainOrganization>) => axiosClient.post<{ organization: SupplyChainOrganization }>('/supply-chain/organizations', data),
  updateOrganization: (id: string, data: Partial<SupplyChainOrganization>) => axiosClient.patch<{ organization: SupplyChainOrganization }>(`/supply-chain/organizations/${id}`, data),
  deleteOrganization: (id: string) => axiosClient.delete(`/supply-chain/organizations/${id}`),
  getRecords: (params?: { operation_type?: string; status?: string; product?: string }) => axiosClient.get<{ records: SupplyChainRecord[]; count: number }>('/supply-chain/records', { params }),
  getByProduct: (productId: string) => axiosClient.get<{ records: SupplyChainRecord[]; count: number }>(`/supply-chain/records/product/${productId}`),
  getLineage: (productId: string) =>
    axiosClient.get<{
      product: Product;
      parent: Product | null;
      sources: Product[];
      derivedProducts: Product[];
      transactions: InventoryTransaction[];
      records: SupplyChainRecord[];
    }>(`/supply-chain/lineage/${productId}`),
  createRecord: (data: Record<string, unknown>) => axiosClient.post<{ record: SupplyChainRecord }>('/supply-chain/records', data),
  updateRecord: (id: string, data: Partial<SupplyChainRecord>) => axiosClient.patch<{ record: SupplyChainRecord }>(`/supply-chain/records/${id}`, data),
  deleteRecord: (id: string) => axiosClient.delete(`/supply-chain/records/${id}`),
};
