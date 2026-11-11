// Senior Review v1 rules (GDD §5.3 step 5). Each rule reads the merged declaration model and returns findings.
import type { ClassInfo, Finding, FileModel, MethodInfo } from "./model";

export const GOD_CLASS_METHODS = 12;
export const GOD_CLASS_LINES = 300;

export interface ReviewModel {
  files: FileModel[];
  classes: ClassInfo[];
  byName: Map<string, ClassInfo>;
}

export function buildModel(files: FileModel[]): ReviewModel {
  const classes = files.flatMap((f) => f.classes);
  const byName = new Map<string, ClassInfo>();
  for (const c of classes) byName.set(c.name, c);
  return { files, classes, byName };
}

/** Known ancestors of `c`, nearest first. Unknown bases (e.g. from the standard library) are skipped; cycles are guarded. */
function ancestors(m: ReviewModel, c: ClassInfo): ClassInfo[] {
  const out: ClassInfo[] = [];
  const seen = new Set<string>([c.name]);
  const queue = [...c.bases];
  while (queue.length) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const b = m.byName.get(name);
    if (!b) continue;
    out.push(b);
    queue.push(...b.bases);
  }
  return out;
}

/** Introduces polymorphism: a virtual function that is not an override. Pure overriders are judged through their (known) base, so a base declared in an unreviewed file such as the provided api.h cannot cause a false positive. */
const declaresVirtualBehaviour = (c: ClassInfo) => c.methods.some((x) => x.isVirtual && !x.isOverride && !x.isDtor && !x.isCtor);
const dtorOf = (c: ClassInfo): MethodInfo | undefined => c.methods.find((x) => x.isDtor);

/** Virtual destructor, a protected non-virtual one (C.35), or a deleted/inherited-virtual one all make base-pointer deletion safe. */
function destructionIsSafe(m: ReviewModel, c: ClassInfo): boolean {
  for (const k of [c, ...ancestors(m, c)]) {
    const d = dtorOf(k);
    if (d && d.isVirtual) return true;
    if (d && d.access !== "public" && k === c) return true;
  }
  return false;
}

export type Rule = (m: ReviewModel) => Finding[];

export const virtualDestructor: Rule = (m) => {
  const out: Finding[] = [];
  for (const c of m.classes) {
    if (!declaresVirtualBehaviour(c)) continue;
    if (c.isFinal && c.bases.length === 0) continue;
    if (destructionIsSafe(m, c)) continue;
    out.push({
      rule: "virtual-destructor",
      severity: "blocker",
      file: c.file,
      line: c.line,
      subject: c.name,
      message: `${c.name} has virtual functions but no virtual destructor. Deleting a derived object through a ${c.name}* is undefined behaviour.`,
      fix: `Add \`virtual ~${c.name}() = default;\`, or make the destructor protected and non-virtual if nobody should delete through the base.`,
      lesson: "CUR L1 · Virtual destructors",
    });
  }
  return out;
};

export const rawNew: Rule = (m) =>
  m.files.flatMap((f) =>
    f.news
      .filter((n) => !n.owned)
      .map((n) => ({
        rule: "raw-new",
        severity: "blocker" as const,
        file: n.file,
        line: n.line,
        message: "A raw `new` with no owner: nothing in this statement guarantees the object is ever deleted.",
        fix: "Use `std::make_unique<T>(...)` (or `make_shared` when ownership is really shared) and pass `T*`/`T&` for non-owning use.",
        lesson: "CUR L1 · RAII and ownership",
      })),
  );

/** A type with behaviour and public mutable data lets any caller break its invariants. Plain data carriers (no member functions) are exempt. */
export const publicMutableFields: Rule = (m) => {
  const out: Finding[] = [];
  for (const c of m.classes) {
    const hasBehaviour = c.methods.some((x) => !x.isCtor && !x.isDtor) || c.bases.length > 0;
    if (!hasBehaviour) continue;
    for (const f of c.fields) {
      if (f.access !== "public" || f.isStatic || f.isImmutable) continue;
      out.push({
        rule: "public-mutable-field",
        severity: "blocker",
        file: c.file,
        line: f.line,
        subject: c.name,
        message: `${c.name}::${f.name} is public and mutable on a type that has behaviour, so any caller can break its invariants.`,
        fix: "Make the field private and expose the operations (or a const getter) that keep the invariant true.",
        lesson: "CUR L1 · Invariants and encapsulation",
      });
    }
  }
  return out;
};

