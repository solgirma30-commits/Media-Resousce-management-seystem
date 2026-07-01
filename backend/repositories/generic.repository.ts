import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');

function readDb(): Record<string, Record<string, any>> {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read DB_FILE, starting fresh.', e);
  }
  return {};
}

function writeDb(data: Record<string, Record<string, any>>) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function validateCollectionName(name: string): string {
  const allowed = [
    'users', 'department_updates', 'notifications', 'sim_sms_logs', 'fleet',
    'service_requests', 'camera_requests', 'studio_requests', 'vehicle_requests',
    'item_requests', 'device_requests', 'guest_requests'
  ];
  const cleaned = name.trim();
  if (allowed.includes(cleaned)) return cleaned;
  throw new Error(`Unauthorized or invalid collection access: ${name}`);
}

export const GenericRepository = {
  async getDocument(collectionName: string, id: string): Promise<any | null> {
    const table = validateCollectionName(collectionName);
    const db = readDb();
    if (!db[table]) return null;
    return db[table][id] || null;
  },

  async createDocument(collectionName: string, id: string | undefined, data: any): Promise<any> {
    const table = validateCollectionName(collectionName);
    const db = readDb();
    if (!db[table]) db[table] = {};
    
    const idCol = table === 'users' ? 'uid' : 'id';
    const finalId = id || data.id || data.uid || Math.random().toString(36).substring(2, 15);
    
    const now = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    const existing = db[table][finalId] || {};
    
    const newData = {
      ...existing,
      ...data,
      id: finalId,
      updatedAt: now
    };
    if (idCol === 'uid') newData.uid = finalId;
    if (!existing.createdAt && !newData.createdAt) {
      newData.createdAt = now;
    }
    
    db[table][finalId] = newData;
    writeDb(db);
    return newData;
  },

  async listDocuments(collectionName: string, filters: Record<string, any> = {}): Promise<any[]> {
    const table = validateCollectionName(collectionName);
    const db = readDb();
    if (!db[table]) return [];
    
    let results = Object.values(db[table]);
    
    for (const key of Object.keys(filters)) {
      const val = filters[key];
      if (val !== undefined && val !== null) {
        results = results.filter(item => item[key] === val);
      }
    }
    
    results.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    return results;
  },

  async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    const table = validateCollectionName(collectionName);
    const db = readDb();
    if (db[table] && db[table][id]) {
      delete db[table][id];
      writeDb(db);
    }
    return true;
  }
};
