import apiClient from './apiClient';
import type { OutstandingTab, CreateTabDto } from '@barbasys/shared';

export const tabsApi = {
  list: (params?: { status?: string; barberId?: number }) =>
    apiClient.get<OutstandingTab[]>('/tabs', { params }),

  getById: (id: string) =>
    apiClient.get<OutstandingTab>(`/tabs/${id}`),

  create: (data: CreateTabDto) =>
    apiClient.post<OutstandingTab>('/tabs', data),

  remind: (id: string) =>
    apiClient.post<{ status: string }>(`/tabs/${id}/remind`),

  remindBulk: (tabIds: string[]) =>
    apiClient.post<Array<{ id: string; ok: boolean; error?: string }>>('/tabs/remind-bulk', { tabIds }),

  markPaid: (id: string, method: 'cash' | 'bank_transfer', tipAmount: number) =>
    apiClient.post<{ saleId: number }>(`/tabs/${id}/pay`, { method, tipAmount }),

  getByCustomer: (customerId: number) =>
    apiClient.get<OutstandingTab[]>(`/customers/${customerId}/tabs`),
};