const sameSignature = (a: MethodInfo, b: MethodInfo) => a.name === b.name && a.isConst === b.isConst && a.paramCount === b.paramCount;

export const missingOverride: Rule = (m) => {
  const out: Finding[] = [];
  for (const c of m.classes) {
    const above = ancestors(m, c);
    if (!above.length) continue;
    for (const meth of c.methods) {
      if (meth.isCtor || meth.isDtor || meth.isStatic || meth.isOperator || meth.isOverride || meth.isFinal || meth.isDeleted) continue;
      const overridden = above.some((a) => a.methods.some((x) => x.isVirtual && !x.isDtor && sameSignature(x, meth)));
      if (!overridden) continue;
      out.push({
        rule: "missing-override",
        severity: "minor",
        file: c.file,
        line: meth.line,
        subject: c.name,
        message: `${c.name}::${meth.name} overrides a virtual function but is not marked \`override\`. A signature typo later would silently create a new function instead.`,
        fix: "Add `override` after the parameter list (and drop the redundant `virtual`).",
        lesson: "CUR L1 · Overriding and `override`",
      });
    }
  }
  return out;
};

/** Counts member functions that carry the design (not constructors, the destructor or defaulted/deleted specials) plus every line of the class and of its out-of-class definitions. */
export const godClass: Rule = (m) => {
  const out: Finding[] = [];
  const defs = m.files.flatMap((f) => f.functions);
  for (const c of m.classes) {
    const methods = c.methods.filter((x) => !x.isCtor && !x.isDtor && !x.isDefaulted && !x.isDeleted).length;
    const outside = defs.filter((d) => d.owner === c.name).reduce((s, d) => s + (d.endLine - d.line + 1), 0);
    const lines = c.endLine - c.line + 1 + outside;
    if (methods <= GOD_CLASS_METHODS && lines <= GOD_CLASS_LINES) continue;
    out.push({
      rule: "god-class",
      severity: "major",
      file: c.file,
      line: c.line,
      subject: c.name,
      message: `${c.name} has ${methods} methods and about ${lines} lines (limits ${GOD_CLASS_METHODS} and ${GOD_CLASS_LINES}). It probably has more than one reason to change.`,
      fix: "Name the responsibilities it mixes and move each behind its own small class or interface (SRP).",
      lesson: "CUR L2 · Single Responsibility",
    });
  }
  return out;
};

const isPolymorphic = (m: ReviewModel, c: ClassInfo) => [c, ...ancestors(m, c)].some((k) => k.methods.some((x) => x.isVirtual && !x.isCtor));

/** Passing a polymorphic type by value copies only the base subobject: the derived part and its overrides are sliced away. */
export const objectSlicing: Rule = (m) => {
  const out: Finding[] = [];
  const check = (file: string, line: number, where: string, params: { type: string; byValue: boolean }[]) => {
    for (const p of params) {
      const c = p.type ? m.byName.get(p.type) : undefined;
      if (!c || !p.byValue || !isPolymorphic(m, c)) continue;
      out.push({
        rule: "object-slicing",
        severity: "blocker",
        file,
        line,
        subject: c.name,
        message: `${where} takes a ${c.name} by value. ${c.name} is polymorphic, so a derived object passed here is sliced down to its base part.`,
        fix: `Take \`const ${c.name}&\` (or \`${c.name}&\`) for use, or a \`std::unique_ptr<${c.name}>\` to take ownership.`,
        lesson: "CUR L1 · Object slicing",
      });
    }
  };
  for (const c of m.classes) for (const meth of c.methods) if (!meth.isCtor || meth.params.length) check(c.file, meth.line, `${c.name}::${meth.name}`, meth.params);
  for (const f of m.files) for (const fn of f.functions) check(f.file, fn.line, fn.owner ? `${fn.owner}::${fn.name}` : fn.name, fn.params);
  return out;
};

