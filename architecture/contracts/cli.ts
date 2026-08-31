import { formatContractMatrix, serializeContractStatus } from './report.ts';
import { loadContractRegistry } from './validator.ts';

async function main(): Promise<void> {
  const [command = 'list', ...arguments_] = process.argv.slice(2);
  const registry = await loadContractRegistry(process.cwd());
  if (command === 'check') {
    if (arguments_.length > 0) throw new Error('contracts:check accepts no options.');
    console.log(
      `Architecture contract registry validation passed: ${registry.contracts.length} canonical contracts; all evidence resolved.`,
    );
    return;
  }
  if (command === 'list') {
    if (arguments_.length === 0) console.log(formatContractMatrix(registry));
    else if (arguments_.length === 1 && arguments_[0] === '--json') {
      process.stdout.write(serializeContractStatus(registry));
    } else throw new Error('contracts:list supports only --json.');
    return;
  }
  throw new Error(`Unknown contracts command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
