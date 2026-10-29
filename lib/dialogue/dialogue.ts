/** A line of dialogue. `next` ends the conversation when absent; `choices` replace `next`. */
export interface DialogueNode {
  speaker?: string;
  text: string;
  next?: string;
  choices?: readonly DialogueChoice[];
  /** Flags set when this node is shown. */
  set?: readonly string[];
}

export interface DialogueChoice {
  text: string;
  next?: string;
  /** Flags set when this choice is picked. */
  set?: readonly string[];
  /** Hidden unless every listed flag is set. */
  requires?: readonly string[];
}

export interface DialogueScript {
  id: string;
  start: string;
  nodes: Readonly<Record<string, DialogueNode>>;
}

export interface DialogueState {
  script: DialogueScript;
  nodeId: string;
  /** Flags after applying `set` effects (a copy, never the caller's set). */
  flags: ReadonlySet<string>;
  done: boolean;
}

/** Problems with a script (dangling `next`, unreachable nodes); empty when valid. */
export function validateScript(s: DialogueScript): string[] {
  const errs: string[] = [];
  if (!s.nodes[s.start]) errs.push(`${s.id}: start node "${s.start}" missing`);
  const seen = new Set<string>();
  const walk = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = s.nodes[id];
    if (!n) return;
    const targets = [...(n.next ? [n.next] : []), ...(n.choices ?? []).flatMap((c) => (c.next ? [c.next] : []))];
    for (const t of targets) {
      if (!s.nodes[t]) errs.push(`${s.id}: "${id}" points at missing node "${t}"`);
      else walk(t);
    }
    if (n.choices?.length === 0) errs.push(`${s.id}: "${id}" has an empty choice list`);
    if (n.choices && n.next) errs.push(`${s.id}: "${id}" has both next and choices`);
  };
  walk(s.start);
  for (const id of Object.keys(s.nodes)) if (!seen.has(id)) errs.push(`${s.id}: node "${id}" is unreachable`);
  return errs;
}

function enter(script: DialogueScript, nodeId: string, flags: ReadonlySet<string>): DialogueState {
  const node = script.nodes[nodeId];
  if (!node) throw new Error(`dialogue ${script.id}: no node "${nodeId}"`);
  return { script, nodeId, flags: new Set([...flags, ...(node.set ?? [])]), done: false };
}

export function startDialogue(script: DialogueScript, flags: ReadonlySet<string> = new Set()): DialogueState {
  return enter(script, script.start, flags);
}

export function currentNode(s: DialogueState): DialogueNode {
  return s.script.nodes[s.nodeId];
}

/** Choices the player may pick right now (those whose `requires` flags are all set). */
export function availableChoices(s: DialogueState): DialogueChoice[] {
  return (currentNode(s).choices ?? []).filter((c) => (c.requires ?? []).every((f) => s.flags.has(f)));
}

/**
 * Advance: a plain node moves to `next` (or ends); a choice node needs the
 * index into `availableChoices`. Invalid input leaves the state unchanged.
 */
export function advance(s: DialogueState, choice?: number): DialogueState {
  if (s.done) return s;
  const node = currentNode(s);
  if (node.choices) {
    const options = availableChoices(s);
    const picked = choice === undefined ? undefined : options[choice];
    if (!picked) return s;
    const flags = new Set([...s.flags, ...(picked.set ?? [])]);
    return picked.next ? enter(s.script, picked.next, flags) : { ...s, flags, done: true };
  }
  return node.next ? enter(s.script, node.next, s.flags) : { ...s, done: true };
}

/** Typewriter: the visible prefix after `elapsedMs` at `charsPerSecond`, never splitting a surrogate pair. */
export function visibleText(text: string, elapsedMs: number, charsPerSecond = 45): string {
  const chars = [...text];
  const n = Math.max(0, Math.min(chars.length, Math.floor((elapsedMs / 1000) * charsPerSecond)));
  return chars.slice(0, n).join("");
}
