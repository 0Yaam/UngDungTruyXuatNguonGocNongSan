import axiosClient from './axiosClient';
import type {
  CreateProductResponse,
  InventoryTransaction,
  LiveCamera,
  Product,
  SupplyChainRecord,
} from '../types';

export interface CreateProductData {
  name: string;
  category: string;
  type: 'Plant' | 'Animal';
  description?: string;
  origin: string;
  cultivation_time?: string;
  initial_quantity?: number;
  current_quantity?: number;
  unit?: string;
  farming_area?: string;
  images?: { path: string; filename: string }[];
  live_cameras?: LiveCamera[];
}

export interface UpdateProductData
  extends Partial<Omit<CreateProductData, 'initial_quantity' | 'current_quantity' | 'unit'>> {
  status?: Product['status'];
  live_cameras?: LiveCamera[];
}

export const productApi = {
  getAll: () =>
    axiosClient.get<{ products: Product[]; count: number }>('/products'),

  getMine: () =>
    axiosClient.get<{ products: Product[]; count: number }>(
      '/products/my/products'
    ),

  getById: (id: string) =>
    axiosClient.get<{ product: Product }>(`/products/${id}`),

  getTrash: () =>
    axiosClient.get<{ products: Product[]; count: number }>('/products/trash'),

  create: (data: CreateProductData) =>
    axiosClient.post<CreateProductResponse>('/products', data),

  update: (id: string, data: UpdateProductData) =>
    axiosClient.patch<{ product: Product }>(`/products/${id}`, data),

  getInventory: (id: string) =>
    axiosClient.get<{ product: Product; transactions: InventoryTransaction[] }>(
      `/products/${id}/inventory`
    ),

  adjustInventory: (
    id: string,
    data: { type: 'IN' | 'OUT'; quantity: number; note?: string }
  ) =>
    axiosClient.post<{ product: Product; transaction: InventoryTransaction }>(
      `/products/${id}/inventory/adjust`,
      data
    ),

  split: (
    id: string,
    data: {
      quantity: number;
      note?: string;
      children: Array<
        Partial<CreateProductData> & {
          name?: string;
          quantity: number;
          status?: Product['status'];
        }
      >;
    }
  ) =>
    axiosClient.post<{
      source: Product;
      children: Product[];
      transaction: InventoryTransaction;
      supplyChainRecord: SupplyChainRecord;
      balance: { input: number; output: number; balanced: boolean };
    }>(`/products/${id}/split`, data),

  merge: (data: {
    sources: Array<{ product: string; quantity?: number }>;
    target?: Partial<CreateProductData> & {
      name?: string;
      status?: Product['status'];
    };
    target_quantity?: number;
    note?: string;
  }) =>
    axiosClient.post<{
      target: Product;
      sources: Product[];
      transaction: InventoryTransaction;
      supplyChainRecord: SupplyChainRecord;
      balance: { input: number; output: number; balanced: boolean };
    }>('/products/merge', data),

  recall: (
    id: string,
    data: {
      quantity?: number;
      reason: string;
      note?: string;
      occurred_at?: string;
      location?: string;
      status?: 'IN_PROGRESS' | 'COMPLETED';
    }
  ) =>
    axiosClient.post<{
      product: Product;
      transaction: InventoryTransaction;
      supplyChainRecord: SupplyChainRecord;
      balance: { input: number; output: number; recalled: number; balanced: boolean };
    }>(`/products/${id}/recall`, data),

  delete: (id: string) =>
    axiosClient.delete(`/products/${id}`),

  restore: (id: string) =>
    axiosClient.post<{ product: Product; msg: string }>(
      `/products/${id}/restore`
    ),

  permanentDelete: (id: string) =>
    axiosClient.delete<{ msg: string }>(`/products/${id}/permanent`),
};
