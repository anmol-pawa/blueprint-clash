import { validatePath } from "@/lib/judge/project";
import type { ProjectFile } from "@/lib/judge/types";

/** The editor's pure state: files, which are open in tabs, and which tab is active. */
export interface Workspace {
  files: ProjectFile[];
  open: string[];
  active: string | null;
}

export type WorkspaceResult = { ok: true; ws: Workspace } | { ok: false; error: string };

const ok = (ws: Workspace): WorkspaceResult => ({ ok: true, ws });
const fail = (error: string): WorkspaceResult => ({ ok: false, error });

export function createWorkspace(provided: ProjectFile[], user: ProjectFile[] = []): Workspace {
  const files = [...provided.map((f) => ({ ...f, readOnly: true })), ...user.map((f) => ({ ...f, readOnly: false }))];
  const first = user[0]?.path ?? provided[0]?.path ?? null;
  return { files, open: first ? [first] : [], active: first };
}

export function getFile(ws: Workspace, path: string): ProjectFile | undefined {
  return ws.files.find((f) => f.path === path);
}

/** Files the player owns, i.e. what is saved as a draft and submitted. */
export function userFiles(ws: Workspace): ProjectFile[] {
  return ws.files.filter((f) => !f.readOnly);
}

export function openFile(ws: Workspace, path: string): Workspace {
  if (!getFile(ws, path)) return ws;
  return { ...ws, open: ws.open.includes(path) ? ws.open : [...ws.open, path], active: path };
}

export function closeTab(ws: Workspace, path: string): Workspace {
  const i = ws.open.indexOf(path);
  if (i < 0) return ws;
  const open = ws.open.filter((p) => p !== path);
  const active = ws.active === path ? (open[Math.min(i, open.length - 1)] ?? null) : ws.active;
  return { ...ws, open, active };
}

export function editFile(ws: Workspace, path: string, content: string): Workspace {
  const f = getFile(ws, path);
  if (!f || f.readOnly || f.content === content) return ws;
  return { ...ws, files: ws.files.map((x) => (x.path === path ? { ...x, content } : x)) };
}

/** A skeleton so a new file is not blank: an include guard for headers, an include of its header for sources. */
export function starterContent(path: string, existing: string[]): string {
  if (/\.(h|hpp|hh)$/.test(path)) return "#pragma once\n\n";
  const header = path.replace(/\.(cpp|cc|cxx)$/, ".h");
  return existing.includes(header) ? `#include "${header.split("/").pop()}"\n\n` : "";
}

export function createFile(ws: Workspace, path: string, content?: string): WorkspaceResult {
  const err = validatePath(path);
  if (err) return fail(err);
  if (getFile(ws, path)) return fail(`${path} already exists.`);
  const file: ProjectFile = { path, content: content ?? starterContent(path, ws.files.map((f) => f.path)) };
  return ok(openFile({ ...ws, files: [...ws.files, file] }, path));
}

export function renameFile(ws: Workspace, from: string, to: string): WorkspaceResult {
  const f = getFile(ws, from);
  if (!f) return fail(`${from} does not exist.`);
  if (f.readOnly) return fail(`${from} is read-only.`);
  if (from === to) return ok(ws);
  const err = validatePath(to);
  if (err) return fail(err);
  if (getFile(ws, to)) return fail(`${to} already exists.`);
  const swap = (p: string) => (p === from ? to : p);
  return ok({
    files: ws.files.map((x) => (x.path === from ? { ...x, path: to } : x)),
    open: ws.open.map(swap),
    active: ws.active ? swap(ws.active) : null,
  });
}

export function deleteFile(ws: Workspace, path: string): WorkspaceResult {
  const f = getFile(ws, path);
  if (!f) return fail(`${path} does not exist.`);
  if (f.readOnly) return fail(`${path} is read-only.`);
  const closed = closeTab(ws, path);
  return ok({ ...closed, files: ws.files.filter((x) => x.path !== path) });
}

/** Restores saved user files over the provided ones (invalid or read-only-clashing drafts are dropped). */
export function applyDraft(ws: Workspace, draft: ProjectFile[]): Workspace {
  const locked = new Set(ws.files.filter((f) => f.readOnly).map((f) => f.path));
  const user = draft.filter((f) => !validatePath(f.path) && !locked.has(f.path));
  const provided = ws.files.filter((f) => f.readOnly);
  return createWorkspace(provided, user);
}
