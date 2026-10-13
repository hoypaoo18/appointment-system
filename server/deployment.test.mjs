import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { testDatabase } from './test-database.mjs';
import { webHandler } from './web-handler.mjs';

test('preferences persist per account and reject invalid values', async () => {
  const fixture = await testDatabase(); const db = fixture.database;
  try {
    const user = (await db.accounts.users())[0];
    await db.accounts.savePreferences(user, { calendarView: 'day', duration: 30 });
    assert.deepEqual(await db.accounts.preferences(user.id), { calendarView: 'day', duration: 30 });
    assert.deepEqual(await db.accounts.preferences('user-2'), { calendarView: 'week', duration: 60 });
    await assert.rejects(() => db.accounts.savePreferences(user, { calendarView: 'bad', duration: 7 }), /Invalid preferences/);
    assert.ok((await db.audit.list(new URLSearchParams())).entries.some(e=>e.action === 'user.preferences_updated'));
  } finally { await db.close(); await fixture.cleanup(); }
});
test('production web handler serves built frontend, assets, health and protected API', async () => {
  const fixture = await testDatabase(); const directory = await mkdtemp(join(tmpdir(),'appointment-web-'));
  await writeFile(join(directory,'index.html'),'<h1>Appointment app</h1>'); await writeFile(join(directory,'app.js'),'console.log("app")');
  const server = createServer(webHandler(fixture.database,directory)); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    const index=await fetch(base+'/'); assert.equal(index.status,200); assert.match(await index.text(),/Appointment app/);
    assert.match(index.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal((await fetch(base+'/dashboard')).status,200);
    const asset=await fetch(base+'/app.js'); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),/javascript/);
    assert.equal((await fetch(base+'/.env')).status,404); assert.equal((await fetch(base+'/missing.js')).status,404);
    assert.equal((await fetch(base+'/api/state')).status,401); assert.equal((await fetch(base+'/health')).status,200);
  } finally { await new Promise(resolve=>server.close(resolve)); await fixture.database.close(); await fixture.cleanup(); await rm(directory,{recursive:true}); }
});
