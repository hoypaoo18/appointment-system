import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { testEnvironmentConfig, testSeed } from './test-environment.mjs';
import { openDatabase } from './database.mjs';
import { testDatabase } from './test-database.mjs';
import { apiHandler } from './api.mjs';

test('test configuration rejects the main database, remote hosts and the main app port', async () => {
  const valid = { APP_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'appointment_test', TEST_APP_PORT: '5180' };
  assert.equal(testEnvironmentConfig(valid).database, 'appointment_test');
  for (const overrides of [{ APP_ENV: 'development' }, { DB_NAME: 'appointment' }, { DB_HOST: 'example.com' }, { TEST_APP_PORT: '5173' }, { TEST_APP_PORT: 'invalid' }]) assert.throws(() => testEnvironmentConfig({ ...valid, ...overrides }));
  await assert.rejects(() => openDatabase({ database: 'appointment' }), /cannot connect to the main database/);
});
test('manual testing seed has today and upcoming appointments with consistent history dates', () => {
  const seed = testSeed('2026-10-13');
  assert.equal(seed.INITIAL_APPOINTMENTS.length, 11);
  assert.equal(seed.INITIAL_APPOINTMENTS.filter(a => a.date === '2026-10-13').length, 3);
  assert.ok(seed.INITIAL_APPOINTMENTS.some(a => a.date > '2026-10-13'));
  const created = seed.INITIAL_ACTIVITY.find(a => a.action === 'created' && a.aptId === 'APT-001');
  assert.equal(created.timestamp, seed.INITIAL_APPOINTMENTS.find(a => a.id === 'APT-001').createdAt);
});
test('test environment uses a separate session cookie and ignores a main-app cookie', async () => {
  const fixture = await testDatabase();
  const server = createServer(apiHandler(fixture.database, { environment: 'test' }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sarah.mitchell@meridian.com', password: 'MeridianDemo123!' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.ok(cookie.startsWith('appointment_test_session='));
    const correct = await (await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } })).json();
    assert.equal(correct.user.id, 'user-1');
    const mainCookie = cookie.replace('appointment_test_session=', 'appointment_session=');
    const ignored = await (await fetch(base + '/api/auth/me', { headers: { Cookie: mainCookie } })).json();
    assert.equal(ignored.user, null);
  } finally { await new Promise(resolve => server.close(resolve)); await fixture.database.close(); await fixture.cleanup(); }
});
