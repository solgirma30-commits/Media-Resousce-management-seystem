import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;
const JSON_DB_PATH = path.join(process.cwd(), 'backend', 'database.json');

// Ensure directory exists
if (!fs.existsSync(path.join(process.cwd(), 'backend'))) {
  fs.mkdirSync(path.join(process.cwd(), 'backend'));
}

// Initial JSON DB structure
if (!fs.existsSync(JSON_DB_PATH)) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify({
    users: [],
    department_updates: [],
    notifications: [],
    fleet: [],
    service_requests: [],
    camera_requests: [],
    studio_requests: [],
    vehicle_requests: [],
    item_requests: [],
    device_requests: [],
    guest_requests: [],
    sim_sms_logs: []
  }, null, 2));
}

let useJsonFallback = false;

// Use environment variables for connection
const isDbUrlValid = !!(
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL !== 'undefined' &&
  process.env.DATABASE_URL.trim() !== '' &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

if (!isDbUrlValid) {
  delete process.env.DATABASE_URL;
}

const pool = new Pool(isDbUrlValid ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 2000,
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mydb',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 2000, // Fail fast to use fallback
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query(text: string, params?: any[]) {
  if (useJsonFallback) return null;
  return pool.query(text, params);
}

export async function initDb() {
  try {
    const client = await pool.connect();
    try {
      console.log('[DB Init] Initializing PostgreSQL tables...');
      
      // Create Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          email TEXT,
          display_name TEXT,
          photo_url TEXT,
          role TEXT DEFAULT 'NONE',
          approved BOOLEAN DEFAULT FALSE,
          phone_number TEXT,
          fcm_token TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Department Updates Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS department_updates (
          id TEXT PRIMARY KEY,
          department TEXT,
          message TEXT,
          sender TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Notifications Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT,
          body TEXT,
          read BOOLEAN DEFAULT FALSE,
          type TEXT,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Fleet Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS fleet (
          id TEXT PRIMARY KEY,
          name TEXT,
          type TEXT,
          status TEXT,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Requests Tables
      const requestTables = [
        'service_requests', 'camera_requests', 'studio_requests', 'vehicle_requests',
        'item_requests', 'device_requests', 'guest_requests', 'sim_sms_logs'
      ];

      for (const table of requestTables) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${table} (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            status TEXT DEFAULT 'PENDING',
            priority TEXT DEFAULT 'NORMAL',
            data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }

      console.log('[DB Init] All PostgreSQL tables initialized successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[DB Init Warning] PostgreSQL connection failed. Using JSON Fallback mode.', error instanceof Error ? error.message : error);
    useJsonFallback = true;
  }
}

// JSON DB Helpers
function readJsonDb() {
  return JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
}

function writeJsonDb(data: any) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
}

// Helper to convert Firestore-style objects to/from DB rows
function fromDb(row: any) {
  if (!row) return null;
  const { uid, created_at, updated_at, ...rest } = row;
  const id = row.id || uid;
  
  const parseDate = (d: any) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return { seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 };
  };

  const result: any = { 
    id,
    ...rest,
    createdAt: parseDate(created_at),
    updatedAt: parseDate(updated_at)
  };
  // Handle JSONB data field
  if (rest.data && typeof rest.data === 'object') {
    Object.assign(result, rest.data);
    delete result.data;
  }
  return result;
}

export async function getDocument(collectionName: string, id: string): Promise<any | null> {
  const table = validateCollectionName(collectionName);
  
  if (useJsonFallback) {
    const db = readJsonDb();
    const idCol = table === 'users' ? 'uid' : 'id';
    const row = db[table].find((r: any) => r[idCol] === id);
    return fromDb(row);
  }

  const idCol = table === 'users' ? 'uid' : 'id';
  try {
    const res = await pool.query(`SELECT * FROM ${table} WHERE ${idCol} = $1`, [id]);
    return fromDb(res.rows[0]);
  } catch (error) {
    console.error(`[DB Error] getDocument failed in ${table}:`, error);
    throw new Error(`Database operation failed.`, { cause: error });
  }
}

export async function createDocument(collectionName: string, id: string, data: any): Promise<any> {
  const table = validateCollectionName(collectionName);
  
  if (useJsonFallback) {
    const db = readJsonDb();
    const idCol = table === 'users' ? 'uid' : 'id';
    const index = db[table].findIndex((r: any) => r[idCol] === id);
    
    const row = {
      [idCol]: id,
      ...data,
      created_at: (data.createdAt && typeof data.createdAt.seconds === 'number' && !isNaN(data.createdAt.seconds)) 
        ? new Date(data.createdAt.seconds * 1000).toISOString() 
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (index >= 0) {
      db[table][index] = { ...db[table][index], ...row };
    } else {
      db[table].push(row);
    }
    
    writeJsonDb(db);
    return fromDb(row);
  }

  const idCol = table === 'users' ? 'uid' : 'id';
  try {
    const columns = [idCol];
    const values = [id];
    const placeholders = ['$1'];
    
    const schemaCols = table === 'users' 
      ? ['email', 'display_name', 'photo_url', 'role', 'approved', 'phone_number', 'fcm_token']
      : ['department', 'message', 'sender', 'user_id', 'status', 'priority'];

    const otherData: any = {};
    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'uid' || key === 'createdAt' || key === 'updatedAt') return;
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (schemaCols.includes(snakeKey)) {
        columns.push(snakeKey);
        values.push(data[key]);
        placeholders.push(`$${values.length}`);
      } else {
        otherData[key] = data[key];
      }
    });

    if (Object.keys(otherData).length > 0 && table !== 'department_updates' && table !== 'users') {
      columns.push('data');
      values.push(JSON.stringify(otherData));
      placeholders.push(`$${values.length}`);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (${idCol}) DO UPDATE SET
      ${columns.slice(1).map((col, i) => `${col} = $${i + 2}`).join(', ')},
      updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const res = await pool.query(query, values);
    return fromDb(res.rows[0]);
  } catch (error) {
    console.error(`[DB Error] createDocument failed in ${table}:`, error);
    throw new Error(`Database operation failed.`, { cause: error });
  }
}

export async function updateDocument(collectionName: string, id: string, data: any): Promise<any> {
  return createDocument(collectionName, id, data);
}

export async function deleteDocument(collectionName: string, id: string): Promise<boolean> {
  const table = validateCollectionName(collectionName);
  
  if (useJsonFallback) {
    const db = readJsonDb();
    const idCol = table === 'users' ? 'uid' : 'id';
    db[table] = db[table].filter((r: any) => r[idCol] !== id);
    writeJsonDb(db);
    return true;
  }

  const idCol = table === 'users' ? 'uid' : 'id';
  try {
    await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1`, [id]);
    return true;
  } catch (error) {
    console.error(`[DB Error] deleteDocument failed in ${table}:`, error);
    throw new Error(`Database operation failed.`, { cause: error });
  }
}

export async function listDocuments(collectionName: string, filters: Record<string, any> = {}): Promise<any[]> {
  const table = validateCollectionName(collectionName);
  
  if (useJsonFallback) {
    const db = readJsonDb();
    let rows = db[table] || [];
    
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      if (val !== undefined && val !== null) {
        rows = rows.filter((r: any) => r[key] === val || r[key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] === val);
      }
    });

    return rows.map(fromDb).sort((a: any, b: any) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });
  }

  try {
    let query = `SELECT * FROM ${table}`;
    const values: any[] = [];
    const whereClauses: string[] = [];

    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== undefined && val !== null) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        values.push(val);
        whereClauses.push(`${snakeKey} = $${values.length}`);
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC`;

    const res = await pool.query(query, values);
    return res.rows.map(fromDb);
  } catch (error) {
    console.error(`[DB Error] listDocuments failed in ${table}:`, error);
    throw new Error(`Database operation failed.`, { cause: error });
  }
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

