import { auth } from './firebase';

const API_BASE_URL = '';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('User not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  
  // Handle backend responses that might be arrays directly or wrapped
  if (Array.isArray(data)) {
      return data;
  }
  
  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data.data !== undefined ? data.data : data;
}
