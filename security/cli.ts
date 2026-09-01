import { checkEnvironmentGovernance } from './environment.ts';

async function main(): Promise<void> {
  const [command, ...extra] = process.argv.slice(2);
  if (command !== 'env' || extra.length > 0) {
    throw new Error('Usage: node security/cli.ts env');
  }
  const { registry, references } = await checkEnvironmentGovernance(process.cwd());
  console.log(
    `Environment governance passed: ${registry.variables.length} registered variables, ${references.length} source references, no tracked secret env files.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
