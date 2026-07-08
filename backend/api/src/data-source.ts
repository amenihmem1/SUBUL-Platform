import { DataSource } from 'typeorm';
import * as path from 'path';

/** Must match app.module.ts — migrations run via this file before Nest boots. */
const sslEnabled = (process.env.DB_SSL ?? '').toLowerCase() === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'shared_db',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: ['error'],
  entities: [path.join(__dirname, '**', '*.entity.js')],
  migrations: [path.join(__dirname, 'migrations', '*.js')],
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  extra: {
    connectionTimeoutMillis: 10000,
  },
});
