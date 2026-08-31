import { validateScenarioCatalog } from './schemas/scenario.ts';
import { plannedScenarios } from './scenarios/planned.ts';

export const evaluationCatalog = validateScenarioCatalog(plannedScenarios);
