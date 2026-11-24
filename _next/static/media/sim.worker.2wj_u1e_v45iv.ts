// Runs a scenario off the main thread so the playground (and later the Siege) never blocks the UI.
import { runScenario } from "../run";
import type { SimRequest, SimResponse } from "./protocol";

self.onmessage = (e: MessageEvent<SimRequest>) => {
  const started = performance.now();
  let reply: SimResponse;
  try {
    reply = { id: e.data.id, ok: true, run: runScenario(e.data.scenario), ms: performance.now() - started };
  } catch (err) {
    reply = { id: e.data.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as Worker).postMessage(reply);
};
