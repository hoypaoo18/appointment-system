import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { testDatabase } from './test-database.mjs';
import { openDatabase } from './database.mjs';
import { apiHandler } from './api.mjs';

test('audit migration preserves history once, changes are atomic and history survives reconnect', async () => {
  const fixture = await testDatabase(); let db = fixture.database;
  try {
    const initial = await db.audit.list(new URLSearchParams()); assert.equal(initial.total, 21);
    await db.close(); db = await openDatabase({ database: fixture.name });
    assert.equal((await db.audit.list(new URLSearchParams())).total, 21);
    const user = (await db.accounts.users())[0];
    const input = { clientName: 'Audit Test', clientOrg: 'QA', clientEmail: 'qa@example.com', clientPhone: '+63 917 123 4567', purpose: 'Audit test', notes: 'Private notes are not in the audit', executiveId: 'exec-1', date: '2099-03-01', startTime: '09:00', duration: 30 };
    const saved = (await db.save(input, undefined, user.name, { user, ip: '127.0.0.1' })).appointment;
    await db.action(saved.id, 'reschedule', { date: '2099-03-02', startTime: '10:00', duration: 60, updatedAt: saved.updatedAt }, user.name, { user });
    const entries = (await db.audit.list(new URLSearchParams({ search: saved.id }))).entries;
    assert.equal(entries.length, 2); assert.equal(entries[0].action, 'appointment.rescheduled');
    assert.equal(entries[0].details.before.date, '2099-03-01'); assert.equal(entries[0].details.after.date, '2099-03-02');
    assert.equal(entries[1].actorId, user.id); assert.equal(entries[1].ip, '127.0.0.1');
    assert.ok(!JSON.stringify(entries).includes(input.notes));
    const before = await db.state(); const total = (await db.audit.list(new URLSearchParams())).total;
    const record = db.audit.record; db.audit.record = async () => { throw new Error('Audit storage failure'); };
    await assert.rejects(() => db.save({ ...input, date: '2099-03-03' }), /Audit storage failure/);
    db.audit.record = record;
    assert.deepEqual(await db.state(), before); assert.equal((await db.audit.list(new URLSearchParams())).total, total);
    await db.close(); db = await openDatabase({ database: fixture.name });
    assert.equal((await db.audit.list(new URLSearchParams({ search: saved.id }))).total, 2);
    for (let i = 0; i < 55; i++) await db.audit.record({ action: 'system.test', timestamp: '2026-10-13T00:00:00.000Z' });
    const page1 = await db.audit.list(new URLSearchParams({ action: 'system.test', from: '2026-10-13', to: '2026-10-13' }));
    const page2 = await db.audit.list(new URLSearchParams({ action: 'system.test', page: '2' }));
    assert.equal(page1.entries.length, 50); assert.equal(page2.entries.length, 5); assert.equal(page1.total, 55);
    assert.equal(new Set([...page1.entries,...page2.entries].map(entry => entry.id)).size, 55);
    await assert.rejects(() => db.audit.list(new URLSearchParams({ from: '2026-02-30' })), /Invalid date/);
  } finally { await db.close(); await fixture.cleanup(); }
});

test('system history tracks authentication, account changes and denied access without storing secrets', async () => {
  const fixture = await testDatabase(); const db = fixture.database;
  const server = createServer(apiHandler(db)); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
  const login = async email => {
    const response = await request('/api/auth/login', { email, password: 'MeridianDemo123!' }); assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  };
  try {
    await request('/api/auth/login', { email: 'sarah.mitchell@meridian.com', password: 'NeverRecordThisSecret!' });
    assert.equal((await request('/api/audit-logs', undefined, undefined, 'GET')).status, 401);
    const assistant = await login('sarah.mitchell@meridian.com');
    assert.equal((await request('/api/audit-logs', undefined, assistant, 'GET')).status, 403);
    await request('/api/auth/password', { currentPassword: 'MeridianDemo123!', newPassword: 'DifferentSecret123!' }, assistant);
    const admin = await login('j.alderton@meridian.com');
    await request('/api/users/user-2/active', { active: false }, admin, 'PUT');
    await request('/api/auth/logout', {}, admin);
    const entries = (await db.audit.list(new URLSearchParams())).entries;
    for (const action of ['auth.login','auth.login_failed','auth.logout','user.password_changed','user.deactivated','access.denied']) assert.ok(entries.some(entry => entry.action === action), action);
    assert.equal(entries.find(entry => entry.action === 'user.deactivated').actorName, 'James Alderton');
    const serialized = JSON.stringify(entries);
    for (const secret of ['NeverRecordThisSecret!', 'DifferentSecret123!', 'MeridianDemo123!', assistant, admin, 'password_hash']) assert.ok(!serialized.includes(secret));
    const admin2 = await login('j.alderton@meridian.com');
    const response = await request('/api/audit-logs?action=auth.login_failed&outcome=failure', undefined, admin2, 'GET');
    assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.total, 1); assert.equal(data.entries[0].outcome, 'failure');
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); await fixture.cleanup(); }
});