export const DEEP_INHERITANCE_DEPTH = 3;

/** Longest chain of known bases above `c`; unknown (library) bases count as the root. */
function depthOf(m: ReviewModel, c: ClassInfo, seen = new Set<string>()): number {
  if (seen.has(c.name)) return 0;
  seen.add(c.name);
  let best = 0;
  for (const b of c.bases) {
    const base = m.byName.get(b);
    if (base) best = Math.max(best, 1 + depthOf(m, base, new Set(seen)));
  }
  return best;
}

export const deepInheritance: Rule = (m) =>
  m.classes
    .filter((c) => depthOf(m, c) > DEEP_INHERITANCE_DEPTH)
    .map((c) => ({
      rule: "deep-inheritance",
      severity: "major" as const,
      file: c.file,
      line: c.line,
      subject: c.name,
      message: `${c.name} sits ${depthOf(m, c)} levels below its root (limit ${DEEP_INHERITANCE_DEPTH}). Each level couples it to every ancestor's details.`,
      fix: "Prefer composition: hold the varying part behind an interface (Strategy/Decorator) instead of adding another subclass level.",
      lesson: "CUR L2 · Composition over inheritance",
    }));

export const LONG_FUNCTION_LINES = 40;

export const longFunction: Rule = (m) =>
  m.files.flatMap((f) =>
    f.bodies
      .filter((b) => b.bodyLines > LONG_FUNCTION_LINES)
      .map((b) => ({
        rule: "long-function",
        severity: "major" as const,
        file: f.file,
        line: b.line,
        subject: b.owner,
        message: `${b.owner ? `${b.owner}::` : ""}${b.name} is ${b.bodyLines} lines long (limit ${LONG_FUNCTION_LINES}). A reader cannot hold it in their head, and neither can a test.`,
        fix: "Extract the steps into small named functions (or collaborators) so the body reads as an outline.",
        lesson: "CUR L2 · Small functions",
      })),
  );

const TAG_WORDS = /type|kind|tag|category|variant/i;

/** A `switch` over a type tag with several arms is the shape polymorphism replaces: adding a type means editing this switch (and every sibling). */
export const typeTagSwitch: Rule = (m) =>
  m.files.flatMap((f) =>
    f.bodies.flatMap((b) =>
      b.switches
        .filter((s) => s.cases.length >= 3 && (TAG_WORDS.test(s.expr) || s.cases.some((c) => TAG_WORDS.test(c))))
        .map((s) => ({
          rule: "type-tag-switch",
          severity: "major" as const,
          file: f.file,
          line: s.line,
          subject: b.owner,
          message: `${b.owner ? `${b.owner}::` : ""}${b.name} switches on a type tag (\`${s.expr}\`, ${s.cases.length} cases). Every new type must edit this function: it is closed to extension.`,
          fix: "Give the varying behaviour a virtual function (or a Strategy) and let each type implement it.",
          lesson: "CUR L2 · Open/Closed",
        })),
    ),
  );

/** One `dynamic_cast` can be a legitimate probe; two or more in a function is a hand-written type switch. */
export const dynamicCastChain: Rule = (m) =>
  m.files.flatMap((f) =>
    f.bodies
      .filter((b) => b.dynamicCasts.length >= 2)
      .map((b) => ({
        rule: "dynamic-cast-chain",
        severity: "major" as const,
        file: f.file,
        line: b.dynamicCasts[0],
        subject: b.owner,
        message: `${b.owner ? `${b.owner}::` : ""}${b.name} uses dynamic_cast ${b.dynamicCasts.length} times: it asks each object what it is instead of letting the object do the work.`,
        fix: "Move the behaviour into a virtual function on the base (or use double dispatch/Visitor if operations must stay outside the types).",
        lesson: "CUR L2 · Liskov and polymorphism",
      })),
  );

export const RULES: Rule[] = [virtualDestructor, rawNew, publicMutableFields, objectSlicing, missingOverride, godClass, deepInheritance, longFunction, typeTagSwitch, dynamicCastChain];
