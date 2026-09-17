import axiosClient from './axiosClient';

export interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  products: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  traceEvents: {
    total: number;
    thisWeek: number;
    byOnChainStatus: Record<string, number>;
    byEventType: Record<string, number>;
  };
  recentActivity: {
    newUsers: number;
    newProducts: number;
    newTraceEvents: number;
  };
}

export interface AdminUser {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: string;
  role: 'admin' | 'manager' | 'farmer' | 'consumer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: { status: 'connected' | 'disconnected'; name?: string };
  blockchain: { status: 'connected' | 'disconnected' | 'error'; network?: string; blockNumber?: number; error?: string };
  timestamp: string;
}

export const adminApi = {
  getDashboard: () =>
    axiosClient.get<{ stats: DashboardStats }>('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; role?: string; isActive?: string; search?: string }) =>
    axiosClient.get<PaginatedUsers>('/admin/users', { params }),

  updateUserRole: (userId: string, role: AdminUser['role']) =>
    axiosClient.patch<{ user: AdminUser; msg: string }>(`/admin/users/${userId}/role`, { role }),

  toggleUserStatus: (userId: string, isActive: boolean) =>
    axiosClient.patch<{ user: AdminUser; msg: string }>(`/admin/users/${userId}/status`, { isActive }),

  deleteUser: (userId: string) =>
    axiosClient.delete<{ message: string }>(`/admin/users/${userId}`),

  getHealth: () =>
    axiosClient.get<SystemHealth>('/admin/health'),
};
