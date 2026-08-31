import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const unitExclusions = ['**/*.integration.test.{ts,tsx}', '**/*.eval.test.{ts,tsx}'];

export default defineConfig({
  root: repositoryRoot,
  test: {
    coverage: {
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,tsx}',
        '**/dist/**',
        '**/drizzle/**',
        '**/tooling/**',
        'testing/**',
      ],
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
    projects: [
      {
        test: {
          clearMocks: true,
          environment: 'node',
          exclude: unitExclusions,
          include: ['apps/{api,worker}/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
          name: 'unit-node',
          passWithNoTests: false,
          restoreMocks: true,
          setupFiles: ['./testing/setup/network.ts'],
          testTimeout: 5_000,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
      {
        test: {
          clearMocks: true,
          environment: 'jsdom',
          exclude: unitExclusions,
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          name: 'unit-web',
          passWithNoTests: false,
          restoreMocks: true,
          setupFiles: ['./testing/setup/network.ts', './apps/web/test/setup.ts'],
          testTimeout: 5_000,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
      {
        test: {
          environment: 'node',
          exclude: ['**/*.eval.test.{ts,tsx}'],
          fileParallelism: false,
          globalSetup: ['./packages/testing/test/integration-global.ts'],
          include: [
            'apps/*/src/**/*.integration.test.ts',
            'apps/*/src/**/*.integration.test.tsx',
            'packages/*/src/**/*.integration.test.ts',
            'packages/*/src/**/*.integration.test.tsx',
          ],
          name: 'integration-node',
          passWithNoTests: false,
          testTimeout: 15_000,
        },
      },
      {
        test: {
          clearMocks: true,
          environment: 'node',
          include: ['evaluations/**/*.eval.test.ts'],
          name: 'eval-harness',
          passWithNoTests: false,
          restoreMocks: true,
          setupFiles: ['./testing/setup/network.ts'],
          testTimeout: 5_000,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
    ],
  },
});
