import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDirectory = await mkdtemp(path.join(os.tmpdir(), 'cima desktop smoke á '));
const executable = process.argv[2] ?? require('electron');
const args = process.argv[2] ? [] : [root];
if (process.platform === 'linux') args.unshift('--no-sandbox', '--disable-gpu', '--ozone-platform=headless');
const env = { ...process.env, CIMA_SMOKE_TEST: 'true', CIMA_TEST_DATA_DIR: testDirectory };
delete env.ELECTRON_RUN_AS_NODE;
async function run() {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Timeout de escritorio\n${output}`)); }, 120000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      const match = output.match(/CIMA_SMOKE_OK (.+)/);
      if (code !== 0 || !match) return reject(new Error(`Prueba de escritorio falló (${code})\n${output}`));
      resolve(JSON.parse(match[1]));
    });
  });
}
try {
  const first = await run();
  assert.equal(first.phase, 'initial');
  console.log('PASS primer uso, préstamos, pagos, reportes y configuración', first);
  const restart = await run();
  assert.equal(restart.phase, 'restart');
  console.log('PASS reinicio y persistencia', restart);
  console.log(`Datos y capturas de prueba: ${testDirectory}`);
} catch (error) {
  console.error(error);
  console.error(`Diagnóstico y datos de prueba: ${testDirectory}`);
  process.exitCode = 1;
}
