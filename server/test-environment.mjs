import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { openDatabase, today } from './database.mjs';

export function testEnvironmentConfig(env = process.env) {
  if (env.APP_ENV !== 'test' || env.DB_NAME !== 'appointment_test') throw new Error('Test setup requires APP_ENV=test and DB_NAME=appointment_test in .env.test');
  if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST || '127.0.0.1')) throw new Error('Test setup must use the local XAMPP database');
  const port = Number(env.TEST_APP_PORT || 5180);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5173) throw new Error('Invalid TEST_APP_PORT; choose a separate port such as 5180');
  return { database: 'appointment_test', port, mysql: { host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_USER || 'root', password: env.DB_PASSWORD || '' } };
}
export function testSeed(referenceDate = today()) {
  const seed = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));
  const shift = Date.parse(referenceDate + 'T00:00:00Z') - Date.parse('2026-09-08T00:00:00Z');
  const date = value => new Date(Date.parse(value + 'T00:00:00Z') + shift).toISOString().slice(0,10);
  const timestamp = value => new Date(Date.parse(value) + shift).toISOString();
  for (const appointment of seed.INITIAL_APPOINTMENTS) {
    appointment.date = date(appointment.date);
    if (appointment.previousDate) appointment.previousDate = date(appointment.previousDate);
    appointment.createdAt = timestamp(appointment.createdAt); appointment.updatedAt = timestamp(appointment.updatedAt);
  }
  for (const entry of seed.INITIAL_ACTIVITY) entry.timestamp = timestamp(entry.timestamp);
  return seed;
}
export async function lockTestEnvironment() {
  const config = testEnvironmentConfig();
  const connection = await mysql.createConnection(config.mysql);
  try {
    const [rows] = await connection.query("SELECT GET_LOCK('appointment_test_environment', 0) AS acquired");
    if (Number(rows[0].acquired) !== 1) throw new Error('The test server or setup is running. Stop it before setup/reset.');
    return { config, connection, close: () => connection.end() };
  } catch (error) { await connection.end(); throw error; }
}
export async function initializeTestEnvironment(reset = false, connection) {
  const config = testEnvironmentConfig();
  if (reset) {
    if (!connection) throw new Error('Reset requires the test environment lock');
    await connection.query('DROP DATABASE IF EXISTS `appointment_test`');
  }
  const database = await openDatabase({ database: config.database, seed: testSeed() });
  try {
    const state = await database.state();
    console.log(`Test database ${config.database}: ${state.appointments.length} appointments, ${(await database.accounts.users()).length} accounts`);
  } finally { await database.close(); }
}
