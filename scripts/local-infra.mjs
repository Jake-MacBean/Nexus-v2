import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = path.join(repositoryRoot, 'infra', 'compose.yaml');

const projectName = 'nexus-v2-local';
const serviceNames = Object.freeze(['postgres', 'temporal']);
const localVolumeNames = Object.freeze([
  'nexus-v2-local-postgres-data',
  'nexus-v2-local-temporal-data',
]);
const postgresDatabase = 'nexus_v2_dev';
const postgresUser = 'nexus_v2_dev';
const temporalNamespace = 'nexus-v2-local';

class InfrastructureError extends Error {}

function commandText(args) {
  return ['docker', ...args].join(' ');
}

function runDocker(args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync('docker', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
  });

  if (result.error?.code === 'ENOENT') {
    throw new InfrastructureError(
      'Docker CLI was not found. Install Docker Desktop with Docker Compose, then run `pnpm infra:up` again.',
    );
  }
  if (result.error) {
    throw new InfrastructureError(
      `Could not execute ${commandText(args)}: ${result.error.message}`,
    );
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new InfrastructureError(
      `${commandText(args)} failed with exit code ${result.status}.${detail ? `\n${detail}` : ''}`,
    );
  }
  return result;
}

function composeArgs(...args) {
  return ['compose', '--project-name', projectName, '--file', composeFile, ...args];
}

function requireDocker() {
  const compose = runDocker(['compose', 'version'], {
    capture: true,
    allowFailure: true,
  });
  if (compose.status !== 0) {
    throw new InfrastructureError(
      'Docker Compose is unavailable. Install or update Docker Desktop, then confirm `docker compose version` succeeds.',
    );
  }

  const daemon = runDocker(['info', '--format', '{{.ServerVersion}}'], {
    capture: true,
    allowFailure: true,
  });
  if (daemon.status !== 0) {
    throw new InfrastructureError(
      'Docker Desktop is installed but its Linux container engine is unavailable. Start Docker Desktop, wait until it reports that the engine is running, then retry.',
    );
  }
}

function runCompose(args, options) {
  return runDocker(composeArgs(...args), options);
}

function serviceIsRunning(service) {
  const result = runCompose(['ps', '--status', 'running', '--services'], {
    capture: true,
    allowFailure: true,
  });
  const running = new Set(
    result.stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return result.status === 0 && running.has(service);
}

function checkPostgres() {
  if (!serviceIsRunning('postgres')) {
    throw new InfrastructureError(
      'PostgreSQL is not running. Start it with `pnpm infra:up`; inspect failures with `pnpm infra:logs`.',
    );
  }

  const ready = runCompose(
    [
      'exec',
      '--no-TTY',
      'postgres',
      'pg_isready',
      '--username',
      postgresUser,
      '--dbname',
      postgresDatabase,
    ],
    { capture: true, allowFailure: true },
  );
  if (ready.status !== 0) {
    throw new InfrastructureError(
      `PostgreSQL is running but is not accepting connections to ${postgresDatabase}. Run \`pnpm infra:logs\` for container diagnostics.`,
    );
  }

  const database = runCompose(
    [
      'exec',
      '--no-TTY',
      'postgres',
      'psql',
      '--username',
      postgresUser,
      '--dbname',
      postgresDatabase,
      '--tuples-only',
      '--no-align',
      '--command',
      'SELECT current_database();',
    ],
    { capture: true, allowFailure: true },
  );
  if (database.status !== 0 || database.stdout.trim() !== postgresDatabase) {
    throw new InfrastructureError(
      `PostgreSQL accepted a connection, but the intended database ${postgresDatabase} was not reachable. Run \`pnpm infra:logs\`.`,
    );
  }

  console.log(`PostgreSQL healthy: database ${postgresDatabase} accepts connections.`);
}

function checkTemporal() {
  if (!serviceIsRunning('temporal')) {
    throw new InfrastructureError(
      'Temporal is not running. Start it with `pnpm infra:up`; inspect failures with `pnpm infra:logs`.',
    );
  }

  const namespace = runCompose(
    [
      'exec',
      '--no-TTY',
      'temporal',
      'temporal',
      'operator',
      'namespace',
      'describe',
      '--namespace',
      temporalNamespace,
      '--address',
      'localhost:7233',
    ],
    { capture: true, allowFailure: true },
  );
  if (namespace.status !== 0) {
    throw new InfrastructureError(
      `Temporal is running, but its frontend or namespace ${temporalNamespace} did not respond. Run \`pnpm infra:logs\`.`,
    );
  }

  console.log(
    `Temporal healthy: frontend responded and namespace ${temporalNamespace} is accessible.`,
  );
}

function health() {
  requireDocker();
  checkPostgres();
  checkTemporal();
  console.log('Nexus v2 local infrastructure is healthy.');
}

function up() {
  requireDocker();
  runCompose(['up', '--detach', '--wait', '--wait-timeout', '180']);
  health();
}

function postgresUp() {
  requireDocker();
  runCompose(['up', '--detach', '--wait', '--wait-timeout', '180', 'postgres']);
  checkPostgres();
}

function down() {
  requireDocker();
  runCompose(['down', '--remove-orphans']);
  console.log(
    `Nexus v2 local services stopped. Volumes ${localVolumeNames.join(', ')} were preserved.`,
  );
}

function validateResetScope() {
  if (
    projectName !== 'nexus-v2-local' ||
    localVolumeNames.length !== 2 ||
    localVolumeNames.some(
      (volume) => !volume.startsWith(`${projectName}-`) || !volume.endsWith('-data'),
    )
  ) {
    throw new InfrastructureError(
      'Reset safety check refused to continue because the local project or volume allow-list is unexpected.',
    );
  }

  const rendered = runCompose(['config', '--format', 'json'], { capture: true });
  let config;
  try {
    config = JSON.parse(rendered.stdout);
  } catch {
    throw new InfrastructureError(
      'Reset safety check could not parse the rendered Compose configuration.',
    );
  }
  const configuredServices = Object.keys(config.services ?? {}).sort();
  const configuredVolumes = Object.values(config.volumes ?? {})
    .map((volume) => volume.name)
    .sort();
  if (
    config.name !== projectName ||
    JSON.stringify(configuredServices) !== JSON.stringify([...serviceNames].sort()) ||
    JSON.stringify(configuredVolumes) !== JSON.stringify([...localVolumeNames].sort())
  ) {
    throw new InfrastructureError(
      'Reset safety check refused to continue: rendered Compose project, services, or volume names differ from the Nexus v2 local allow-list.',
    );
  }
}

function reset() {
  requireDocker();
  validateResetScope();
  console.log(
    `DESTRUCTIVE LOCAL RESET: removing only Compose project ${projectName} and volumes ${localVolumeNames.join(', ')}.`,
  );
  runCompose(['down', '--volumes', '--remove-orphans']);
  runCompose(['up', '--detach', '--wait', '--wait-timeout', '180']);
  health();
  console.log('Nexus v2 local infrastructure was recreated in a clean healthy state.');
}

function logs() {
  requireDocker();
  runCompose(['logs', '--tail', '200']);
}

const actions = { down, health, logs, 'postgres-up': postgresUp, reset, up };
const action = process.argv[2];

if (!Object.hasOwn(actions, action)) {
  console.error('Usage: node scripts/local-infra.mjs <up|postgres-up|down|health|reset|logs>');
  process.exitCode = 2;
} else {
  try {
    actions[action]();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local infrastructure error.';
    console.error(`Local infrastructure command failed: ${message}`);
    process.exitCode = 1;
  }
}
