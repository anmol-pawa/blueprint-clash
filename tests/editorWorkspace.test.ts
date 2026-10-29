import { describe, expect, it, vi } from "vitest";
import {
  applyDraft, closeTab, createFile, createWorkspace, deleteFile, editFile, getFile, openFile, renameFile, userFiles,
  type Workspace, type WorkspaceResult,
} from "@/lib/editor/workspace";
import { debouncedSaver, memoryDraftStore } from "@/lib/editor/drafts";

const api = { path: "api.h", content: "// api", readOnly: true };
const base = () => createWorkspace([api], [{ path: "impl.cpp", content: "int x;" }]);
const must = (r: WorkspaceResult): Workspace => {
  if (!r.ok) throw new Error(r.error);
  return r.ws;
};

describe("workspace", () => {
  it("opens the first user file and locks provided files", () => {
    const ws = base();
    expect(ws.active).toBe("impl.cpp");
    expect(getFile(ws, "api.h")?.readOnly).toBe(true);
    expect(userFiles(ws).map((f) => f.path)).toEqual(["impl.cpp"]);
  });

  it("ignores edits to read-only files", () => {
    const ws = base();
    expect(editFile(ws, "api.h", "hacked")).toBe(ws);
    expect(getFile(editFile(ws, "impl.cpp", "int y;"), "impl.cpp")?.content).toBe("int y;");
  });

  it("creates files with starter content and rejects bad or duplicate paths", () => {
    let ws = must(createFile(base(), "store.h"));
    expect(getFile(ws, "store.h")?.content).toContain("#pragma once");
    ws = must(createFile(ws, "store.cpp"));
    expect(getFile(ws, "store.cpp")?.content).toContain('#include "store.h"');
    expect(ws.active).toBe("store.cpp");
    expect(createFile(ws, "store.cpp").ok).toBe(false);
    expect(createFile(ws, "../evil.cpp").ok).toBe(false);
    expect(createFile(ws, "notes.txt").ok).toBe(false);
    expect(createFile(ws, "api.h").ok).toBe(false);
  });

  it("renames user files and keeps tabs pointing at them; refuses clashes and read-only", () => {
    let ws = must(createFile(base(), "a.cpp"));
    ws = must(renameFile(ws, "a.cpp", "b.cpp"));
    expect(ws.open).toContain("b.cpp");
    expect(ws.active).toBe("b.cpp");
    expect(getFile(ws, "a.cpp")).toBeUndefined();
    expect(renameFile(ws, "b.cpp", "impl.cpp").ok).toBe(false);
    expect(renameFile(ws, "api.h", "x.h").ok).toBe(false);
    expect(renameFile(ws, "b.cpp", "b.txt").ok).toBe(false);
  });

  it("deletes user files, moves the active tab, and protects read-only files", () => {
    let ws = must(createFile(base(), "a.cpp"));
    ws = must(deleteFile(ws, "a.cpp"));
    expect(ws.active).toBe("impl.cpp");
    expect(deleteFile(ws, "api.h").ok).toBe(false);
    expect(deleteFile(ws, "nope.cpp").ok).toBe(false);
  });

  it("closing the last tab leaves no active file; opening reactivates", () => {
    let ws = closeTab(base(), "impl.cpp");
    expect(ws.active).toBeNull();
    ws = openFile(ws, "api.h");
    expect(ws.active).toBe("api.h");
    expect(openFile(ws, "missing.cpp")).toBe(ws);
  });

  it("applies drafts but drops invalid and read-only-clashing entries", () => {
    const ws = applyDraft(base(), [
      { path: "impl.cpp", content: "saved" },
      { path: "api.h", content: "overwrite attempt" },
      { path: "../x.cpp", content: "bad" },
      { path: "more.h", content: "#pragma once" },
    ]);
    expect(getFile(ws, "api.h")?.content).toBe("// api");
    expect(getFile(ws, "impl.cpp")?.content).toBe("saved");
    expect(userFiles(ws).map((f) => f.path)).toEqual(["impl.cpp", "more.h"]);
  });
});

describe("drafts", () => {
  it("round-trips through the memory store without leaking readOnly or aliasing", async () => {
    const s = memoryDraftStore();
    const files = [{ path: "a.cpp", content: "1", readOnly: true }];
    await s.save("p", files);
    files[0].content = "mutated";
    const got = await s.load("p");
    expect(got).toEqual([{ path: "a.cpp", content: "1" }]);
    await s.clear("p");
    expect(await s.load("p")).toBeNull();
  });

  it("debounces saves and flushes the latest", async () => {
    vi.useFakeTimers();
    const s = memoryDraftStore();
    const save = vi.spyOn(s, "save");
    const d = debouncedSaver(s, "p", 500);
    d.schedule([{ path: "a.cpp", content: "1" }]);
    d.schedule([{ path: "a.cpp", content: "2" }]);
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect((await s.load("p"))?.[0].content).toBe("2");
    d.schedule([{ path: "a.cpp", content: "3" }]);
    await d.flush();
    expect((await s.load("p"))?.[0].content).toBe("3");
    vi.useRealTimers();
  });
});
