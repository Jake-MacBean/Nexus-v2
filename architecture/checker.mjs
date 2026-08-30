import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { createScanner, LanguageVariant, SyntaxKind } from 'typescript/unstable/ast';

import { architecturePolicy, domainPackageIds, nexusScope } from './policy.mjs';

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);
const dependencySections = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'devDependencies',
];
const domainIds = new Set(domainPackageIds);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function violation({ code, importer, file, imported, rule }) {
  return { code, importer, file, imported, rule };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function discoverGroup(rootDir, group, rules, violations) {
  const groupRoot = path.join(rootDir, group);
  const entries = await readdir(groupRoot, { withFileTypes: true });
  const owners = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const id = entry.name;
    const ownerRoot = path.join(groupRoot, id);
    const manifestPath = path.join(ownerRoot, 'package.json');
    let manifest;

    try {
      manifest = await readJson(manifestPath);
    } catch (error) {
      violations.push(
        violation({
          code: 'INVALID_WORKSPACE_MANIFEST',
          importer: `${group}/${id}`,
          file: toPosix(path.relative(rootDir, manifestPath)),
          imported: '<manifest>',
          rule: `Every workspace must have a readable package.json: ${error.message}`,
        }),
      );
      continue;
    }

    if (!Object.hasOwn(rules, id)) {
      violations.push(
        violation({
          code: 'UNREGISTERED_WORKSPACE',
          importer: manifest.name ?? `${group}/${id}`,
          file: toPosix(path.relative(rootDir, manifestPath)),
          imported: id,
          rule: `Every ${group} workspace must be registered once in architecture/policy.mjs.`,
        }),
      );
    }

    const expectedName = `${nexusScope}${id}`;
    if (manifest.name !== expectedName) {
      violations.push(
        violation({
          code: 'WORKSPACE_NAME_MISMATCH',
          importer: manifest.name ?? `${group}/${id}`,
          file: toPosix(path.relative(rootDir, manifestPath)),
          imported: expectedName,
          rule: 'Workspace package names must match their directory and the Nexus scope.',
        }),
      );
    }

    owners.push({
      id,
      kind: group === 'apps' ? 'app' : 'package',
      name: manifest.name,
      root: ownerRoot,
      manifest,
      manifestPath,
    });
  }

  return owners;
}

async function listSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
    } else if (
      entry.isFile() &&
      sourceExtensions.has(path.extname(entry.name)) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(entryPath);
    }
  }
  return files;
}

function extractModuleSpecifiers(filePath, sourceText) {
  const variant = filePath.endsWith('.tsx') ? LanguageVariant.JSX : LanguageVariant.Standard;
  const scanner = createScanner(true, variant, sourceText);
  const tokens = [];
  const specifiers = [];

  while (true) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;
    tokens.push({
      kind,
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
    });
  }

  function addStringAt(index) {
    const token = tokens[index];
    if (token?.kind === SyntaxKind.StringLiteral) specifiers.push(token.value);
  }

  function addFromClause(start) {
    for (let cursor = start; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor];
      if (token.kind === SyntaxKind.SemicolonToken || token.kind === SyntaxKind.CloseBraceToken) {
        return;
      }
      if (token.kind === SyntaxKind.FromKeyword) {
        addStringAt(cursor + 1);
        return;
      }
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (token.kind === SyntaxKind.ImportKeyword) {
      if (next?.kind === SyntaxKind.StringLiteral) {
        addStringAt(index + 1);
      } else if (next?.kind === SyntaxKind.OpenParenToken) {
        addStringAt(index + 2);
      } else {
        addFromClause(index + 1);
      }
    } else if (token.kind === SyntaxKind.ExportKeyword) {
      addFromClause(index + 1);
    } else if (
      token.kind === SyntaxKind.Identifier &&
      token.value === 'require' &&
      next?.kind === SyntaxKind.OpenParenToken
    ) {
      addStringAt(index + 2);
    }
  }

  return specifiers;
}

function nexusPackageName(specifier) {
  if (!specifier.startsWith(nexusScope)) return undefined;
  const packageId = specifier.slice(nexusScope.length).split('/')[0];
  return packageId ? `${nexusScope}${packageId}` : undefined;
}

function declaredNexusDependencies(owner) {
  const declarations = new Map();
  for (const section of dependencySections) {
    for (const dependencyName of Object.keys(owner.manifest[section] ?? {})) {
      if (dependencyName.startsWith(nexusScope)) {
        const existing = declarations.get(dependencyName) ?? new Set();
        existing.add(section);
        declarations.set(dependencyName, existing);
      }
    }
  }
  return declarations;
}

