const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// electron-builder intentionally skips a root node_modules during file copying.
// Fail packaging if the separate backend resources are ever incomplete again.
module.exports = async function verifyLocalRuntime(context) {
  const resources = path.join(context.appOutDir, 'resources');
  const backend = path.join(resources, 'backend');
  const generated = path.join(backend, 'node_modules', '.prisma', 'client');
  for (const file of [
    path.join(resources, 'app.asar'), path.join(backend, 'dist', 'desktop.js'),
    path.join(backend, 'prisma', 'migrations', '20261106000000_initial', 'migration.sql'),
    path.join(generated, 'index.js'), path.join(generated, 'query_engine-windows.dll.node'),
  ]) {
    if (!fs.statSync(file).isFile()) throw new Error(`Falta un componente local: ${file}`);
  }
  const runtimeRequire = createRequire(path.join(backend, 'dist', 'desktop.js'));
  for (const dependency of ['@prisma/client', 'express', 'bcryptjs', 'jsonwebtoken', 'zod', 'cors', 'helmet', 'dotenv', 'cookie-parser', 'express-async-errors', 'swagger-jsdoc', 'swagger-ui-express']) {
    const resolved = runtimeRequire.resolve(dependency);
    if (!resolved.startsWith(backend + path.sep)) throw new Error(`La dependencia ${dependency} no está dentro del paquete.`);
  }
  if (!fs.readFileSync(path.join(generated, 'schema.prisma'), 'utf8').includes('provider = "sqlite"')) throw new Error('El motor empaquetado no utiliza SQLite.');
  console.log('Verificado: recursos y dependencias locales completos.');
};
