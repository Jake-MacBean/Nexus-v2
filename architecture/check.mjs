import { formatArchitectureReport, validateArchitecture } from './checker.mjs';

const report = await validateArchitecture(process.cwd());
const output = formatArchitectureReport(report);

if (report.violations.length > 0) {
  console.error(output);
  process.exitCode = 1;
} else {
  console.log(output);
}
