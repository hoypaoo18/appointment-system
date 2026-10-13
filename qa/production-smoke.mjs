import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { testDatabase } from '../server/test-database.mjs';
import { openDatabase } from '../server/database.mjs';
import { webHandler } from '../server/web-handler.mjs';
const fixture = await testDatabase(); await fixture.database.close();
const admin = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', port: Number(process.env.DB_PORT || 3306) });
const user = 'app_qa_' + randomBytes(8).toString('hex'); const password = randomBytes(24).toString('hex');
const saved = { ...process.env }; let db; let server;
try {
  await admin.query('CREATE USER ?@? IDENTIFIED BY ?', [user,'127.0.0.1',password]);
  await admin.query('GRANT SELECT,INSERT,UPDATE,DELETE ON '+mysql.escapeId(fixture.name)+'.* TO ?@?', [user,'127.0.0.1']);
  Object.assign(process.env,{ NODE_ENV:'production',APP_ENV:'production',DB_HOST:'127.0.0.1',DB_USER:user,DB_PASSWORD:password,DB_NAME:fixture.name,PUBLIC_ORIGIN:'https://qa.example.com' });
  db=await openDatabase(); // DML-only user proves runtime performs no CREATE statements.
  const email='production-qa@example.com';const accountPassword=randomBytes(24).toString('hex');
  await db.accounts.provision({name:'Production QA',email,password:accountPassword,role:'assistant'});
  server=createServer(webHandler(db));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/health')).status,200);
  const demos=await(await fetch(base+'/api/auth/demo-accounts')).json();assert.deepEqual(demos.users,[]);
  const login=async(email,password)=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://qa.example.com'},body:JSON.stringify({email,password})});
  assert.equal((await login('sarah.mitchell@meridian.com','MeridianDemo123!')).status,401);
  const response=await login(email,accountPassword);assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Secure/);
  const cookie=response.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(base+'/api/state',{headers:{Cookie:cookie}})).status,200);
  console.log('PASS: production runtime with DML-only DB user, real dist and API, no public demo accounts, demo login rejected, real account login, Secure cookie');
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.close();
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);
  await admin.query('DROP USER IF EXISTS ?@?', [user,'127.0.0.1']);await admin.end();await fixture.cleanup();
}
