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

export const RULES: Rule[] = [virtualDestructor, rawNew, publicMutableFields, missingOverride, godClass];
