import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import * as ts from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

import {
  environmentNames,
  environmentSensitivities,
  environmentVisibilities,
  productionSources,
  type EnvironmentName,
  type EnvironmentRegistry,
  type EnvironmentSensitivity,
  type EnvironmentVariableDefinition,
  type EnvironmentVisibility,
  type ProductionSource,
} from './schema.ts';

const execFileAsync = promisify(execFile);
const environmentFilePattern = /^\.env(?:\..+)?$/u;
const secretLikeClientName =
  /(?:SECRET|PASSWORD|TOKEN|PRIVATE|CREDENTIAL|DATABASE_URL|API_KEY|ACCESS_KEY)/u;
const sourceExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const ignoredDirectories = new Set([
  '.cache',
  '.git',
  '.pnpm-store',
  '.tmp',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'tmp',
]);

export type EnvironmentSurface = 'process.env' | 'import.meta.env' | 'compose';

export interface EnvironmentReference {
  readonly name: string;
  readonly surface: EnvironmentSurface;
  readonly file: string;
  readonly line: number;
  readonly fallback?: string;
}

function fail(errors: readonly string[]): never {
  throw new Error(`Environment governance validation failed:\n- ${errors.join('\n- ')}`);
}

function object(value: unknown, label: string, errors: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return {};
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, errors: string[]): string {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be a non-empty string.`);
    return '';
  }
  return value;
}

function stringArray(value: unknown, label: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value.map((entry, index) => text(entry, `${label}[${index}]`, errors));
}

function vocabulary<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  errors: string[],
): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
    return allowed[0] as T[number];
  }
  return value as T[number];
}

function duplicates(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function isLoopbackDatabaseExample(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost'].includes(url.hostname) &&
      url.username.includes('nexus_v2_dev') &&
      url.password.includes('local_only')
    );
  } catch {
    return false;
  }
}

export function validateEnvironmentRegistry(value: unknown): EnvironmentRegistry {
  const errors: string[] = [];
  const root = object(value, 'registry', errors);
  if (root.schemaVersion !== 1) errors.push('registry.schemaVersion must be 1.');
  const allowedTrackedEnvFiles = stringArray(
    root.allowedTrackedEnvFiles,
    'registry.allowedTrackedEnvFiles',
    errors,
  );
  if (allowedTrackedEnvFiles.length !== 1 || allowedTrackedEnvFiles[0] !== '.env.example') {
    errors.push('Only .env.example may be an allowed tracked environment file.');
  }

  const exemptionInput = Array.isArray(root.frameworkExemptions) ? root.frameworkExemptions : [];
  if (!Array.isArray(root.frameworkExemptions)) {
    errors.push('registry.frameworkExemptions must be an array.');
  }
  const frameworkExemptions = exemptionInput.map((entry, index) => {
    const exemption = object(entry, `frameworkExemptions[${index}]`, errors);
    const name = text(exemption.name, `frameworkExemptions[${index}].name`, errors);
    if (!/^[A-Z][A-Z0-9_]*$/u.test(name)) {
      errors.push(`frameworkExemptions[${index}].name must be an uppercase identifier.`);
    }
    if (exemption.surface !== 'import.meta.env') {
      errors.push(`frameworkExemptions[${index}].surface must be import.meta.env.`);
    }
    return {
      name,
      surface: 'import.meta.env' as const,
      owner: text(exemption.owner, `frameworkExemptions[${index}].owner`, errors),
    };
  });

  const variableInput = Array.isArray(root.variables) ? root.variables : [];
  if (!Array.isArray(root.variables)) errors.push('registry.variables must be an array.');
  const variables = variableInput.map((entry, index): EnvironmentVariableDefinition => {
    const variable = object(entry, `variables[${index}]`, errors);
    const name = text(variable.name, `variables[${index}].name`, errors);
    const visibility = vocabulary(
      variable.visibility,
      environmentVisibilities,
      `${name}.visibility`,
      errors,
    ) as EnvironmentVisibility;
    const sensitivity = vocabulary(
      variable.sensitivity,
      environmentSensitivities,
      `${name}.sensitivity`,
      errors,
    ) as EnvironmentSensitivity;
    const environments = stringArray(variable.environments, `${name}.environments`, errors).map(
      (environment) =>
        vocabulary(
          environment,
          environmentNames,
          `${name}.environments`,
          errors,
        ) as EnvironmentName,
    );
    const requiredIn = stringArray(variable.requiredIn, `${name}.requiredIn`, errors).map(
      (environment) =>
        vocabulary(environment, environmentNames, `${name}.requiredIn`, errors) as EnvironmentName,
    );
    const committedExampleInput = object(
      variable.committedExample,
      `${name}.committedExample`,
      errors,
    );
    if (typeof committedExampleInput.permitted !== 'boolean') {
      errors.push(`${name}.committedExample.permitted must be boolean.`);
    }
    const allowedValues = stringArray(
      committedExampleInput.allowedValues,
      `${name}.committedExample.allowedValues`,
      errors,
    );
    const productionSource = vocabulary(
      variable.productionSource,
      productionSources,
      `${name}.productionSource`,
      errors,
    ) as ProductionSource;

    if (!/^[A-Z][A-Z0-9_]*$/u.test(name)) {
      errors.push(`${name || `variables[${index}]`}.name must be an uppercase identifier.`);
    }
    if (environments.length === 0) errors.push(`${name}.environments must not be empty.`);
    for (const environment of requiredIn) {
      if (!environments.includes(environment)) {
        errors.push(`${name}.requiredIn contains inapplicable environment ${environment}.`);
      }
    }
    if (visibility === 'client' && sensitivity === 'secret') {
      errors.push(`${name} cannot combine client visibility with secret sensitivity.`);
    }
    if (visibility === 'client' && secretLikeClientName.test(name)) {
      errors.push(`${name} is a secret-like name and cannot be browser-visible.`);
    }
    if (name.startsWith('VITE_') && (visibility !== 'client' || sensitivity === 'secret')) {
      errors.push(`${name} must be public client configuration.`);
    }
    if (name === 'DATABASE_URL' && visibility === 'client') {
      errors.push('DATABASE_URL cannot be client-visible.');
    }
    if (committedExampleInput.permitted === false && allowedValues.length > 0) {
      errors.push(`${name} cannot define allowed example values when examples are prohibited.`);
    }
    if (committedExampleInput.permitted === true && allowedValues.length === 0) {
      errors.push(`${name} permits a committed example but defines no allowed values.`);
    }
    if (
      sensitivity === 'secret' &&
      (name !== 'DATABASE_URL' ||
        allowedValues.some((example) => !isLoopbackDatabaseExample(example)))
    ) {
      errors.push(`${name} secret examples must be the explicit loopback-only DATABASE_URL.`);
    }
    if (sensitivity === 'secret' && productionSource !== 'google-cloud-secret-manager') {
      errors.push(`${name} secrets must name Google Cloud Secret Manager as production source.`);
    }
    if (environments.includes('production') && productionSource === 'not-applicable') {
      errors.push(`${name} applies to production and must define a production source.`);
    }
    if (!environments.includes('production') && productionSource !== 'not-applicable') {
      errors.push(`${name} does not apply to production and must use not-applicable source.`);
    }

    return {
      name,
      owner: text(variable.owner, `${name}.owner`, errors),
      purpose: text(variable.purpose, `${name}.purpose`, errors),
      visibility,
      sensitivity,
      environments,
      requiredIn,
      committedExample: {
        permitted: committedExampleInput.permitted === true,
        allowedValues,
      },
      productionSource,
    };
  });

  const names = variables.map(({ name }) => name);
  const repeated = duplicates(names);
  if (repeated.length > 0)
    errors.push(`Environment variable names are duplicated: ${repeated.join(', ')}.`);
  if (JSON.stringify(names) !== JSON.stringify([...names].sort())) {
    errors.push('Environment variables must be sorted by name.');
  }
  const repeatedExemptions = duplicates(frameworkExemptions.map(({ name }) => name));
  if (repeatedExemptions.length > 0) {
    errors.push(`Framework exemptions are duplicated: ${repeatedExemptions.join(', ')}.`);
  }
  if (errors.length > 0) fail(errors);
  return {
    schemaVersion: 1,
    allowedTrackedEnvFiles,
    frameworkExemptions,
    variables,
  };
}

export function parseEnvExample(content: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  const errors: string[] = [];
  for (const [index, rawLine] of content.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
    if (!match) {
      errors.push(`.env.example line ${index + 1} is not NAME=value.`);
      continue;
    }
    const [, name = '', variableValue = ''] = match;
    if (values.has(name)) errors.push(`.env.example repeats ${name}.`);
    values.set(name, variableValue);
  }
  if (errors.length > 0) fail(errors);
  return values;
}

export function validateEnvExample(
  content: string,
  registry: EnvironmentRegistry,
): readonly string[] {
  const errors: string[] = [];
  let values: ReadonlyMap<string, string>;
  try {
    values = parseEnvExample(content);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const definitions = new Map(registry.variables.map((variable) => [variable.name, variable]));
  for (const [name, value] of values) {
    const definition = definitions.get(name);
    if (!definition) {
      errors.push(`.env.example contains unregistered variable ${name}.`);
      continue;
    }
    if (!definition.committedExample.permitted) {
      errors.push(`${name} is prohibited from committed examples.`);
    } else if (!definition.committedExample.allowedValues.includes(value)) {
      errors.push(`${name} does not use an explicitly approved committed example value.`);
    }
  }
  for (const definition of registry.variables) {
    if (definition.committedExample.permitted && !values.has(definition.name)) {
      errors.push(`.env.example is missing registered example ${definition.name}.`);
    }
  }
  return errors;
}

function envAccess(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): {
  name: string;
  surface: Exclude<EnvironmentSurface, 'compose'>;
} | null {
  if (ts.isPropertyAccessExpression(node)) {
    const base = node.expression.getText(sourceFile);
    if (base === 'process.env' || base === 'import.meta.env') {
      return { name: node.name.text, surface: base };
    }
  }
  if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    const base = node.expression.getText(sourceFile);
    if (
      (base === 'process.env' || base === 'import.meta.env') &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      return { name: node.argumentExpression.text, surface: base };
    }
  }
  return null;
}

function relativeFile(rootDir: string, filename: string): string {
  return path.relative(rootDir, filename).split(path.sep).join('/');
}

export function isCredentialBearingRemoteUrl(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.username !== '' || url.password !== '') &&
      !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function scanSourceFile(
  rootDir: string,
  filename: string,
  sourceFile: ts.SourceFile,
): EnvironmentReference[] {
  const references: EnvironmentReference[] = [];
  const credentialUrlLocations: number[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      isCredentialBearingRemoteUrl(node.text)
    ) {
      credentialUrlLocations.push(
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      );
    }
    const access = envAccess(node, sourceFile);
    if (access) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const parent = node.parent;
      const fallback =
        ts.isBinaryExpression(parent) &&
        parent.left === node &&
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(
          parent.operatorToken.kind,
        ) &&
        ts.isStringLiteral(parent.right)
          ? parent.right.text
          : undefined;
      references.push({
        ...access,
        file: relativeFile(rootDir, filename),
        line: position.line + 1,
        ...(fallback === undefined ? {} : { fallback }),
      });
    }
    node.forEachChild(visit);
  }
  visit(sourceFile);
  if (credentialUrlLocations.length > 0) {
    throw new Error(
      `Environment governance validation failed:\n- ${relativeFile(rootDir, filename)}:${credentialUrlLocations.join(',')} contains a credential-bearing remote URL.`,
    );
  }
  return references;
}

async function sourceFiles(rootDir: string, directory = rootDir): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await sourceFiles(rootDir, path.join(directory, entry.name))));
      }
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

export async function collectEnvironmentReferences(
  rootDir: string,
): Promise<readonly EnvironmentReference[]> {
  const references: EnvironmentReference[] = [];
  const filenames = await sourceFiles(rootDir);
  const api = new API({ cwd: rootDir });
  const snapshot = api.updateSnapshot({ openFiles: filenames });
  try {
    for (const filename of filenames) {
      const sourceFile = snapshot
        .getDefaultProjectForFile(filename)
        ?.program.getSourceFile(filename);
      if (!sourceFile) {
        throw new Error(`TypeScript could not inspect ${relativeFile(rootDir, filename)}.`);
      }
      references.push(...scanSourceFile(rootDir, filename, sourceFile));
    }
  } finally {
    snapshot.dispose();
    api.close();
  }
  const composePath = path.join(rootDir, 'infra', 'compose.yaml');
  const compose = await readFile(composePath, 'utf8');
  for (const match of compose.matchAll(/\$\{([A-Z][A-Z0-9_]*)(?::-[^}]*)?\}/gu)) {
    const line = compose.slice(0, match.index).split(/\r?\n/u).length;
    const fallback = match[0].includes(':-')
      ? match[0].slice(match[0].indexOf(':-') + 2, -1)
      : undefined;
    references.push({
      name: match[1] ?? '',
      surface: 'compose',
      file: 'infra/compose.yaml',
      line,
      ...(fallback === undefined ? {} : { fallback }),
    });
  }
  return references.toSorted((left, right) =>
    `${left.file}:${left.line}:${left.name}`.localeCompare(
      `${right.file}:${right.line}:${right.name}`,
    ),
  );
}

export function validateEnvironmentReferences(
  references: readonly EnvironmentReference[],
  registry: EnvironmentRegistry,
): readonly string[] {
  const errors: string[] = [];
  const definitions = new Map(registry.variables.map((variable) => [variable.name, variable]));
  const exemptions = new Set(
    registry.frameworkExemptions.map(({ name, surface }) => `${surface}:${name}`),
  );
  for (const reference of references) {
    const definition = definitions.get(reference.name);
    if (!definition) {
      if (exemptions.has(`${reference.surface}:${reference.name}`)) continue;
      errors.push(
        `${reference.file}:${reference.line} references unregistered ${reference.surface} variable ${reference.name}.`,
      );
      continue;
    }
    if (reference.surface === 'import.meta.env' && definition.visibility !== 'client') {
      errors.push(`${reference.file}:${reference.line} exposes non-client ${reference.name}.`);
    }
    if (definition.visibility === 'client' && secretLikeClientName.test(reference.name)) {
      errors.push(
        `${reference.file}:${reference.line} exposes secret-like client name ${reference.name}.`,
      );
    }
    if (
      reference.fallback !== undefined &&
      definition.sensitivity === 'secret' &&
      !definition.committedExample.allowedValues.includes(reference.fallback)
    ) {
      errors.push(
        `${reference.file}:${reference.line} hard-codes a secret fallback for ${reference.name}.`,
      );
    }
  }
  return errors;
}

export function validateTrackedEnvironmentFiles(
  trackedFiles: readonly string[],
  registry: EnvironmentRegistry,
): readonly string[] {
  const allowed = new Set(registry.allowedTrackedEnvFiles);
  return trackedFiles
    .map((filename) => filename.split('\\').join('/'))
    .filter((filename) => environmentFilePattern.test(path.posix.basename(filename)))
    .filter((filename) => !allowed.has(filename))
    .map((filename) => `Tracked environment file is prohibited: ${filename}.`);
}

export async function loadEnvironmentRegistry(rootDir: string): Promise<EnvironmentRegistry> {
  const registryPath = path.join(rootDir, 'docs', 'security', 'environment.registry.json');
  return validateEnvironmentRegistry(JSON.parse(await readFile(registryPath, 'utf8')) as unknown);
}

async function trackedFiles(rootDir: string): Promise<readonly string[]> {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });
  return stdout.split('\0').filter(Boolean);
}

export async function checkEnvironmentGovernance(rootDir: string): Promise<{
  readonly registry: EnvironmentRegistry;
  readonly references: readonly EnvironmentReference[];
}> {
  const registry = await loadEnvironmentRegistry(rootDir);
  const errors = [
    ...validateEnvExample(await readFile(path.join(rootDir, '.env.example'), 'utf8'), registry),
    ...validateTrackedEnvironmentFiles(await trackedFiles(rootDir), registry),
  ];
  const references = await collectEnvironmentReferences(rootDir);
  errors.push(...validateEnvironmentReferences(references, registry));
  const gitignore = await readFile(path.join(rootDir, '.gitignore'), 'utf8');
  for (const requiredLine of ['.env', '.env.*', '!.env.example']) {
    if (!gitignore.split(/\r?\n/u).includes(requiredLine)) {
      errors.push(`.gitignore must contain exact environment rule ${requiredLine}.`);
    }
  }
  if (errors.length > 0) fail(errors);
  return { registry, references };
}