function dependencyRule(source, target) {
  if (source.kind === 'package' && target.kind === 'app') {
    return {
      code: 'PACKAGE_TO_APP',
      rule: 'packages/* must never depend on apps/*.',
    };
  }

  if (source.kind === 'app' && target.kind === 'app') {
    return {
      code: 'APP_TO_APP',
      rule: 'Deployable apps must not depend on another app implementation.',
    };
  }

  if (
    source.kind === 'package' &&
    source.id !== 'testing' &&
    target.kind === 'package' &&
    target.id === 'testing'
  ) {
    return {
      code: 'PRODUCTION_TO_TESTING',
      rule: 'Production package source must not import @nexus-v2/testing.',
    };
  }

  if (
    source.kind === 'package' &&
    target.kind === 'package' &&
    domainIds.has(source.id) &&
    domainIds.has(target.id) &&
    source.id !== target.id
  ) {
    return {
      code: 'DOMAIN_TO_DOMAIN',
      rule: 'Domain packages must not depend directly on another domain package; use application, events, or workflows for cross-domain coordination.',
    };
  }

  if (source.kind === 'package' && domainIds.has(source.id)) {
    const prohibitedAdapters = {
      ai: 'DOMAIN_TO_AI',
      database: 'DOMAIN_TO_DATABASE',
      integrations: 'DOMAIN_TO_INTEGRATIONS',
      workspaces: 'DOMAIN_TO_WORKSPACES',
    };
    const code = prohibitedAdapters[target.id];
    if (code) {
      return {
        code,
        rule: `Domain packages must not depend on the concrete ${target.id} adapter boundary.`,
      };
    }
  }

  if (
    source.kind === 'package' &&
    source.id === 'ai' &&
    target.kind === 'package' &&
    target.id === 'database'
  ) {
    return {
      code: 'AI_TO_DATABASE',
      rule: 'AI adapters must enter mutations through application capabilities and must not import database implementations.',
    };
  }

  const allowed = architecturePolicy[`${source.kind}s`]?.[source.id] ?? [];
  if (target.kind !== 'package' || !allowed.includes(target.id)) {
    return {
      code: 'DEPENDENCY_NOT_ALLOWED',
      rule: `${source.kind} ${source.id} may depend only on its allow-list in architecture/policy.mjs.`,
    };
  }

  return undefined;
}

function ownerForPath(absolutePath, owners) {
  return owners.find((owner) => isWithin(absolutePath, owner.root));
}

function addEdge(edges, source, target, evidence) {
  if (source.kind !== 'package' || target.kind !== 'package' || source.id === target.id) {
    return;
  }
  const targets = edges.get(source.id) ?? new Map();
  if (!targets.has(target.id)) targets.set(target.id, evidence);
  edges.set(source.id, targets);
}

function detectCycles(edges) {
  const indexByNode = new Map();
  const lowLink = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let index = 0;

  function connect(node) {
    indexByNode.set(node, index);
    lowLink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of edges.get(node)?.keys() ?? []) {
      if (!indexByNode.has(target)) {
        connect(target);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(target)));
      } else if (onStack.has(target)) {
        lowLink.set(node, Math.min(lowLink.get(node), indexByNode.get(target)));
      }
    }

    if (lowLink.get(node) === indexByNode.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      if (component.length > 1) components.push(component.sort());
    }
  }

  for (const node of [...edges.keys()].sort()) {
    if (!indexByNode.has(node)) connect(node);
  }
  return components;
}

function validatePackageExports(owner, rootDir, violations) {
  if (owner.kind !== 'package') return;
  const exportKeys = Object.keys(owner.manifest.exports ?? {});
  const invalid = exportKeys.filter((key) => key !== '.');
  if (!exportKeys.includes('.') || invalid.length > 0) {
    violations.push(
      violation({
        code: 'INVALID_PUBLIC_EXPORTS',
        importer: owner.name,
        file: toPosix(path.relative(rootDir, owner.manifestPath)),
        imported: invalid.length > 0 ? invalid.join(', ') : '<missing root export>',
        rule: 'Nexus packages must expose only the deliberate root public entry point (`exports["."]`).',
      }),
    );
  }
}

