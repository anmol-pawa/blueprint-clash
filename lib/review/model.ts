// The declaration model Senior Review rules read. Mirrors what the ARCH §2 AST model lists, built from tokens (ADR 0002).

export type Access = "public" | "protected" | "private";
export type Severity = "blocker" | "major" | "minor";

export interface MethodInfo {
  name: string;
  line: number;
  access: Access;
  isCtor: boolean;
  isDtor: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  isFinal: boolean;
  isConst: boolean;
  isStatic: boolean;
  isPure: boolean;
  isDefaulted: boolean;
  isDeleted: boolean;
  isOperator: boolean;
  paramCount: number;
  /** Lines of the body when defined in the class; 0 for declarations. */
  bodyLines: number;
}

export interface FieldInfo {
  name: string;
  line: number;
  access: Access;
  isStatic: boolean;
  /** `constexpr`, a `const` object, or a reference member: cannot be reassigned after construction. */
  isImmutable: boolean;
}

export interface ClassInfo {
  name: string;
  file: string;
  keyword: "class" | "struct";
  line: number;
  endLine: number;
  isFinal: boolean;
  /** Simple names of the base classes (namespaces and template arguments removed). */
  bases: string[];
  methods: MethodInfo[];
  fields: FieldInfo[];
}

/** A function defined outside a class body, e.g. `void Library::borrow(...) { ... }`. */
export interface FunctionDef {
  file: string;
  owner?: string;
  name: string;
  line: number;
  endLine: number;
}

export interface NewExpr {
  file: string;
  line: number;
  /** True when the `new` result is handed straight to an owning wrapper (`unique_ptr<T>(new T)`, `.reset(new T)`). */
  owned: boolean;
}

export interface FileModel {
  file: string;
  classes: ClassInfo[];
  functions: FunctionDef[];
  news: NewExpr[];
}

export interface Finding {
  rule: string;
  severity: Severity;
  file: string;
  line: number;
  /** The class the finding is about, when there is one. */
  subject?: string;
  message: string;
  /** What to do about it. */
  fix: string;
  /** The lesson that explains the rule (GDD §5.3 step 5). */
  lesson: string;
}
