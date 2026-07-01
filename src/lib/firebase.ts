import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App for Auth and Storage only
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const storage = getStorage(app);

// --- REST API BACKEND CLIENT (Firestore Replacement) ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Minimal Firestore-like classes to maintain component compatibility
export class DocumentReference {
  constructor(public path: string, public id: string) {}
}

export class CollectionReference {
  constructor(public path: string) {}
}

export class Query {
  public constraints: any[] = [];
  constructor(public collection: CollectionReference) {}
}

export const collection = (db: any, path: string) => new CollectionReference(path);
export const doc = (dbOrCollection: any, pathOrId: string, ...rest: string[]) => {
  if (dbOrCollection instanceof CollectionReference) {
    return new DocumentReference(dbOrCollection.path, pathOrId);
  }
  // db, collectionName, id
  return new DocumentReference(pathOrId, rest[0]);
};

export const query = (col: CollectionReference, ...constraints: any[]) => {
  const q = new Query(col);
  q.constraints = constraints;
  return q;
};

export const where = (field: string, op: string, value: any) => ({ type: 'where', field, op, value });
export const limit = (n: number) => ({ type: 'limit', value: n });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'orderBy', field, dir });

// Helper for REST requests
async function apiRequest(method: string, path: string, body?: any, queryParams: Record<string, any> = {}) {
  const token = await auth.currentUser?.getIdToken();
  
  let url = `/api/collections/${path}`;
  const searchParams = new URLSearchParams();
  Object.keys(queryParams).forEach(key => {
    searchParams.append(key, typeof queryParams[key] === 'object' ? JSON.stringify(queryParams[key]) : queryParams[key]);
  });
  
  const queryString = searchParams.toString();
  if (queryString) url += `?${queryString}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${res.status}`);
  }
  return res.json();
}

function hydrateTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(hydrateTimestamps);
  }

  if (Object.keys(obj).length === 2 && typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
    return new Timestamp(obj.seconds, obj.nanoseconds);
  }

  const hydrated: any = {};
  for (const [key, value] of Object.entries(obj)) {
    hydrated[key] = hydrateTimestamps(value);
  }
  return hydrated;
}

export const getDocs = async (q: Query | CollectionReference) => {
  const path = q instanceof CollectionReference ? q.path : q.collection.path;
  const queryParams: Record<string, any> = {};
  
  if (q instanceof Query) {
    q.constraints.forEach(c => {
      if (c.type === 'where') {
        queryParams[`where_${c.field}_${c.op}`] = c.value;
      }
    });
  }

  try {
    const data = await apiRequest('GET', path, null, queryParams);
    const hydratedData = hydrateTimestamps(data);
    
    const docs = Array.isArray(hydratedData) ? hydratedData.map((d: any) => ({
      id: d.id,
      ref: new DocumentReference(path, d.id),
      data: () => d,
      exists: () => true
    })) : [];

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      docChanges: () => [],
      forEach: (cb: any) => docs.forEach((d: any) => cb(d)),
      metadata: { fromCache: false }
    };
  } catch (error) {
    console.error(`getDocs error on ${path}:`, error);
    return {
      docs: [],
      size: 0,
      empty: true,
      docChanges: () => [],
      forEach: () => {},
      metadata: { fromCache: false }
    };
  }
};

export const getDoc = async (docRef: DocumentReference) => {
  try {
    const data = await apiRequest('GET', `${docRef.path}/${docRef.id}`);
    const hydratedData = hydrateTimestamps(data);
    return {
      id: docRef.id,
      ref: docRef,
      exists: () => !!hydratedData,
      data: () => hydratedData,
      docChanges: () => [] // Added for compatibility
    };
  } catch (e: any) {
    if (e.message.includes('404')) return { id: docRef.id, ref: docRef, exists: () => false, data: () => null, docChanges: () => [] };
    throw e;
  }
};

export const setDoc = async (docRef: DocumentReference, data: any, options: any = {}) => {
  return apiRequest('POST', docRef.path, { id: docRef.id, data, merge: options.merge });
};

export const addDoc = async (colRef: CollectionReference, data: any) => {
  const res = await apiRequest('POST', colRef.path, { data });
  return { id: res.data.id, path: `${colRef.path}/${res.data.id}` };
};

export const updateDoc = async (docRef: DocumentReference, data: any) => {
  return apiRequest('PATCH', `${docRef.path}/${docRef.id}`, data);
};

export const deleteDoc = async (docRef: DocumentReference) => {
  return apiRequest('DELETE', `${docRef.path}/${docRef.id}`);
};

export const onSnapshot = (q: any, onNext: any, onError?: any) => {
  // Polling implementation for "real-time" feel without real-time SDK
  let isStopped = false;
  let lastDocIds = new Set<string>();
  let lastDataMap = new Map<string, string>();
  
  const fetch = async () => {
    if (isStopped) return;
    try {
      const snap = await (q instanceof DocumentReference ? getDoc(q) : getDocs(q));
      
      if (!isStopped) {
        if (!(q instanceof DocumentReference)) {
          const currentDocs = (snap as any).docs;
          const docChanges: any[] = [];

          currentDocs.forEach((d: any) => {
            const data = d.data();
            const dataStr = JSON.stringify(data);
            
            if (!lastDocIds.has(d.id)) {
              docChanges.push({ type: 'added', doc: d });
            } else if (lastDataMap.get(d.id) !== dataStr) {
              docChanges.push({ type: 'modified', doc: d });
            }
          });

          // Also check for removed
          const currentDocIds = new Set<string>(currentDocs.map((d: any) => d.id));
          lastDocIds.forEach(id => {
            if (!currentDocIds.has(id)) {
              docChanges.push({ type: 'removed', doc: { id, data: () => ({}) } });
            }
          });

          // Update state for next poll
          lastDocIds = currentDocIds;
          lastDataMap = new Map<string, string>();
          currentDocs.forEach((d: any) => {
            lastDataMap.set(d.id, JSON.stringify(d.data()));
          });

          (snap as any).docChanges = () => docChanges;
        }
        
        onNext(snap);
      }
    } catch (e) {
      if (!isStopped && onError) onError(e);
    }
  };

  fetch();
  const interval = setInterval(fetch, 10000); // Poll every 10 seconds

  return () => {
    isStopped = true;
    clearInterval(interval);
  };
};

// Mock classes for complex types
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
}

export const serverTimestamp = () => ({ _type: 'serverTimestamp' });

export const collectionGroup = (db: any, name: string) => new CollectionReference(name);

export const runTransaction = async (db: any, updateFunction: (transaction: any) => Promise<any>) => {
  const transaction = {
    get: async (ref: DocumentReference) => getDoc(ref),
    set: (ref: DocumentReference, data: any, options: any) => setDoc(ref, data, options),
    update: (ref: DocumentReference, data: any) => updateDoc(ref, data),
    delete: (ref: DocumentReference) => deleteDoc(ref)
  };
  return updateFunction(transaction);
};

export const startAfter = (val: any) => ({ type: 'startAfter', value: val });

// Batch operations (minimal mock)
export const writeBatch = (db: any) => ({
  set: (ref: any, data: any, options: any) => setDoc(ref, data, options),
  update: (ref: any, data: any) => updateDoc(ref, data),
  delete: (ref: any) => deleteDoc(ref),
  commit: async () => { /* In this simple REST shim, we just execute immediately above */ }
});

export const db: any = { type: 'rest-api-shim' };

export async function getMessagingClient() {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn('FCM messaging is not supported in this browser environment:', err);
  }
  return null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`API Error (${operationType} on ${path}):`, error);
  throw error;
}
