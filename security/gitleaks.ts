import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  gitleaksAssets,
  gitleaksChecksums,
  gitleaksReleaseBaseUrl,
  gitleaksVersion,
  type GitleaksAsset,
} from './gitleaks-manifest.ts';

const approvedIgnoreFingerprints = Object.freeze([
  'packages/database/src/tooling/database.integration.test.ts:generic-api-key:87',
  'packages/database/src/tooling/database.integration.test.ts:generic-api-key:93',
  'packages/database/src/tooling/database.integration.test.ts:generic-api-key:94',
  'packages/database/src/tooling/database.integration.test.ts:generic-api-key:100',
  '35dc44f24d94f4c7376be5a9e89a02d08e9cfa09:packages/database/src/tooling/database.integration.test.ts:generic-api-key:94',
  '402814fb67499c9e6c4cfe3eb111016057d9ddb2:packages/database/src/tooling/database.integration.test.ts:generic-api-key:93',
  '402814fb67499c9e6c4cfe3eb111016057d9ddb2:packages/database/src/tooling/database.integration.test.ts:generic-api-key:99',
  '402814fb67499c9e6c4cfe3eb111016057d9ddb2:packages/database/src/tooling/database.integration.test.ts:generic-api-key:100',
  '402814fb67499c9e6c4cfe3eb111016057d9ddb2:packages/database/src/tooling/database.integration.test.ts:generic-api-key:106',
]);

export interface GitleaksFinding {
  readonly RuleID?: string;
  readonly File?: string;
  readonly Commit?: string;
  readonly Fingerprint?: string;
  readonly Secret?: string;
  readonly [key: string]: unknown;
}

export interface GitleaksScanResult {
  readonly exitCode: number;
  readonly findings: readonly GitleaksFinding[];
  readonly output: string;
  readonly reportText: string;
}

type Download = (url: string) => Promise<Uint8Array>;

export interface ProvisionOptions {
  readonly cacheRoot?: string;
  readonly download?: Download;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: NodeJS.Architecture;
}

function platformKey(
  platform: NodeJS.Platform = process.platform,
  architecture: NodeJS.Architecture = process.arch,
): string {
  return `${platform}-${architecture}`;
}

function selectedAsset(
  platform?: NodeJS.Platform,
  architecture?: NodeJS.Architecture,
): GitleaksAsset {
  const key = platformKey(platform, architecture);
  const asset = gitleaksAssets[key];
  if (!asset) {
    throw new Error(
      `Gitleaks ${gitleaksVersion} provisioning does not support ${key}. Supported targets: ${Object.keys(gitleaksAssets).join(', ')}.`,
    );
  }
  return asset;
}

async function exists(filename: string): Promise<boolean> {
  try {
    await stat(filename);
    return true;
  } catch {
    return false;
  }
}

async function sha256(filename: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filename))
    .digest('hex');
}

