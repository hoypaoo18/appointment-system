import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './test-database.mjs';
import { createServer } from 'node:http';
import { openDatabase, today } from './database.mjs';
import { apiHandler } from './api.mjs';

const appointment = (extra = {}) => ({ clientName: 'Test Client', clientOrg: 'Test Org', clientEmail: 'test@example.com', clientPhone: '+63 917 123 4567', purpose: 'Testing', notes: '', executiveId: 'exec-1', date: '2099-01-15', startTime: '09:00', duration: 60, ...extra });
test('save, edit, reschedule, cancel and activity survive reopening', async () => {
  const fixture = await testDatabase();
  let db = fixture.database;
  try {
    const saved = (await db.save(appointment())).appointment;
    const edited = (await db.save({ ...saved, purpose: 'Updated' }, saved.id)).appointment;
    const moved = (await db.action(saved.id, 'reschedule', { updatedAt: edited.updatedAt, date: '2099-01-16', startTime: '10:00', duration: 30 })).appointment;
    await db.action(saved.id, 'cancel', { updatedAt: moved.updatedAt, reason: 'Test cancellation' });
    await db.close(); db = await openDatabase({ database: fixture.name });
    assert.equal((await db.get(saved.id)).status, 'cancelled');
    assert.equal((await db.get(saved.id)).purpose, 'Updated');
    assert.equal((await db.get(saved.id)).previousDate, saved.date);
    assert.deepEqual((await db.state()).activityLog.filter(a => a.aptId === saved.id).map(a => a.action), ['created','confirmed','updated','rescheduled','cancelled']);
  } finally { await db.close(); await fixture.cleanup(); }
});
test('conflicts are atomic, adjacent slots allowed and cancellations release slots', async () => {
  const fixture = await testDatabase();
  const db = fixture.database;
  try {
    const a = (await db.save(appointment())).appointment;
    const count = (await db.state()).activityLog.length;
    await assert.rejects(() => db.save(appointment({ startTime: '09:30' })), /Schedule conflict/);
    assert.equal((await db.state()).activityLog.length, count);
    await db.save(appointment({ startTime: '10:00' }));
    const b = (await db.save(appointment({ executiveId: 'exec-2' }))).appointment;
    await db.save(appointment({ executiveId: 'exec-2', startTime: '10:00' }));
    await assert.rejects(() => db.action(b.id, 'reschedule', { updatedAt: b.updatedAt, date: b.date, startTime: '09:30', duration: 60 }), /Schedule conflict/);
    assert.equal((await db.get(b.id)).startTime, '09:00');
    await db.action(a.id, 'cancel', { reason: 'Cancelled', updatedAt: a.updatedAt });
    await db.save(appointment());
  } finally { await db.close(); await fixture.cleanup(); }
});
test('validation and status transitions reject invalid writes', async () => {
  const fixture = await testDatabase();
  const db = fixture.database;
  try {
    for (const extra of [{ date: '' }, { date: '2099-02-30' }, { date: '2000-01-01' }, { startTime: '25:00' }, { duration: -1 }, { executiveId: 'unknown' }, { clientEmail: 'bad' }, { clientPhone: 'abc' }]) await assert.rejects(() => db.save(appointment(extra)));
    const a = (await db.save(appointment())).appointment;
    await assert.rejects(() => db.action(a.id, 'complete', { updatedAt: a.updatedAt }), /Future/);
    await assert.rejects(() => db.save({ ...a, updatedAt: 'stale' }, a.id), /changed/);
    const current = (await db.save(appointment({ date: today(), startTime: '20:00' }))).appointment;
    await db.action(current.id, 'complete', { updatedAt: current.updatedAt });
    await assert.rejects(() => db.action(current.id, 'cancel', { reason: 'test', updatedAt: current.updatedAt }), /closed/);
  } finally { await db.close(); await fixture.cleanup(); }
});
test('HTTP API returns saved state, validation errors, and conflicts', async () => {
  const fixture = await testDatabase();
  const db = fixture.database;
  const server = createServer(apiHandler(db));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sarah.mitchell@meridian.com', password: 'MeridianDemo123!' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const request = body => fetch(url + '/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
    const response = await request(appointment()); assert.equal(response.status, 201);
    const saved = (await response.json()).appointment;
    assert.equal((await request(appointment())).status, 409);
    assert.equal((await request({})).status, 400);
    assert.equal((await request(null)).status, 400);
    const state = await (await fetch(url + '/api/state', { headers: { Cookie: cookie } })).json();
    assert.ok(state.appointments.some(a => a.id === saved.id));
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); await fixture.cleanup(); }
});
test('concurrent bookings cannot claim the same executive time slot', async () => {
  const fixture = await testDatabase();
  const db = fixture.database;
  try {
    const results = await Promise.allSettled([db.save(appointment()), db.save(appointment())]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const rejected = results.find(result => result.status === 'rejected');
    assert.equal(rejected.reason.status, 409);
    assert.match(rejected.reason.message, /Schedule conflict/);
    assert.equal((await db.state()).appointments.filter(a => a.date === '2099-01-15').length, 1);
  } finally { await db.close(); await fixture.cleanup(); }
});