export async function validateArchitecture(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const violations = [];
  const apps = await discoverGroup(absoluteRoot, 'apps', architecturePolicy.apps, violations);
  const packages = await discoverGroup(
    absoluteRoot,
    'packages',
    architecturePolicy.packages,
    violations,
  );
  const owners = [...apps, ...packages];
  const ownerByName = new Map(owners.map((owner) => [owner.name, owner]));
  const edges = new Map();
  let sourceFileCount = 0;
  let importCount = 0;

  for (const owner of owners) {
    validatePackageExports(owner, absoluteRoot, violations);
    const declarations = declaredNexusDependencies(owner);

    for (const [dependencyName, sections] of declarations) {
      const target = ownerByName.get(dependencyName);
      if (!target) {
        violations.push(
          violation({
            code: 'UNKNOWN_NEXUS_DEPENDENCY',
            importer: owner.name,
            file: toPosix(path.relative(absoluteRoot, owner.manifestPath)),
            imported: dependencyName,
            rule: 'Every declared @nexus-v2 dependency must resolve to a registered workspace.',
          }),
        );
        continue;
      }

      const devOnlyTesting =
        owner.kind === 'package' &&
        target.id === 'testing' &&
        [...sections].every((section) => section === 'devDependencies');
      const denied = devOnlyTesting ? undefined : dependencyRule(owner, target);
      if (denied) {
        violations.push(
          violation({
            ...denied,
            importer: owner.name,
            file: toPosix(path.relative(absoluteRoot, owner.manifestPath)),
            imported: dependencyName,
          }),
        );
      }
      if (!devOnlyTesting) {
        addEdge(edges, owner, target, {
          file: toPosix(path.relative(absoluteRoot, owner.manifestPath)),
          imported: dependencyName,
        });
      }
    }

    const files = await listSourceFiles(path.join(owner.root, 'src'));
    sourceFileCount += files.length;
    for (const filePath of files) {
      const relativeFile = toPosix(path.relative(absoluteRoot, filePath));
      const sourceText = await readFile(filePath, 'utf8');
      const specifiers = extractModuleSpecifiers(filePath, sourceText);
      importCount += specifiers.length;

      for (const specifier of specifiers) {
        const packageName = nexusPackageName(specifier);
        if (packageName) {
          const target = ownerByName.get(packageName);
          if (!target) {
            violations.push(
              violation({
                code: 'UNKNOWN_NEXUS_IMPORT',
                importer: owner.name,
                file: relativeFile,
                imported: specifier,
                rule: 'Every @nexus-v2 import must resolve to a registered workspace.',
              }),
            );
            continue;
          }

          if (specifier !== packageName) {
            violations.push(
              violation({
                code: 'DEEP_PACKAGE_IMPORT',
                importer: owner.name,
                file: relativeFile,
                imported: specifier,
                rule: `Cross-package imports must use the public root entry point ${packageName}.`,
              }),
            );
          }

          if (owner.name !== target.name) {
            if (!declarations.has(packageName)) {
              violations.push(
                violation({
                  code: 'UNDECLARED_NEXUS_DEPENDENCY',
                  importer: owner.name,
                  file: relativeFile,
                  imported: specifier,
                  rule: 'Cross-workspace imports must be declared in the importing workspace manifest.',
                }),
              );
            }
            const denied = dependencyRule(owner, target);
            if (denied) {
              violations.push(
                violation({
                  ...denied,
                  importer: owner.name,
                  file: relativeFile,
                  imported: specifier,
                }),
              );
            }
            addEdge(edges, owner, target, { file: relativeFile, imported: specifier });
          }
          continue;
        }

        if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
          const resolved = path.resolve(path.dirname(filePath), specifier);
          const target = ownerForPath(resolved, owners);
          if (target && target.name !== owner.name) {
            const denied = dependencyRule(owner, target);
            violations.push(
              violation({
                code: denied?.code ?? 'CROSS_BOUNDARY_RELATIVE_IMPORT',
                importer: owner.name,
                file: relativeFile,
                imported: specifier,
                rule:
                  denied?.rule ??
                  `Cross-workspace imports must use the public root entry point ${target.name}, never a relative implementation path.`,
              }),
            );
            addEdge(edges, owner, target, { file: relativeFile, imported: specifier });
          }
        }
      }
    }
  }

  for (const component of detectCycles(edges)) {
    const sourceId = component[0];
    const targetId = [...(edges.get(sourceId)?.keys() ?? [])].find((id) => component.includes(id));
    const evidence = edges.get(sourceId)?.get(targetId) ?? {
      file: '<package graph>',
      imported: targetId,
    };
    violations.push(
      violation({
        code: 'CIRCULAR_PACKAGE_DEPENDENCY',
        importer: `${nexusScope}${sourceId}`,
        file: evidence.file,
        imported: component.map((id) => `${nexusScope}${id}`).join(' -> '),
        rule: 'Circular dependencies between Nexus packages are prohibited.',
      }),
    );
  }

  violations.sort((left, right) =>
    [left.file, left.code, left.imported]
      .join('\0')
      .localeCompare([right.file, right.code, right.imported].join('\0')),
  );

  return {
    rootDir: absoluteRoot,
    owners: owners.length,
    sourceFiles: sourceFileCount,
    imports: importCount,
    violations,
  };
}

export function formatArchitectureReport(report) {
  if (report.violations.length === 0) {
    return `Architecture validation passed: ${report.owners} workspaces, ${report.sourceFiles} source files, ${report.imports} imports.`;
  }

  const details = report.violations.map(
    (item, index) =>
      `${index + 1}. [${item.code}] ${item.file}\n` +
      `   importer: ${item.importer}\n` +
      `   import: ${item.imported}\n` +
      `   rule: ${item.rule}`,
  );
  return `Architecture validation failed with ${report.violations.length} violation(s):\n\n${details.join('\n\n')}`;
}
