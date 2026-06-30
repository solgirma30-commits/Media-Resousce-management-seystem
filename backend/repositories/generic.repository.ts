import pool from '../database/pool';

// Helper to convert DB rows to application-friendly objects
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
    const idCol = table === 'users' ? 'uid' : 'id';
    const res = await pool.query(`SELECT * FROM ${table} WHERE ${idCol} = $1`, [id]);
    return fromDb(res.rows[0]);
  },

  async createDocument(collectionName: string, id: string | undefined, data: any): Promise<any> {
    const table = validateCollectionName(collectionName);
    const idCol = table === 'users' ? 'uid' : 'id';
    const finalId = id || data.id || data.uid || Math.random().toString(36).substring(2, 15);
    
    const columns = [idCol];
    const values = [finalId];
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
  },

  async listDocuments(collectionName: string, filters: Record<string, any> = {}): Promise<any[]> {
    const table = validateCollectionName(collectionName);
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
  },

  async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    const table = validateCollectionName(collectionName);
    const idCol = table === 'users' ? 'uid' : 'id';
    await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1`, [id]);
    return true;
  }
};
