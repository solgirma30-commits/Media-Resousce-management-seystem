import { addToQueue } from '../utils/offlineQueue';

export function useOfflineQueue() {
  const queueRequest = (url: string, method: string, body: any) => {
    if (!navigator.onLine) {
      addToQueue({ url, method, body });
      return true; // Queued
    }
    return false; // Not queued
  };
  return { queueRequest };
}
