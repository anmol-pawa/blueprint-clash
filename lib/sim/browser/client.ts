// Main-thread side of the simulator worker: one persistent worker, latest request wins,
// and a timeout that rebuilds the worker if a run hangs.
import type { Scenario } from "../presets";
import type { SimResponse } from "./protocol";

let worker: Worker | null = null;
let nextId = 0;

export function simulateInWorker(scenario: Scenario, timeoutMs = 5000): Promise<SimResponse> {
  worker ??= new Worker(new URL("./sim.worker.ts", import.meta.url));
  const w = worker;
  const id = ++nextId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.terminate();
      if (worker === w) worker = null;
      resolve({ id, ok: false, error: `simulation took longer than ${timeoutMs} ms` });
    }, timeoutMs);
    const onMessage = (e: MessageEvent<SimResponse>) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      resolve(e.data);
    };
    w.addEventListener("message", onMessage);
    w.onerror = (e) => {
      clearTimeout(timer);
      if (worker === w) worker = null;
      resolve({ id, ok: false, error: e.message || "simulator worker crashed" });
    };
    w.postMessage({ id, scenario });
  });
}

/** True when the response is the most recent request (older replies are ignored by the UI). */
export const isLatest = (r: SimResponse) => r.id === nextId;
