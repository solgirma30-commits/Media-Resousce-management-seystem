import { auth } from './firebase';
import { toast } from 'react-hot-toast';

export function getApiBaseUrl(): string {
  let rawApiUrl: string;
  
  try {
    const fromProcess = typeof process !== 'undefined' && process?.env ? process.env.NEXT_PUBLIC_API_URL : undefined;
    const fromMetaNext = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.NEXT_PUBLIC_API_URL : undefined;
    const fromMetaVite = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env.VITE_API_BASE_URL : undefined;
    
    rawApiUrl = String(fromProcess || fromMetaNext || fromMetaVite || '').trim();
  } catch {
    rawApiUrl = '';
  }

  let baseUrl = rawApiUrl;

  // Clear if it's literally a string "undefined", "null", or some placeholder object, or if it doesn't look like a URL/path
  if (
    !baseUrl || 
    baseUrl === 'undefined' || 
    baseUrl === 'null' || 
    baseUrl === '[object Object]' ||
    (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://') && !baseUrl.startsWith('/'))
  ) {
    baseUrl = '';
  }

  const isFrontendDeployed = typeof window !== 'undefined' && 
    window.location && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';

  if (isFrontendDeployed) {
    // If the user has explicitly specified an external API URL (like ngrok), use it.
    // Otherwise, block any local/internal-IP base URLs to avoid sandbox/unreachable errors.
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('10.')) {
      baseUrl = '';
    }
  }

  // Normalize base: remove trailing slashes
  if (baseUrl) {
    if (baseUrl.includes('http:/') && !baseUrl.includes('http://')) {
      baseUrl = baseUrl.replace(/http:\/+(?!\/)/g, 'http://');
    }
    if (baseUrl.includes('https:/') && !baseUrl.includes('https://')) {
      baseUrl = baseUrl.replace(/https:\/+(?!\/)/g, 'https://');
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // Default to relative path ("") if no external API URL is specified.
  // This is highly robust and avoids iframe sandbox/CORS issues.
  if (!baseUrl) {
    baseUrl = '';
  }

  return baseUrl;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit & { queryParams?: Record<string, any> } = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const baseUrl = getApiBaseUrl();
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const { queryParams, ...fetchOptions } = options;

  const buildUrl = (base: string) => {
    let fullUrl: string;
    const cleanBase = base.replace(/\/+$/, '');
    
    if (cleanBase) {
      if (cleanBase.endsWith('/api')) {
        if (cleanPath.startsWith('/api/')) {
          fullUrl = `${cleanBase}${cleanPath.substring(4)}`;
        } else {
          fullUrl = `${cleanBase}${cleanPath}`;
        }
      } else {
        if (cleanPath.startsWith('/api/')) {
          fullUrl = `${cleanBase}${cleanPath}`;
        } else {
          fullUrl = `${cleanBase}/api${cleanPath}`;
        }
      }
    } else {
      if (cleanPath.startsWith('/api/')) {
        fullUrl = cleanPath;
      } else {
        fullUrl = `/api${cleanPath}`;
      }
    }

    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.keys(queryParams).forEach(key => {
        const val = queryParams[key];
        if (val !== undefined && val !== null) {
          searchParams.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    return fullUrl;
  };

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const primaryUrl = buildUrl(baseUrl);
  
  const executeFetch = async (url: string) => {
    console.log(`[API Request] fetching: ${url}`, { method: fetchOptions.method || 'GET' });
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    console.log(`[API Response] ${url} status: ${res.status}`, data);
    
    if (!res.ok) {
      throw new Error(data.message || `API request failed with status ${res.status}`);
    }

    // Unwrap standard backend response { success: true, data: ... }
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      return data.data;
    }
    return data;
  };

  try {
    return await executeFetch(primaryUrl);
  } catch (err: any) {
    console.error('[API Request Error]', { url: primaryUrl, errorName: err?.name, errorMessage: err?.message, error: err });
    
    const msgLower = (err?.message || '').toLowerCase();
    const isNetworkError = 
      err?.name === 'TypeError' && (
        msgLower.includes('failed to fetch') || 
        msgLower.includes('network') || 
        msgLower.includes('load failed') ||
        msgLower.includes('cors') ||
        msgLower.includes('origin')
      );
    
    if (isNetworkError) {
      const msg = `Unable to connect to the backend server. Please verify your connection or NEXT_PUBLIC_API_URL.`;
      toast.error(msg, { id: 'backend-unreachable-error' });
      throw new Error(msg, { cause: err });
    }
    
    throw err;
  }
}
