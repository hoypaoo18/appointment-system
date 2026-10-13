import { lockTestEnvironment, initializeTestEnvironment } from './test-environment.mjs';
const lock = await lockTestEnvironment();
try { await initializeTestEnvironment(process.argv.includes('--reset'), lock.connection); }
finally { await lock.close(); }
