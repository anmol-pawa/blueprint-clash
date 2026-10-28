// Minimal WASI preview1 host for the judged program (ADR 0001): stdout/stderr capture, no filesystem, no env.
const ERRNO_SUCCESS = 0;
const ERRNO_BADF = 8;
const ERRNO_NOSYS = 52;

export class ProcExit extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

export interface WasiHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imports: Record<string, (...args: any[]) => number | void>;
  bind(memory: WebAssembly.Memory): void;
  stdout(): string;
  stderr(): string;
}

export function createWasi(args: string[] = ["a.wasm"], maxOutput = 4 << 20): WasiHost {
  let mem: WebAssembly.Memory;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const out: Uint8Array[][] = [[], [], []];
  let total = 0;
  const view = () => new DataView(mem.buffer);
  const argBytes = args.map((a) => enc.encode(a + "\0"));

  const imports: WasiHost["imports"] = {
    args_sizes_get(argcPtr, sizePtr) {
      const v = view();
      v.setUint32(argcPtr, argBytes.length, true);
      v.setUint32(sizePtr, argBytes.reduce((n, b) => n + b.length, 0), true);
      return ERRNO_SUCCESS;
    },
    args_get(argvPtr, bufPtr) {
      const v = view();
      const bytes = new Uint8Array(mem.buffer);
      argBytes.forEach((b, i) => {
        v.setUint32(argvPtr + 4 * i, bufPtr, true);
        bytes.set(b, bufPtr);
        bufPtr += b.length;
      });
      return ERRNO_SUCCESS;
    },
    environ_sizes_get(countPtr, sizePtr) {
      const v = view();
      v.setUint32(countPtr, 0, true);
      v.setUint32(sizePtr, 0, true);
      return ERRNO_SUCCESS;
    },
    environ_get: () => ERRNO_SUCCESS,
    fd_prestat_get: () => ERRNO_BADF,
    fd_prestat_dir_name: () => ERRNO_BADF,
    fd_close: () => ERRNO_SUCCESS,
    fd_fdstat_get(fd, ptr) {
      if (fd > 2) return ERRNO_BADF;
      const v = view();
      v.setUint8(ptr, 2); // character device
      v.setUint16(ptr + 2, 0, true);
      v.setBigUint64(ptr + 8, BigInt(0x40), true); // rights: fd_write
      v.setBigUint64(ptr + 16, BigInt(0), true);
      return ERRNO_SUCCESS;
    },
    fd_seek: () => ERRNO_NOSYS,
    fd_read(fd, _iovs, _n, nreadPtr) {
      if (fd !== 0) return ERRNO_BADF;
      view().setUint32(nreadPtr, 0, true); // stdin is empty
      return ERRNO_SUCCESS;
    },
    fd_write(fd, iovsPtr, iovsLen, nwrittenPtr) {
      if (fd < 1 || fd > 2) return ERRNO_BADF;
      const v = view();
      let written = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovsPtr + 8 * i, true);
        const len = v.getUint32(iovsPtr + 8 * i + 4, true);
        written += len;
        if (total < maxOutput) {
          out[fd].push(new Uint8Array(mem.buffer.slice(ptr, ptr + len)));
          total += len;
        }
      }
      v.setUint32(nwrittenPtr, written, true);
      return ERRNO_SUCCESS;
    },
    clock_time_get(id: number, _precision: bigint, ptr: number) {
      // 0 = realtime, 1 = monotonic; both come from the worker's high-resolution clock (nanoseconds).
      const ns = id === 0 ? BigInt(Math.round(Date.now())) * BigInt(1_000_000) : BigInt(Math.round(performance.now() * 1e6));
      view().setBigUint64(ptr, ns, true);
      return ERRNO_SUCCESS;
    },
    random_get(ptr: number, len: number) {
      crypto.getRandomValues(new Uint8Array(mem.buffer, ptr, len));
      return ERRNO_SUCCESS;
    },
    sched_yield: () => ERRNO_SUCCESS,
    proc_exit(code: number) {
      throw new ProcExit(code);
    },
  };

  const text = (chunks: Uint8Array[]) => {
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of chunks) {
      all.set(c, o);
      o += c.length;
    }
    return dec.decode(all);
  };
  return { imports, bind: (m) => void (mem = m), stdout: () => text(out[1]), stderr: () => text(out[2]) };
}
