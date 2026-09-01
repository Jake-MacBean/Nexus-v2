export const environmentNames = ['local', 'test', 'staging', 'production'] as const;
export const environmentVisibilities = ['server', 'client', 'tooling'] as const;
export const environmentSensitivities = ['public', 'local_safe', 'secret'] as const;
export const productionSources = [
  'runtime-configuration',
  'google-cloud-secret-manager',
  'not-applicable',
] as const;

export type EnvironmentName = (typeof environmentNames)[number];
export type EnvironmentVisibility = (typeof environmentVisibilities)[number];
export type EnvironmentSensitivity = (typeof environmentSensitivities)[number];
export type ProductionSource = (typeof productionSources)[number];

export interface EnvironmentVariableDefinition {
  readonly name: string;
  readonly owner: string;
  readonly purpose: string;
  readonly visibility: EnvironmentVisibility;
  readonly sensitivity: EnvironmentSensitivity;
  readonly environments: readonly EnvironmentName[];
  readonly requiredIn: readonly EnvironmentName[];
  readonly committedExample: {
    readonly permitted: boolean;
    readonly allowedValues: readonly string[];
  };
  readonly productionSource: ProductionSource;
}

export interface EnvironmentRegistry {
  readonly schemaVersion: 1;
  readonly allowedTrackedEnvFiles: readonly string[];
  readonly frameworkExemptions: readonly {
    readonly name: string;
    readonly surface: 'import.meta.env';
    readonly owner: string;
  }[];
  readonly variables: readonly EnvironmentVariableDefinition[];
}
