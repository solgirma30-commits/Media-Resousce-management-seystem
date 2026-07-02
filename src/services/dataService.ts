import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiRequest<T>(method: string, endpoint: string, body?: any, queryParams: Record<string, any> = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  
  let url = `${API_BASE_URL}/api${endpoint}`;
  const searchParams = new URLSearchParams();
  Object.keys(queryParams).forEach(key => {
    const val = queryParams[key];
    if (val !== undefined && val !== null) {
      searchParams.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
  });
  
  const queryString = searchParams.toString();
  if (queryString) url += (url.includes('?') ? '&' : '?') + queryString;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `API request failed with status ${res.status}`);
  }
  
  // Unwrap standard backend response { success: true, data: ... }
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data;
  }
  
  return data;
}

export const dataService = {
  // Generic collection operations
  list: <T>(collection: string, filters: Record<string, any> = {}) => {
    const queryParams: Record<string, any> = {};
    Object.keys(filters).forEach(key => {
      queryParams[`where_${key}_==`] = filters[key];
    });
    return apiRequest<T[]>('GET', `/collections/${collection}`, null, queryParams);
  },
  
  get: <T>(collection: string, id: string) => 
    apiRequest<T>('GET', `/collections/${collection}/${id}`),
  
  create: <T>(collection: string, data: any, id?: string) => 
    apiRequest<T>('POST', `/collections/${collection}`, { id, data }),
  
  update: <T>(collection: string, id: string, data: any) => 
    apiRequest<T>('PATCH', `/collections/${collection}/${id}`, data),
  
  delete: (collection: string, id: string) => 
    apiRequest<void>('DELETE', `/collections/${collection}/${id}`),

  // Specialized methods matching existing backend routes
  getDepartmentUpdates: (department?: string) => 
    apiRequest<any[]>('GET', '/department-updates', null, department ? { department } : {}),
    
  addDepartmentUpdate: (update: { department: string, message: string, sender: string }) =>
    apiRequest<any>('POST', '/department-updates', update),
    
  getNotifications: (userId: string) =>
    apiRequest<any[]>('GET', '/notifications', null, { userId }),
    
  updateNotification: (id: string, data: any) =>
    apiRequest<any>('PATCH', `/notifications/${id}`, data),
    
  getFirebaseUsers: () =>
    apiRequest<any[]>('GET', '/firebase-users'),
    
  transcribeAudio: (audioBase64: string, mimeType: string) =>
    apiRequest<{ text: string }>('POST', '/transcribe', { audioBase64, mimeType }),
    
  dispatchPersonnel: (data: any) =>
    apiRequest<any>('POST', '/dispatch-personnel', data),
    
  registerFcmToken: (userId: string, fcmToken: string) =>
    apiRequest<any>('POST', '/register-fcm-token', { userId, fcmToken }),
    
  sendFcmNotification: (data: any) =>
    apiRequest<any>('POST', '/send-fcm-notification', data),
    
  sendSms: (to: string, message: string) =>
    apiRequest<any>('POST', '/send-sms', { to, message }),
    
  createNotification: (data: any) =>
    apiRequest<any>('POST', '/collections/notifications', { data }),
};
