import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './database.mjs';

export const temporaryDatabaseName = () => 'appointment_qa_' + randomUUID().replaceAll('-', '');
export async function dropTestDatabase(name) {
  if (!/^appointment_qa_[a-f0-9]{32}$/.test(name)) throw new Error('Refusing to drop a non-test database');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  try { await connection.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(name)); }
  finally { await connection.end(); }
}
export async function testDatabase() {
  const name = temporaryDatabaseName();
  try {
    return { name, database: await openDatabase({ database: name }), cleanup: () => dropTestDatabase(name) };
  } catch (error) { await dropTestDatabase(name); throw error; }
}
