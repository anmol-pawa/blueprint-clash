// Browser-capable C++ build: compiles a multi-file project to one wasm32-wasip1 module with @yowasp/clang.
// The clang command is injected, so the same code runs in a Web Worker, in Node (tests) and in content:verify.
// No Node or DOM imports here. See docs/adr/0001-cpp-toolchain.md for measurements and constraints.
import { parseDiagnostics, hasErrors } from "./diagnostics";
import { translationUnits } from "./project";
import type { Diagnostic, ProjectFile } from "./types";

export type FsTree = { [name: string]: FsTree | string | Uint8Array };

export type ClangCommand = (
  args: string[],
  files: FsTree,
  options?: { stdout?: (b: Uint8Array | null) => void; stderr?: (b: Uint8Array | null) => void },
) => Promise<FsTree> | FsTree | undefined;

export interface BuildOptions {
  std?: string;
  optimise?: "-O0" | "-O1" | "-O2";
  /** Called as each translation unit finishes, for progress UI. */
  onUnit?: (path: string, ms: number) => void;
}

export interface BuildResult {
  ok: boolean;
  wasm?: Uint8Array;
  diagnostics: Diagnostic[];
  /** Linker and driver output that is not a source diagnostic (e.g. undefined symbol). */
  stderr: string;
  timings: { compileMs: Record<string, number>; linkMs: number; totalMs: number };
}

/** Flags shared by every build. -fno-exceptions: the wasm32-wasip1 sysroot has no C++ exception runtime. */
export const BASE_FLAGS = ["--target=wasm32-wasip1", "-fno-exceptions", "-Wall", "-Wextra"];

const decoder = new TextDecoder();

/** Paths like `src/a.h` become nested directories in the virtual filesystem. */
export function toTree(files: ProjectFile[]): FsTree {
  const root: FsTree = {};
  for (const f of files) {
    const parts = f.path.split("/");
    let dir = root;
    for (const p of parts.slice(0, -1)) dir = (dir[p] ??= {}) as FsTree;
    dir[parts[parts.length - 1]] = f.content;
  }
  return root;
}

function collector() {
  let text = "";
  return { sink: (b: Uint8Array | null) => void (b && (text += decoder.decode(b, { stream: true }))), text: () => text };
}

export async function buildProject(clang: ClangCommand, files: ProjectFile[], opts: BuildOptions = {}): Promise<BuildResult> {
  const t0 = Date.now();
  const flags = [...BASE_FLAGS, `-std=${opts.std ?? "c++20"}`, opts.optimise ?? "-O1", "-I."];
  const tree = toTree(files);
  const compileMs: Record<string, number> = {};
  const objects: FsTree = {};
  const diagnostics: Diagnostic[] = [];
  let stderr = "";

  const fail = (linkMs = 0): BuildResult => ({
    ok: false,
    diagnostics,
    stderr,
    timings: { compileMs, linkMs, totalMs: Date.now() - t0 },
  });

  for (const src of translationUnits(files)) {
    const obj = src.replace(/[/.]/g, "_") + ".o";
    const err = collector();
    const t = Date.now();
    try {
      const out = await clang([...flags, "-c", src, "-o", obj], tree, { stderr: err.sink });
      objects[obj] = (out as FsTree)[obj] as Uint8Array;
    } catch {
      // yowasp throws Exit on a non-zero status; the diagnostics are in stderr.
    }
    compileMs[src] = Date.now() - t;
    opts.onUnit?.(src, compileMs[src]);
    const diags = parseDiagnostics(err.text(), "");
    diagnostics.push(...diags);
    if (!objects[obj] || hasErrors(diags)) {
      stderr += err.text();
      return fail();
    }
  }

  const err = collector();
  const tl = Date.now();
  let wasm: Uint8Array | undefined;
  try {
    const out = await clang(["--target=wasm32-wasip1", ...Object.keys(objects), "-o", "a.wasm"], objects, { stderr: err.sink });
    wasm = (out as FsTree)["a.wasm"] as Uint8Array;
  } catch {
    // fall through: wasm stays undefined
  }
  const linkMs = Date.now() - tl;
  stderr += err.text();
  if (!wasm) return fail(linkMs);
  return { ok: true, wasm, diagnostics, stderr, timings: { compileMs, linkMs, totalMs: Date.now() - t0 } };
}