async function officialDownload(url: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (error) {
    throw new Error(
      `Could not download the pinned official Gitleaks artifact. Check network access and retry pnpm secrets:bootstrap. ${error instanceof Error ? error.message : ''}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Official Gitleaks download failed with HTTP ${response.status}; no scanner was accepted.`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

function runVersion(binaryPath: string): string {
  const result = spawnSync(binaryPath, ['version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Provisioned Gitleaks could not report its version.`);
  }
  return result.stdout.trim();
}

async function validBinary(binaryPath: string, asset: GitleaksAsset): Promise<boolean> {
  if (!(await exists(binaryPath))) return false;
  if ((await sha256(binaryPath)) !== asset.binarySha256) return false;
  try {
    return runVersion(binaryPath) === gitleaksVersion;
  } catch {
    return false;
  }
}

function checksumFromOfficialFile(content: string, archive: string): string | undefined {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u))
    .find((parts) => parts[1] === archive)?.[0];
}

async function verifiedFile(
  filename: string,
  expectedSha256: string,
  url: string,
  download: Download,
): Promise<void> {
  if ((await exists(filename)) && (await sha256(filename)) === expectedSha256) return;
  const temporary = `${filename}.download`;
  await rm(temporary, { force: true });
  await writeFile(temporary, await download(url), { flag: 'wx' });
  const actual = await sha256(temporary);
  if (actual !== expectedSha256) {
    await rm(temporary, { force: true });
    throw new Error(
      `Pinned Gitleaks artifact integrity check failed for ${path.basename(filename)}; expected official SHA-256 ${expectedSha256}, received ${actual}.`,
    );
  }
  await rm(filename, { force: true });
  await rename(temporary, filename);
}

export function validateGitleaksPolicy(config: string, ignore: string): void {
  const errors: string[] = [];
  if (!/^\[extend\]$/mu.test(config) || !/^useDefault\s*=\s*true$/mu.test(config)) {
    errors.push('.gitleaks.toml must extend the built-in default rule set.');
  }
  if (
    /\[\[?allowlists?\]?\]|\[\[rules\]\]|\b(?:paths|regexes|commits|stopwords)\s*=/u.test(config)
  ) {
    errors.push('.gitleaks.toml contains an unapproved rule or allowlist block.');
  }
  if (/\.\*/u.test(config)) errors.push('.gitleaks.toml contains a broad wildcard allowlist.');

  const fingerprints = ignore
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  if (fingerprints.some((fingerprint) => /[*?]/u.test(fingerprint))) {
    errors.push('.gitleaksignore may contain exact fingerprints only, never wildcards.');
  }
  if (
    JSON.stringify([...fingerprints].sort()) !==
    JSON.stringify([...approvedIgnoreFingerprints].sort())
  ) {
    errors.push('.gitleaksignore differs from the reviewed exact fingerprint inventory.');
  }
  if (errors.length > 0) {
    throw new Error(`Gitleaks policy validation failed:\n- ${errors.join('\n- ')}`);
  }
}

export async function validateRepositoryGitleaksPolicy(rootDir: string): Promise<void> {
  validateGitleaksPolicy(
    await readFile(path.join(rootDir, '.gitleaks.toml'), 'utf8'),
    await readFile(path.join(rootDir, '.gitleaksignore'), 'utf8'),
  );
}

export async function ensureGitleaks(
  rootDir: string,
  options: ProvisionOptions = {},
): Promise<string> {
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  const asset = selectedAsset(platform, architecture);
  const cacheRoot =
    options.cacheRoot ??
    path.join(
      rootDir,
      '.cache',
      'gitleaks',
      `v${gitleaksVersion}`,
      platformKey(platform, architecture),
    );
  const binaryPath = path.join(cacheRoot, asset.binary);
  await mkdir(cacheRoot, { recursive: true });
  if (await validBinary(binaryPath, asset)) return binaryPath;

  const download = options.download ?? officialDownload;
  const checksumPath = path.join(cacheRoot, gitleaksChecksums.filename);
  await verifiedFile(
    checksumPath,
    gitleaksChecksums.sha256,
    `${gitleaksReleaseBaseUrl}/${gitleaksChecksums.filename}`,
    download,
  );
  const officialChecksum = checksumFromOfficialFile(
    await readFile(checksumPath, 'utf8'),
    asset.archive,
  );
  if (officialChecksum !== asset.archiveSha256) {
    throw new Error(
      `Official Gitleaks checksum manifest does not match the repository pin for ${asset.archive}.`,
    );
  }

  const archivePath = path.join(cacheRoot, asset.archive);
  await verifiedFile(
    archivePath,
    asset.archiveSha256,
    `${gitleaksReleaseBaseUrl}/${asset.archive}`,
    download,
  );
  const extractDirectory = await mkdtemp(path.join(cacheRoot, '.extract-'));
  try {
    const extraction = spawnSync('tar', ['-xf', archivePath, '-C', extractDirectory], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (extraction.error || extraction.status !== 0) {
      throw new Error(
        `Could not extract the verified Gitleaks archive with tar. Ensure a standard tar executable is available.`,
      );
    }
    const extractedBinary = path.join(extractDirectory, asset.binary);
    if ((await sha256(extractedBinary)) !== asset.binarySha256) {
      throw new Error('Extracted Gitleaks binary failed its pinned SHA-256 integrity check.');
    }
    const temporaryBinary = `${binaryPath}.new`;
    await rm(temporaryBinary, { force: true });
    await copyFile(extractedBinary, temporaryBinary);
    if (platform !== 'win32') await chmod(temporaryBinary, 0o755);
    await rm(binaryPath, { force: true });
    await rename(temporaryBinary, binaryPath);
  } finally {
    await rm(extractDirectory, { recursive: true, force: true });
  }
  if (!(await validBinary(binaryPath, asset))) {
    throw new Error(`Provisioned scanner is not the pinned Gitleaks ${gitleaksVersion} binary.`);
  }
  return binaryPath;
}

export async function executeGitleaksScan(options: {
  readonly binaryPath: string;
  readonly mode: 'dir' | 'git';
  readonly source: string;
  readonly configPath: string;
  readonly ignorePath: string;
  readonly cwd: string;
}): Promise<GitleaksScanResult> {
  const reportDirectory = await mkdtemp(path.join(os.tmpdir(), 'nexus-gitleaks-report-'));
  const reportPath = path.join(reportDirectory, 'findings.json');
  try {
    const args = [
      options.mode,
      '--no-banner',
      '--no-color',
      '--redact=100',
      '--report-format=json',
      `--report-path=${reportPath}`,
      `--config=${options.configPath}`,
      `--gitleaks-ignore-path=${options.ignorePath}`,
      ...(options.mode === 'git' ? ['--log-opts=--all --full-history'] : []),
      options.source,
    ];
    const result = spawnSync(options.binaryPath, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error) throw new Error('Gitleaks could not be executed.');
    const reportText = (await exists(reportPath)) ? await readFile(reportPath, 'utf8') : '[]';
    let findings: GitleaksFinding[];
    try {
      const parsed: unknown = JSON.parse(reportText || '[]');
      findings = Array.isArray(parsed) ? (parsed as GitleaksFinding[]) : [];
    } catch {
      throw new Error('Gitleaks produced an unreadable redacted report.');
    }
    return {
      exitCode: result.status ?? 2,
      findings,
      output: `${result.stdout}${result.stderr}`,
      reportText,
    };
  } finally {
    await rm(reportDirectory, { recursive: true, force: true });
  }
}

async function relevantWorkingFiles(rootDir: string): Promise<readonly string[]> {
  const result = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      'Could not enumerate tracked and relevant untracked files for secret scanning.',
    );
  }
  return result.stdout.split('\0').filter(Boolean);
}

async function stageWorkingTree(rootDir: string): Promise<string> {
  const staging = await mkdtemp(path.join(os.tmpdir(), 'nexus-gitleaks-working-'));
  for (const repositoryPath of await relevantWorkingFiles(rootDir)) {
    const source = path.resolve(rootDir, repositoryPath);
    const relative = path.relative(path.resolve(rootDir), source);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Working-tree secret scan refused a path outside the repository.');
    }
    if (!(await exists(source))) continue;
    const details = await lstat(source);
    if (details.isSymbolicLink()) {
      throw new Error(`Working-tree secret scan refuses symbolic link ${repositoryPath}.`);
    }
    if (!details.isFile()) continue;
    const destination = path.join(staging, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
  return staging;
}

function findingMessage(surface: string, findings: readonly GitleaksFinding[]): string {
  const details = findings
    .map((finding) => {
      const location = finding.File ?? 'unknown-file';
      const commit = finding.Commit ? ` commit=${finding.Commit}` : '';
      return `rule=${finding.RuleID ?? 'unknown-rule'} path=${location}${commit}`;
    })
    .join('\n- ');
  return `Gitleaks ${surface} scan found ${findings.length} potential secret(s). Values are fully redacted.\n- ${details}\nTreat probable credentials as compromised and follow docs/security/README.md.`;
}

export async function requireCleanGitleaksResult(
  surface: string,
  result: GitleaksScanResult,
): Promise<void> {
  if (result.findings.some((finding) => finding.Secret !== 'REDACTED')) {
    throw new Error(
      `Gitleaks ${surface} scan failed closed because report redaction was incomplete.`,
    );
  }
  if (result.exitCode === 1 && result.findings.length > 0) {
    throw new Error(findingMessage(surface, result.findings));
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `Gitleaks ${surface} scan failed with exit code ${result.exitCode}; no scan was accepted. Run pnpm secrets:bootstrap and retry.`,
    );
  }
}

export async function scanWorkingTree(rootDir: string, binaryPath: string): Promise<void> {
  const staging = await stageWorkingTree(rootDir);
  try {
    await requireCleanGitleaksResult(
      'working-tree',
      await executeGitleaksScan({
        binaryPath,
        mode: 'dir',
        source: '.',
        configPath: path.join(staging, '.gitleaks.toml'),
        ignorePath: path.join(staging, '.gitleaksignore'),
        cwd: staging,
      }),
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function scanGitHistory(rootDir: string, binaryPath: string): Promise<void> {
  await requireCleanGitleaksResult(
    'Git-history',
    await executeGitleaksScan({
      binaryPath,
      mode: 'git',
      source: '.',
      configPath: path.join(rootDir, '.gitleaks.toml'),
      ignorePath: path.join(rootDir, '.gitleaksignore'),
      cwd: rootDir,
    }),
  );
}

async function main(): Promise<void> {
  const [command, ...extra] = process.argv.slice(2);
  if (!['bootstrap', 'working', 'history', 'check'].includes(command ?? '') || extra.length > 0) {
    throw new Error('Usage: node security/gitleaks.ts <bootstrap|working|history|check>');
  }
  const rootDir = process.cwd();
  if (command !== 'bootstrap') await validateRepositoryGitleaksPolicy(rootDir);
  const binaryPath = await ensureGitleaks(rootDir);
  if (command === 'bootstrap') {
    console.log(`Verified official Gitleaks ${gitleaksVersion} at ${binaryPath}.`);
    return;
  }
  if (command === 'working' || command === 'check') {
    await scanWorkingTree(rootDir, binaryPath);
    console.log('Gitleaks working-tree scan passed with full redaction enabled.');
  }
  if (command === 'history' || command === 'check') {
    await scanGitHistory(rootDir, binaryPath);
    console.log('Gitleaks full Git-history scan passed with full redaction enabled.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
