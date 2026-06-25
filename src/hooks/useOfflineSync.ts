import { useEffect } from 'react';
import { getQueue, removeFromQueue } from '../utils/offlineQueue';
import { toast } from 'react-hot-toast';

export function useOfflineSync() {
  useEffect(() => {
    const handleOnline = async () => {
      const queue = getQueue();
      if (queue.length === 0) return;

      toast.success('Connection restored. Syncing pending requests...');

      for (const request of queue) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
          });
          
          if (response.ok) {
            removeFromQueue(request.id);
          } else {
            console.error('Failed to sync queued request', request, await response.text());
          }
        } catch (error) {
          console.error('Failed to sync queued request', request, error);
        }
      }
      
      if (getQueue().length === 0) {
        toast.success('All pending requests synced.');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}
