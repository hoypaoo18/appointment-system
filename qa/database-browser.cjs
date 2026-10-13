// End-to-end smoke test against a disposable XAMPP database.
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const { temporaryDatabaseName, dropTestDatabase } = await import('../server/test-database.mjs');
  const name = temporaryDatabaseName();
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--mode', 'test', '--host', '127.0.0.1', '--port', '5186', '--strictPort'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, APP_ENV: 'test', DB_NAME: name }, stdio: 'pipe', windowsHide: true,
  });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.stdout.on('data', data => { if (String(data).includes('Local:')) resolve(); }); server.on('error', reject); server.on('exit', code => reject(new Error(`Server exited ${code}`))); setTimeout(() => reject(new Error('Server startup timed out')), 20000).unref(); });
    browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const click = name => page.getByRole('button', { name, exact: true }).first().click();
    const login = async () => { await click('Demo accounts'); await page.getByRole('button', { name: /Sarah Mitchell/ }).click(); await click('Sign In'); await page.getByRole('button', { name: 'New Appointment', exact: true }).first().waitFor(); };
    await page.goto('http://127.0.0.1:5186'); await page.getByText('Test environment · sample data', { exact: true }).waitFor(); await login(); await click('New Appointment');
    await page.getByPlaceholder('Client full name').pressSequentially('Database QA Client');
    assert.equal(await page.getByPlaceholder('Client full name').inputValue(), 'Database QA Client');
    await page.getByPlaceholder('Company or institution').fill('QA Organization');
    await page.getByPlaceholder('email@example.com').fill('qa@example.com');
    await page.getByPlaceholder('+1 (555) 000-0000').fill('+63 917 123 4567');
    await click('Continue'); await page.getByPlaceholder('e.g. Q3 Financial Review, Partnership Discussion').fill('Persistence check');
    await click('Continue'); await page.getByRole('button', { name: /Margaret Chen/ }).click(); await click('Continue');
    await page.locator('input[type="date"]').fill('2099-01-15');
    await page.locator('main select').nth(1).selectOption('09:00'); await click('Check Availability'); await click('Continue to Review');
    await click('Confirm Appointment');
    await page.getByRole('heading', { name: /Appointment Confirmed/i }).waitFor();
    let state = await (await page.request.get('http://127.0.0.1:5186/api/state')).json();
    const saved = state.appointments.find(a => a.clientName === 'Database QA Client'); assert.ok(saved);
    await page.reload(); await page.getByRole('button', { name: 'New Appointment', exact: true }).first().waitFor(); await click('Appointments');
    await page.getByText('Database QA Client', { exact: true }).waitFor();
    const moved = await page.request.post(`http://127.0.0.1:5186/api/appointments/${saved.id}/reschedule`, { data: { date: '2099-01-16', startTime: '10:00', duration: 30, updatedAt: saved.updatedAt } });
    assert.equal(moved.status(), 200);
    await page.reload(); await page.getByRole('button', { name: 'New Appointment', exact: true }).first().waitFor(); await click('Appointments');
    const row = page.locator('tr').filter({ hasText: 'Database QA Client' }); await row.waitFor(); assert.match(await row.innerText(), /Rescheduled/);
    await click('Sign Out');
    await page.getByPlaceholder('your@email.com').waitFor();
    assert.equal((await page.request.get('http://127.0.0.1:5186/api/state')).status(), 401);
    await page.getByPlaceholder('your@email.com').fill('sarah.mitchell@meridian.com');
    await page.locator('input[type="password"]').fill('wrong-password'); await click('Sign In');
    await page.getByText('Invalid email or password', { exact: true }).waitFor();
    await page.locator('input[type="password"]').fill('MeridianDemo123!'); await click('Sign In');
    await click('Settings'); await click('Account');
    await page.getByLabel('Current Password', { exact: true }).fill('MeridianDemo123!');
    await page.getByLabel('New Password', { exact: true }).fill('UpdatedBrowser123!');
    await page.getByLabel('Confirm New Password', { exact: true }).fill('UpdatedBrowser123!');
    await click('Update Password'); await page.getByPlaceholder('your@email.com').waitFor();
    await page.getByPlaceholder('your@email.com').fill('sarah.mitchell@meridian.com');
    await page.locator('input[type="password"]').fill('UpdatedBrowser123!'); await click('Sign In');
    await page.getByRole('button', { name: 'New Appointment', exact: true }).first().waitFor();
    await click('Settings'); await click('Preferences'); await click('day'); await page.locator('main select').selectOption('30'); await click('Save Preferences');
    await page.getByText('Preferences saved', { exact: true }).waitFor(); await click('Schedule');
    assert.match(await page.getByRole('button', { name: 'day', exact: true }).getAttribute('class'), /bg-blue-600/);
    await page.reload(); await click('Schedule'); assert.match(await page.getByRole('button', { name: 'day', exact: true }).getAttribute('class'), /bg-blue-600/);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86400000).toISOString().slice(0,10);
    const seedMeeting = async (date, clientName) => {
      const response = await page.request.post('http://127.0.0.1:5186/api/appointments', { data: { ...saved, clientName, executiveId: 'exec-3', date, startTime: '09:00', duration: 30, purpose: 'Calendar placement', notes: '' } });
      assert.equal(response.status(), 201); return (await response.json()).appointment;
    };
    const todayMeeting = await seedMeeting(today, 'Calendar Today QA'); const tomorrowMeeting = await seedMeeting(tomorrow, 'Calendar Tomorrow QA');
    await page.reload(); await click('Dashboard');
    const dashboard = await (await page.request.get('http://127.0.0.1:5186/api/state')).json();
    const counts = { Total: dashboard.appointments.length, Today: dashboard.appointments.filter(a => a.date === today && a.status !== 'cancelled').length, Pending: dashboard.appointments.filter(a => a.status === 'pending').length, Upcoming: dashboard.appointments.filter(a => a.date > today && !['cancelled','completed'].includes(a.status)).length, Completed: dashboard.appointments.filter(a => a.status === 'completed').length, Cancelled: dashboard.appointments.filter(a => a.status === 'cancelled').length };
    for (const [label, count] of Object.entries(counts)) assert.equal(Number(await page.locator('main').getByText(label, { exact: true }).locator('..').locator('.text-2xl').innerText()), count);
    await click('Schedule'); await page.getByText('Calendar Today QA', { exact: true }).waitFor(); await click('week'); await page.getByText('Calendar Today QA', { exact: true }).waitFor();
    // Validate day placement in a second browser timezone with a separate authenticated context.
    const utcPage = await browser.newPage({ timezoneId: 'UTC', viewport: { width: 1440, height: 1000 } });
    await utcPage.goto('http://127.0.0.1:5186'); await utcPage.getByPlaceholder('your@email.com').fill('sarah.mitchell@meridian.com'); await utcPage.locator('input[type="password"]').fill('UpdatedBrowser123!'); await utcPage.getByRole('button', { name: 'Sign In', exact: true }).click();
    await utcPage.getByRole('button', { name: 'Schedule', exact: true }).first().click(); await utcPage.getByText('Calendar Today QA', { exact: true }).waitFor(); await utcPage.close();
    const complete = await page.request.post('http://127.0.0.1:5186/api/appointments/' + todayMeeting.id + '/complete', { data: { updatedAt: todayMeeting.updatedAt } }); assert.equal(complete.status(), 200);
    const cancel = await page.request.post('http://127.0.0.1:5186/api/appointments/' + tomorrowMeeting.id + '/cancel', { data: { updatedAt: tomorrowMeeting.updatedAt, reason: 'QA history check' } }); assert.equal(cancel.status(), 200);
    await page.reload(); await click('History'); await page.locator('tr').filter({ hasText: 'Calendar Today QA' }).waitFor(); assert.match(await page.locator('tr').filter({ hasText: 'Calendar Today QA' }).innerText(), /Completed/); assert.match(await page.locator('tr').filter({ hasText: 'Calendar Tomorrow QA' }).innerText(), /Cancelled/);
    await page.getByPlaceholder('Search history...').fill('Calendar Today QA'); await page.locator('tr').filter({ hasText: 'Calendar Today QA' }).waitFor(); assert.equal(await page.locator('tr').filter({ hasText: 'Calendar Tomorrow QA' }).count(), 0);
    await click('New Appointment'); await click('Continue');
    // Duration is also checked through the authenticated preference API.
    const prefs = await (await page.request.get('http://127.0.0.1:5186/api/state')).json(); assert.deepEqual(prefs.preferences, { calendarView: 'day', duration: 30 });
    await click('Sign Out'); await page.getByPlaceholder('your@email.com').waitFor();
    await click('Demo accounts'); await page.getByRole('button', { name: /James Alderton/ }).click(); await click('Sign In');
    await click('System History'); await page.getByRole('heading', { name: 'System History', exact: true, level: 1 }).waitFor();
    await page.locator('tbody tr').filter({ hasText: 'auth · login_failed'.replace('_', ' ') }).first().waitFor();
    await page.getByLabel('Audit action', { exact: true }).selectOption('auth.login_failed');
    await page.locator('tbody tr').filter({ hasText: 'Failure' }).first().waitFor();
    await page.getByLabel('Search system history', { exact: true }).fill('nonexistent-record');
    await page.getByText('No events match your filters.', { exact: true }).waitFor();
    await page.getByLabel('Search system history', { exact: true }).fill('');
    await page.getByLabel('Audit action', { exact: true }).selectOption('');
    await page.locator('tbody tr').filter({ hasText: 'James Alderton' }).first().waitFor();
    fs.mkdirSync(path.join(__dirname, 'evidence'), { recursive: true });
    await page.screenshot({ path: path.join(__dirname, 'evidence/system-history.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await click('Audit'); await page.getByRole('heading', { name: 'System History', exact: true, level: 1 }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: typing, booking, MySQL persistence after refresh, reschedule, session restore, logout, invalid password rejection, password update, saved preferences, dashboard totals, calendar Manila/UTC placement, History status/search, admin system history filters and mobile navigation, no browser errors');
  } finally {
    if (browser) await browser.close();
    server.kill(); await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
    await dropTestDatabase(name);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
