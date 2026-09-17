import axiosClient from './axiosClient';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post<AuthResponse>('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string }) =>
    axiosClient.post<AuthResponse>('/auth/register', data),

  getProfile: () =>
    axiosClient.get('/auth/profile'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    avatar?: string;
  }) =>
    axiosClient.patch<{ user: User }>('/users/update', data),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    axiosClient.post<{ msg: string }>('/auth/change-password', data),
};
