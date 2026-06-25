export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

const STORAGE_KEY = 'offline_service_requests';

export function getQueue(): QueuedRequest[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp'>) {
  const queue = getQueue();
  const newItem: QueuedRequest = {
    ...request,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  queue.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string) {
  const queue = getQueue();
  const filtered = queue.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearQueue() {
  localStorage.removeItem(STORAGE_KEY);
}
