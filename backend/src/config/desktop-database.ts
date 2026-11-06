import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

interface Migration {
  id: string;
  sql: string;
  checksum: string;
}

/** Split Prisma-generated SQLite SQL without splitting quoted strings or comments. */
export function migrationStatements(sql: string): string[] {
  const statements: string[] = [];
  let statement = '';
  let quote: string | null = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === '\n') { lineComment = false; statement += '\n'; }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') { blockComment = false; index++; statement += ' '; }
      continue;
    }
    if (quote) {
      statement += character;
      if (character === quote) {
        if (next === quote && quote !== ']') { statement += next; index++; }
        else quote = null;
      }
      continue;
    }
    if (character === '-' && next === '-') { lineComment = true; index++; continue; }
    if (character === '/' && next === '*') { blockComment = true; index++; continue; }
    if (character === "'" || character === '"' || character === '`' || character === '[') {
      quote = character === '[' ? ']' : character;
      statement += character;
      continue;
    }
    if (character === ';') {
      if (statement.trim()) statements.push(statement.trim());
      statement = '';
    } else statement += character;
  }
  if (quote || blockComment) throw new Error('La migración contiene SQL incompleto.');
  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

async function packagedMigrations(directory: string): Promise<Migration[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const ids = entries.filter((entry) => entry.isDirectory() && /^\d+_/.test(entry.name))
    .map((entry) => entry.name).sort();
  if (!ids.length) throw new Error('No se encontraron las migraciones locales de Cima.');
  const migrations: Migration[] = [];
  for (const id of ids) {
    const sql = await readFile(path.join(directory, id, 'migration.sql'), 'utf8');
    migrations.push({ id, sql, checksum: createHash('sha256').update(sql).digest('hex') });
  }
  return migrations;
}

/** Initialize the desktop database offline, using only the packaged query engine. */
export async function initializeDesktopDatabase(migrationsDir: string): Promise<void> {
  if (!process.env.DATABASE_URL?.startsWith('file:')) throw new Error('La aplicación de escritorio necesita una base SQLite local.');
  const migrations = await packagedMigrations(migrationsDir);
  const tables = await prisma.$queryRaw<{ name: string }[]>`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`;
  if (tables.length && !tables.some((table) => table.name === '_CimaMigration')) {
    throw new Error('La base de datos existente no fue inicializada por Cima de escritorio. Selecciona una base compatible.');
  }
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_CimaMigration" ("id" TEXT NOT NULL PRIMARY KEY, "checksum" TEXT NOT NULL, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const applied = await prisma.$queryRaw<{ id: string; checksum: string }[]>`SELECT id, checksum FROM "_CimaMigration" ORDER BY id`;
  for (const history of applied) {
    const packaged = migrations.find((migration) => migration.id === history.id);
    if (!packaged) throw new Error(`Esta base de datos necesita una versión más reciente de Cima (${history.id}).`);
    if (packaged.checksum !== history.checksum) throw new Error(`La migración ${history.id} fue modificada después de aplicarse. No se cambió la base de datos.`);
  }
  const completed = new Set(applied.map((migration) => migration.id));
  for (const migration of migrations) {
    if (completed.has(migration.id)) continue;
    const statements = migrationStatements(migration.sql);
    await prisma.$transaction(async (db) => {
      for (const statement of statements) {
        // Transaction boundaries belong to this runner, never to the SQL file.
        if (/^(BEGIN(?:\s+TRANSACTION)?|COMMIT|END(?:\s+TRANSACTION)?|ROLLBACK)\s*$/i.test(statement)) continue;
        await db.$executeRawUnsafe(statement);
      }
      await db.$executeRaw`INSERT INTO "_CimaMigration" (id, checksum) VALUES (${migration.id}, ${migration.checksum})`;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
  }
}

/** A live, consistent snapshot; SQLite receives the destination as a bound value. */
export async function backupDesktopDatabase(destination: string): Promise<void> {
  if (!path.isAbsolute(destination)) throw new Error('El destino de la copia de seguridad debe ser una ruta absoluta.');
  try {
    await lstat(destination);
    throw new Error('El archivo de destino ya existe. Elige un nombre nuevo para la copia de seguridad.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!(await stat(path.dirname(destination))).isDirectory()) throw new Error('La carpeta de destino no existe.');
  await prisma.$executeRaw(Prisma.sql`VACUUM INTO ${destination}`);
}
