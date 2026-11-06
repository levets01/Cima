import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDirectory = path.join(root, '.desktop-app');
const backendDirectory = path.join(root, '.desktop-backend');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const backend = path.join(root, 'backend');

// These folders contain generated packaging output only.
await rm(appDirectory, { recursive: true, force: true });
await rm(backendDirectory, { recursive: true, force: true });
await mkdir(appDirectory, { recursive: true });
await mkdir(backendDirectory, { recursive: true });
await cp(path.join(root, 'dist'), path.join(appDirectory, 'dist'), { recursive: true });
await cp(path.join(root, 'desktop'), path.join(appDirectory, 'desktop'), { recursive: true });
await writeFile(path.join(appDirectory, 'package.json'), JSON.stringify({
  name: 'cima-desktop', productName: 'Cima', version: pkg.version, main: 'desktop/main.cjs',
  description: 'Gestión local de préstamos y pagos', author: 'Cima', license: 'UNLICENSED',
}, null, 2));
await cp(path.join(backend, 'dist'), path.join(backendDirectory, 'dist'), {
  recursive: true, filter: (source) => !/\.test\./.test(source) && !/\.map$/.test(source),
});
await cp(path.join(backend, 'prisma', 'migrations'), path.join(backendDirectory, 'prisma', 'migrations'), { recursive: true });
for (const name of ['package.json', 'package-lock.json']) await cp(path.join(backend, name), path.join(backendDirectory, name));
await cp(path.join(backend, 'node_modules'), path.join(backendDirectory, 'node_modules'), { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Ejecuta este paso mediante npm run desktop:prepare.');
const prune = spawnSync(process.execPath, [npmCli, 'prune', '--omit=dev', '--omit=peer', '--omit=optional', '--ignore-scripts', '--offline', '--no-audit', '--no-fund'], {
  cwd: backendDirectory, stdio: 'inherit',
});
if (prune.status !== 0) throw new Error('No se pudieron preparar las dependencias de producción.');
const windowsEngine = path.join(backendDirectory, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');
await stat(windowsEngine);
console.log('Aplicación y motor SQLite Windows preparados sin datos de usuarios.');
