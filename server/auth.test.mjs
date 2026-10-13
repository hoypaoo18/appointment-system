import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import mysql from 'mysql2/promise';
import { testDatabase } from './test-database.mjs';
import { openDatabase } from './database.mjs';
import { apiHandler } from './api.mjs';
import { DEMO_PASSWORD } from './accounts.mjs';

test('demo accounts persist, passwords are hashed, sessions survive reconnect and can be revoked', async () => {
  const fixture = await testDatabase();
  let db = fixture.database;
  let connection;
  try {
    const accounts = await db.accounts.demos(); assert.equal(accounts.length, 5);
    for (const account of accounts) {
      const login = await db.accounts.login(account.email.toUpperCase(), DEMO_PASSWORD);
      assert.equal(login.user.id, account.id); assert.equal(login.user.password_hash, undefined);
      await db.accounts.logout(login.token); assert.equal(await db.accounts.session(login.token), null);
    }
    await assert.rejects(() => db.accounts.login(accounts[0].email, 'bad-password'), { status: 401 });
    await assert.rejects(() => db.accounts.login('missing@example.com', DEMO_PASSWORD), { status: 401 });
    connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: fixture.name });
    const [hashes] = await connection.query('SELECT password_hash FROM users');
    assert.equal(new Set(hashes.map(row => row.password_hash)).size, 5);
    assert.ok(hashes.every(row => row.password_hash.startsWith('scrypt:') && !row.password_hash.includes(DEMO_PASSWORD)));
    const login = await db.accounts.login(accounts[0].email, DEMO_PASSWORD);
    const [sessions] = await connection.query('SELECT token_hash FROM sessions');
    assert.ok(sessions.every(row => row.token_hash !== login.token));
    await db.close(); db = await openDatabase({ database: fixture.name });
    assert.equal((await db.accounts.session(login.token)).id, accounts[0].id);
    await connection.query('UPDATE sessions SET expires_at = 0');
    assert.equal(await db.accounts.session(login.token), null);
  } finally { if (connection) await connection.end(); await db.close(); await fixture.cleanup(); }
});

test('password changes and disabled accounts invalidate sessions and remain saved on restart', async () => {
  const fixture = await testDatabase();
  let db = fixture.database;
  try {
    const email = 'sarah.mitchell@meridian.com';
    const first = await db.accounts.login(email, DEMO_PASSWORD);
    await assert.rejects(() => db.accounts.changePassword(first.user.id, 'wrong', 'NewPassword123!'), /incorrect/);
    await db.accounts.changePassword(first.user.id, DEMO_PASSWORD, 'NewPassword123!');
    assert.equal(await db.accounts.session(first.token), null);
    await db.close(); db = await openDatabase({ database: fixture.name });
    await assert.rejects(() => db.accounts.login(email, DEMO_PASSWORD), { status: 401 });
    const changed = await db.accounts.login(email, 'NewPassword123!');
    await db.accounts.setActive(changed.user.id, false, 'user-5');
    assert.equal(await db.accounts.session(changed.token), null);
    await assert.rejects(() => db.accounts.login(email, 'NewPassword123!'), { status: 401 });
    assert.ok(!(await db.accounts.demos()).some(u => u.id === changed.user.id));
    await assert.rejects(() => db.accounts.setActive('user-5', false, 'user-5'), /own account/);
  } finally { await db.close(); await fixture.cleanup(); }
});

test('HTTP authentication protects appointments, uses the session identity and enforces roles', async () => {
  const fixture = await testDatabase(); const db = fixture.database;
  const server = createServer(apiHandler(db));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
  const login = async email => {
    const response = await request('/api/auth/login', { email, password: DEMO_PASSWORD });
    assert.equal(response.status, 200); const header = response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/);
    return header.split(';')[0];
  };
  try {
    assert.equal((await request('/api/state', undefined, undefined, 'GET')).status, 401);
    const body = { clientName: 'Auth QA', clientOrg: 'QA', clientEmail: 'qa@example.com', clientPhone: '+63 917 123 4567', purpose: 'Auth Test', notes: '', executiveId: 'exec-1', date: '2099-02-01', startTime: '10:00', duration: 30, createdBy: 'Impersonated', updatedBy: 'Impersonated' };
    assert.equal((await request('/api/appointments', body)).status, 401);
    const executive = await login('margaret.chen@meridian.com');
    assert.equal((await request('/api/appointments', body, executive)).status, 403);
    const assistant = await login('sarah.mitchell@meridian.com');
    assert.equal((await request('/api/users/user-2/active', { active: false }, assistant, 'PUT')).status, 403);
    const saved = await request('/api/appointments', body, assistant); assert.equal(saved.status, 201);
    const result = await saved.json(); assert.equal(result.appointment.createdBy, 'Sarah Mitchell');
    assert.equal(result.appointment.updatedBy, 'Sarah Mitchell');
    const admin = await login('j.alderton@meridian.com');
    const state = await (await request('/api/state', undefined, admin, 'GET')).json();
    assert.equal(state.users.length, 5); assert.ok(!JSON.stringify(state).includes('password_hash'));
    assert.equal((await request('/api/users/user-2/active', { active: false }, admin, 'PUT')).status, 200);
    assert.equal((await request('/api/state', undefined, executive, 'GET')).status, 401);
    await request('/api/auth/logout', {}, assistant);
    assert.equal((await request('/api/state', undefined, assistant, 'GET')).status, 401);
    const crossOrigin = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://example.com' }, body: '{}' });
    assert.equal(crossOrigin.status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); await fixture.cleanup(); }
});
