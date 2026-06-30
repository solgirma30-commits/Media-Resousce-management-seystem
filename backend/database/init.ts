import pool from './pool';

export async function initDb() {
  try {
    const client = await pool.connect();
    try {
      console.log('Connecting to PostgreSQL...');
      console.log('✓ Connected successfully.');
      console.log('[DB Init] Initializing PostgreSQL tables...');
      
      // Users Table
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

      // Department Updates Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS department_updates (
          id TEXT PRIMARY KEY,
          department TEXT,
          message TEXT,
          sender TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Notifications Table
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

      // Fleet Table
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

      // Requests Tables
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
    console.error('Connecting to PostgreSQL...');
    console.error('Connection failed:');
    console.error(error instanceof Error ? error.message : error);
    console.error('Server continuing without DB connected.');
  }
}
