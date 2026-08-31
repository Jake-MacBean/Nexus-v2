import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationRoot = path.join(repositoryRoot, 'packages', 'database', 'drizzle');
const errors = [];

async function packageManifestPaths() {
  const paths = [path.join(repositoryRoot, 'package.json')];
  for (const directory of ['apps', 'packages']) {
    const entries = await readdir(path.join(repositoryRoot, directory), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory())
        paths.push(path.join(repositoryRoot, directory, entry.name, 'package.json'));
    }
  }
  return paths;
}

for (const manifestPath of await packageManifestPaths()) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    if (/drizzle(?:-kit|\s+kit)\s+push/iu.test(String(command))) {
      errors.push(
        `${path.relative(repositoryRoot, manifestPath)} script ${name} uses prohibited schema push.`,
      );
    }
  }
}

try {
  const journal = JSON.parse(
    await readFile(path.join(migrationRoot, 'meta', '_journal.json'), 'utf8'),
  );
  const journalFiles = new Set(
    (journal.entries ?? [])
      .map(({ tag }) => `${tag}.sql`)
      .filter((name) => name !== 'undefined.sql'),
  );
  const sqlFiles = new Set((await readdir(migrationRoot)).filter((name) => name.endsWith('.sql')));
  for (const file of journalFiles) {
    if (!sqlFiles.has(file)) errors.push(`Migration journal references missing file ${file}.`);
  }
  for (const file of sqlFiles) {
    if (!journalFiles.has(file)) errors.push(`Migration file ${file} is absent from the journal.`);
    if (!(await readFile(path.join(migrationRoot, file), 'utf8')).trim()) {
      errors.push(`Migration file ${file} is empty.`);
    }
  }
  if (journalFiles.size === 0) errors.push('No committed database migrations were found.');
} catch (error) {
  errors.push(
    `Could not validate committed migrations: ${error instanceof Error ? error.message : error}`,
  );
}

if (errors.length > 0) {
  console.error('Database governance check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    'Database governance check passed: migration artifacts are consistent and schema push is absent.',
  );
}
