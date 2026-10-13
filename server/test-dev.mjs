import { spawn } from 'node:child_process';
import { lockTestEnvironment, initializeTestEnvironment } from './test-environment.mjs';

const lock = await lockTestEnvironment();
try { await initializeTestEnvironment(); }
catch (error) { await lock.close(); throw error; }
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--mode', 'test', '--host', '127.0.0.1', '--port', String(lock.config.port), '--strictPort'], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env, APP_ENV: 'test', DB_NAME: lock.config.database },
});
console.log(`Test environment: http://127.0.0.1:${lock.config.port} · database: appointment_test`);
console.log('Test records persist until npm run test:reset.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', async error => { console.error(error); await lock.close(); process.exitCode = 1; });
child.on('exit', async code => { await lock.close(); process.exitCode = code || 0; });
