import { apiRequest } from '../lib/api';

export const dataService = {
  // Generic collection operations
  list: <T>(collection: string, filters: Record<string, any> = {}) => {
    const queryParams: Record<string, any> = {};
    Object.keys(filters).forEach(key => {
      queryParams[`where_${key}_==`] = filters[key];
    });
    return apiRequest<T[]>(`/collections/${collection}`, { queryParams });
  },
  
  get: <T>(collection: string, id: string) => 
    apiRequest<T>(`/collections/${collection}/${id}`),
  
  create: <T>(collection: string, data: any, id?: string) => 
    apiRequest<T>(`/collections/${collection}`, { method: 'POST', body: JSON.stringify({ id, data }) }),
  
  update: <T>(collection: string, id: string, data: any) => 
    apiRequest<T>(`/collections/${collection}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  delete: (collection: string, id: string) => 
    apiRequest<void>(`/collections/${collection}/${id}`, { method: 'DELETE' }),

  upsert: async <T>(collection: string, id: string, data: any) => {
    try {
      // Try to update first
      return await dataService.update<T>(collection, id, data);
    } catch (_error) {
      // If update fails (likely 404), try to create
      return await dataService.create<T>(collection, data, id);
    }
  },

  // Specialized methods matching existing backend routes
  getDepartmentUpdates: (department?: string) => 
    apiRequest<any[]>('/department-updates', { queryParams: department ? { department } : {} }),
    
  addDepartmentUpdate: (update: { department: string, message: string, sender: string }) =>
    apiRequest<any>('/department-updates', { method: 'POST', body: JSON.stringify(update) }),
    
  getNotifications: (userId: string) =>
    apiRequest<any[]>('/notifications', { queryParams: { userId } }),
    
  updateNotification: (id: string, data: any) =>
    apiRequest<any>(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
  getFirebaseUsers: () =>
    apiRequest<any[]>('/firebase-users'),
    
  transcribeAudio: (audioBase64: string, mimeType: string) =>
    apiRequest<{ text: string }>('/transcribe', { method: 'POST', body: JSON.stringify({ audioBase64, mimeType }) }),
    
  dispatchPersonnel: (data: any) =>
    apiRequest<any>('/dispatch-personnel', { method: 'POST', body: JSON.stringify(data) }),
    
  registerFcmToken: (userId: string, fcmToken: string) =>
    apiRequest<any>('/register-fcm-token', { method: 'POST', body: JSON.stringify({ userId, fcmToken }) }),
    
  sendFcmNotification: (data: any) =>
    apiRequest<any>('/send-fcm-notification', { method: 'POST', body: JSON.stringify(data) }),
    
  sendSms: (to: string, message: string) =>
    apiRequest<any>('/send-sms', { method: 'POST', body: JSON.stringify({ to, message }) }),
    
  createNotification: (data: any) =>
    apiRequest<any>('/collections/notifications', { method: 'POST', body: JSON.stringify({ data }) }),
};
