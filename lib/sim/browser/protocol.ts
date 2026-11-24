import type { Scenario } from "../presets";
import type { ScenarioRun } from "../run";

export interface SimRequest {
  id: number;
  scenario: Scenario;
}

export type SimResponse = { id: number; ok: true; run: ScenarioRun; ms: number } | { id: number; ok: false; error: string };
