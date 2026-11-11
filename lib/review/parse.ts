// A declaration-level C++ parser: classes, bases, member functions and fields with access, function extents and
// `new` expressions. It does not parse expressions or resolve names, so it is a deliberate approximation of the
// clang AST model (ADR 0002). `tests/review.test.ts` cross-checks it against clang's JSON AST on the fixtures.
import type { Access, BodyInfo, ClassInfo, FieldInfo, FileModel, FunctionDef, MethodInfo, NewExpr, ParamInfo } from "./model";
import { tokenize, type Token } from "./tokenize";

const SKIP_STATEMENT = new Set(["using", "typedef", "friend", "static_assert", "enum", "extern"]);
const BODY_PRECEDERS = new Set(["const", "override", "final", "noexcept", "&", "&&", "volatile"]);
const MUTATING_CALLS = new Set(["push_back", "emplace_back", "pop_back", "push", "pop", "erase", "insert", "emplace", "clear", "reset", "swap", "resize", "assign"]);
const ASSIGN_OPS = new Set(["++", "--", "+=", "-=", "*=", "/="]);
/** A token before an identifier that means the identifier starts a statement, so a following `=` is an assignment, not a declaration. */
const STATEMENT_LEAD = new Set([";", "{", "}", ")", ".", "->", "::", ",", "else", "do", "("]);
const OWNERS = new Set(["unique_ptr", "shared_ptr", "reset", "auto_ptr", "make_unique", "make_shared", "owner"]);

interface Stmt {
  /** Index of the first token. */
  s: number;
  /** One past the last token of the declaration (before `{` body or `;`). */
  e: number;
  bodyStart: number;
  bodyEnd: number;
  /** Index one past the whole statement, including its body or `;`. */
  next: number;
  paren: number;
}

/** 0, 1 and 2 (any integer/float spelling) are universal; everything else deserves a name. */
function isMagicNumber(text: string): boolean {
  const clean = text.replace(/'/g, "").replace(/(ull|ul|lu|ll|u|l|f)$/i, "");
  const v = /^0x/i.test(clean) ? parseInt(clean, 16) : parseFloat(clean);
  return !(v === 0 || v === 1 || v === 2);
}

export function parseFile(file: string, src: string): FileModel {
  const T = tokenize(src);
  const classes: ClassInfo[] = [];
  const functions: FunctionDef[] = [];
  const bodies: BodyInfo[] = [];

  const matching = (i: number): number => {
    const open = T[i].t;
    const close = open === "{" ? "}" : open === "(" ? ")" : "]";
    let depth = 0;
    for (let j = i; j < T.length; j++) {
      if (T[j].t === open) depth++;
      else if (T[j].t === close && --depth === 0) return j;
    }
    return T.length - 1;
  };

  const skipAngle = (i: number): number => {
    let depth = 0;
    for (let j = i; j < T.length; j++) {
      if (T[j].t === "<") depth++;
      else if (T[j].t === ">" && --depth === 0) return j + 1;
    }
    return T.length;
  };

  const readStatement = (i: number, end: number): Stmt => {
    let paren = -1;
    let angle = 0;
    let sawAssign = false;
    let sawParams = false;
    let inInit = false;
    let j = i;
    while (j < end) {
      const tk = T[j].t;
      const prev = j > i ? T[j - 1] : undefined;
      if (tk === "(") {
        if (paren < 0 && angle === 0 && !sawAssign) paren = j;
        const m = matching(j);
        if (paren === j) sawParams = true;
        j = m + 1;
        continue;
      }
      if (tk === "[" ) {
        j = matching(j) + 1;
        continue;
      }
      if (tk === ";") return { s: i, e: j, bodyStart: -1, bodyEnd: -1, next: j + 1, paren };
      if (tk === "=" && prev?.t !== "operator") sawAssign = true;
      if (tk === ":" && sawParams && angle === 0 && !sawAssign) inInit = true;
      if (!sawAssign && prev && prev.kind === "id" && prev.t !== "operator" && tk === "<") angle++;
      else if (!sawAssign && tk === ">" && angle > 0) angle--;
      if (tk === "{") {
        const m = matching(j);
        const isBody = !sawAssign && sawParams && prev !== undefined && (prev.t === ")" || BODY_PRECEDERS.has(prev.t) || (inInit && prev.t === "}") || prev.t === ">" && T[j - 2]?.t === "-");
        if (isBody) return { s: i, e: j, bodyStart: j, bodyEnd: m, next: m + 1, paren };
        j = m + 1; // initializer braces, member brace-init, or a class/enum body: keep reading to `;`
        continue;
      }
      j++;
    }
    return { s: i, e: end, bodyStart: -1, bodyEnd: -1, next: end, paren };
  };

  const countParams = (open: number, close: number): number => {
    if (close === open + 1) return 0;
    if (close === open + 2 && T[open + 1].t === "void") return 0;
    let n = 1;
    let angle = 0;
    for (let j = open + 1; j < close; j++) {
      const tk = T[j].t;
      if (tk === "(" || tk === "{" || tk === "[") j = matching(j);
      else if (tk === "<" && T[j - 1]?.kind === "id") angle++;
      else if (tk === ">" && angle > 0) angle--;
      else if (tk === "," && angle === 0) n++;
    }
    return n;
  };

  const QUALIFIERS = new Set(["const", "volatile", "struct", "class", "typename", "unsigned", "signed", "register"]);

  /** Splits a parameter list and keeps, per parameter, the plain type and whether it is by value. */
  const parseParams = (open: number, close: number): ParamInfo[] => {
    const out: ParamInfo[] = [];
    const n = countParams(open, close);
    if (n === 0) return out;
    let cur: Token[] = [];
    let angle = 0;
    let skipDefault = false;
    const flush = () => {
      const ids = cur.filter((x) => x.kind === "id" && !QUALIFIERS.has(x.t));
      const ptrOrRef = cur.some((x) => x.t === "*" || x.t === "&" || x.t === "&&" || x.t === "[" || x.t === "<" || x.t === "...");
      // `Shape s` -> ids [Shape, s]; an unnamed `Shape` -> [Shape]. Qualified names keep the last segment before the name.
      const named = ids.length >= 2 && T[T.indexOf(ids[ids.length - 1]) - 1]?.t !== "::";
      const typeTok = named ? ids[ids.length - 2] : ids[ids.length - 1];
      out.push({ type: ptrOrRef || !typeTok ? "" : typeTok.t, byValue: !ptrOrRef });
      cur = [];
      skipDefault = false;
    };
    for (let j = open + 1; j < close; j++) {
      const tk = T[j];
      if (tk.t === "(" || tk.t === "{" || tk.t === "[") {
        const m = matching(j);
        if (tk.t === "[") cur.push(tk);
        j = m;
        continue;
      }
      if (tk.t === "<" && T[j - 1]?.kind === "id") {
        angle++;
        cur.push(tk);
        continue;
      }
      if (tk.t === ">" && angle > 0) {
        angle--;
        continue;
      }
      if (tk.t === "," && angle === 0) {
        flush();
        continue;
      }
      if (tk.t === "=" && angle === 0) skipDefault = true;
      if (!skipDefault) cur.push(tk);
    }
    flush();
    return out;
  };

  /** True when the statement holding token `k` declares a `const`/`constexpr` (that is how a constant gets its name). */
  const inNamedConstant = (k: number, floor: number): boolean => {
    for (let j = k - 1; j > floor; j--) {
      const t = T[j].t;
      if (t === ";" || t === "{" || t === "}") break;
      if (t === "const" || t === "constexpr" || t === "static_assert") return true;
    }
    return false;
  };

  /** Scans one function body for `dynamic_cast` and `switch` statements. */
  const analyseBody = (open: number, close: number, owner: string | undefined, name: string): void => {
    const body: BodyInfo = { file, owner, name, line: T[open].line, bodyLines: T[close].line - T[open].line + 1, dynamicCasts: [], switches: [], mutates: false, magicNumbers: [] };
    const seenNumbers = new Set<string>();
    for (let k = open + 1; k < close; k++) {
      const tk = T[k];
      if (ASSIGN_OPS.has(tk.t)) body.mutates = true;
      else if (tk.t === "=" && (T[k - 1]?.t === "]" || (T[k - 1]?.kind === "id" && (T[k - 2] === undefined || STATEMENT_LEAD.has(T[k - 2].t))))) body.mutates = true;
      else if (MUTATING_CALLS.has(tk.t) && T[k + 1]?.t === "(" && (T[k - 1]?.t === "." || T[k - 1]?.t === "->")) body.mutates = true;
      if (tk.kind === "num" && isMagicNumber(tk.t) && !seenNumbers.has(tk.t) && !inNamedConstant(k, open) && T[k - 1]?.t !== "case") {
        seenNumbers.add(tk.t);
        body.magicNumbers.push({ line: tk.line, text: tk.t });
      }
      if (T[k].t === "dynamic_cast") body.dynamicCasts.push(T[k].line);
      else if (T[k].t === "switch" && T[k + 1]?.t === "(") {
        const pc = matching(k + 1);
        const expr = T.slice(k + 2, pc).map((x) => x.t).join(" ");
        const block = T[pc + 1]?.t === "{" ? matching(pc + 1) : pc;
        const cases: string[] = [];
        for (let c = pc + 2; c < block; c++) {
          if (T[c].t !== "case") continue;
          let e = c + 1;
          const parts: string[] = [];
          while (e < block && T[e].t !== ":") parts.push(T[e++].t);
          cases.push(parts.join(""));
        }
        body.switches.push({ line: T[k].line, expr, cases });
      }
    }
    bodies.push(body);
  };

  const parseMethod = (st: Stmt, cls: ClassInfo, access: Access): MethodInfo | null => {
    let paren = st.paren;
    let nameIdx = paren - 1;
    let name = T[nameIdx]?.t ?? "";
    let isOperator = false;
    if (name === "operator" && T[paren + 1]?.t === ")" && T[paren + 2]?.t === "(") {
      name = "operator()";
      paren += 2;
      isOperator = true;
    } else if (T[nameIdx - 1]?.t === "operator" || T[nameIdx - 2]?.t === "operator") {
      name = "operator" + (T[nameIdx - 1]?.t === "operator" ? T[nameIdx].t : T[nameIdx - 1].t + T[nameIdx].t);
      isOperator = true;
    } else if (T[nameIdx - 1]?.t === "~") {
      name = "~" + name;
      nameIdx--;
    }
    if (!isOperator && !name.startsWith("~") && T[nameIdx]?.kind !== "id") return null;
    const close = matching(paren);
    const stop = (k: number) => T[k].t === "->" || (T[k].t === ":" && k > close);
    let isConst = false;
    let isOverride = false;
    let isFinal = false;
    let isPure = false;
    let isDefaulted = false;
    let isDeleted = false;
    for (let k = close + 1; k < st.e && !stop(k); k++) {
      const tk = T[k].t;
      if (tk === "noexcept" && T[k + 1]?.t === "(") k = matching(k + 1);
      else if (tk === "const") isConst = true;
      else if (tk === "override") isOverride = true;
      else if (tk === "final") isFinal = true;
      else if (tk === "=") {
        const v = T[k + 1]?.t;
        if (v === "0") isPure = true;
        else if (v === "default") isDefaulted = true;
        else if (v === "delete") isDeleted = true;
      }
    }
    let isVirtual = false;
    let isStatic = false;
    for (let k = st.s; k < nameIdx; k++) {
      if (T[k].t === "virtual") isVirtual = true;
      if (T[k].t === "static") isStatic = true;
    }
    const isDtor = name.startsWith("~");
    const retToks = T.slice(st.s, nameIdx).map((x) => x.t).filter((x) => !["virtual", "static", "inline", "constexpr", "explicit", "friend", "::"].includes(x));
    const attrEnd = retToks.lastIndexOf("]");
    const ret = attrEnd >= 0 ? retToks.slice(attrEnd + 1) : retToks;
    return {
      name,
      line: T[nameIdx].line,
      access,
      isCtor: !isDtor && !isOperator && name === cls.name,
      isDtor,
      isVirtual: isVirtual || isOverride || isPure,
      isOverride,
      isFinal,
      isConst,
      isStatic,
      isPure,
      isDefaulted,
      isDeleted,
      isOperator,
      paramCount: countParams(paren, close),
      params: parseParams(paren, close),
      returnsVoid: ret.length === 1 && ret[0] === "void",
      returnsMutableIndirect: (ret.includes("&") || ret.includes("&&") || ret.includes("*")) && !ret.includes("const"),
      bodyLines: st.bodyStart >= 0 ? T[st.bodyEnd].line - T[st.bodyStart].line + 1 : 0,
    };
  };

  const parseFields = (st: Stmt, access: Access): FieldInfo[] => {
    const parts: number[][] = [[]];
    let angle = 0;
    for (let j = st.s; j < st.e; j++) {
      const tk = T[j].t;
      if (tk === "{" || tk === "(" || tk === "[") {
        const m = matching(j);
        parts[parts.length - 1].push(j);
        j = m;
        continue;
      }
      if (tk === "<" && T[j - 1]?.kind === "id") angle++;
      else if (tk === ">" && angle > 0) angle--;
      if (tk === "," && angle === 0) {
        parts.push([]);
        continue;
      }
      parts[parts.length - 1].push(j);
    }
    const first = parts[0].map((k) => T[k].t);
    const lastPtr = Math.max(first.lastIndexOf("*"), -1);
    const constIdx = first.lastIndexOf("const");
    const isImmutable = first.includes("constexpr") || first.includes("&") || (constIdx >= 0 && constIdx > lastPtr) || first.includes("static") && first.includes("const");
    const isStatic = first.includes("static");
    const out: FieldInfo[] = [];
    for (const part of parts) {
      let nameTok: Token | undefined;
      for (const k of part) {
        const tk = T[k];
        if (tk.t === "=" || tk.t === "{" || tk.t === "[" || tk.t === ":") break;
        if (tk.kind === "id" && !["const", "static", "mutable", "constexpr", "volatile", "inline", "unsigned", "signed"].includes(tk.t)) nameTok = tk;
      }
      if (nameTok) out.push({ name: nameTok.t, line: nameTok.line, access, isStatic, isImmutable });
    }
    return out;
  };

  const parseBases = (from: number, to: number): string[] => {
    const bases: string[] = [];
    let cur: Token[] = [];
    let angle = 0;
    const flush = () => {
      const ids = cur.filter((x) => x.kind === "id" && !["public", "protected", "private", "virtual"].includes(x.t));
      if (ids.length) bases.push(ids[ids.length - 1].t);
      cur = [];
    };
    for (let j = from; j < to; j++) {
      const tk = T[j];
      if (tk.t === "<") angle++;
      else if (tk.t === ">") angle--;
      else if (tk.t === "," && angle === 0) {
        flush();
        continue;
      }
      if (angle === 0 && tk.kind === "id") cur.push(tk);
      // Template arguments are dropped: `Base<T>` is recorded as `Base`.
    }
    flush();
    return bases;
  };

  /** If tokens at `i` start a class definition, parse it and return the index after it; otherwise -1. */
  const tryClass = (i: number, end: number): number => {
    const kw = T[i].t;
    if (kw !== "class" && kw !== "struct") return -1;
    let j = i + 1;
    while (T[j]?.t === "[" && T[j + 1]?.t === "[") j = matching(j) + 1;
    if (T[j]?.kind !== "id") return -1;
    let name = T[j].t;
    while (T[j + 1]?.t === "::" && T[j + 2]?.kind === "id") {
      j += 2;
      name = T[j].t;
    }
    j++;
    let isFinal = false;
    if (T[j]?.t === "final") {
      isFinal = true;
      j++;
    }
    let bases: string[] = [];
    if (T[j]?.t === ":") {
      const from = j + 1;
      while (j < end && T[j].t !== "{" && T[j].t !== ";") j++;
      if (T[j]?.t !== "{") return -1;
      bases = parseBases(from, j);
    }
    if (T[j]?.t !== "{") return -1;
    const close = matching(j);
    const cls: ClassInfo = { name, file, keyword: kw, line: T[i].line, endLine: T[close].line, isFinal, bases, methods: [], fields: [] };
    classes.push(cls);
    parseScope(j + 1, close, cls);
    let k = close + 1;
    while (k < end && T[k].t !== ";") k++; // declarators: `struct S { } s;`
    return k + 1;
  };

  const parseScope = (from: number, to: number, cls?: ClassInfo): void => {
    let access: Access = cls?.keyword === "struct" ? "public" : "private";
    let i = from;
    while (i < to) {
      const tk = T[i];
      if (tk.t === ";") {
        i++;
        continue;
      }
      if (cls && (tk.t === "public" || tk.t === "protected" || tk.t === "private") && T[i + 1]?.t === ":") {
        access = tk.t;
        i += 2;
        continue;
      }
      if (tk.t === "namespace" || (tk.t === "extern" && T[i + 1]?.kind === "str" && T[i + 2]?.t === "{")) {
        let j = i + 1;
        while (j < to && T[j].t !== "{" && T[j].t !== ";") j++;
        if (T[j]?.t === "{") {
          const m = matching(j);
          parseScope(j + 1, m);
          i = m + 1;
        } else i = j + 1;
        continue;
      }
      if (tk.t === "template" && T[i + 1]?.t === "<") {
        i = skipAngle(i + 1);
        continue;
      }
      if (tk.t === "[" && T[i + 1]?.t === "[") {
        i = matching(i) + 1;
        continue;
      }
      if (tk.t === "class" || tk.t === "struct") {
        const after = tryClass(i, to);
        if (after >= 0) {
          i = after;
          continue;
        }
      }
      if (SKIP_STATEMENT.has(tk.t)) {
        const st = readStatement(i, to);
        i = st.next;
        continue;
      }
      const st = readStatement(i, to);
      i = Math.max(st.next, i + 1);
      if (st.paren >= 0 && !(T[st.paren + 1]?.t === "*" || T[st.paren + 1]?.t === "&")) {
        if (cls) {
          const m = parseMethod(st, cls, access);
          if (m) {
            cls.methods.push(m);
            if (st.bodyStart >= 0) analyseBody(st.bodyStart, st.bodyEnd, cls.name, m.name);
          }
        } else if (st.bodyStart >= 0) {
          const nameIdx = st.paren - 1;
          if (T[nameIdx]?.kind === "id") {
            const owner = T[nameIdx - 1]?.t === "::" && T[nameIdx - 2]?.kind === "id" ? T[nameIdx - 2].t : undefined;
            functions.push({ file, owner, name: T[nameIdx].t, line: T[st.s].line, endLine: T[st.bodyEnd].line, params: parseParams(st.paren, matching(st.paren)) });
            analyseBody(st.bodyStart, st.bodyEnd, owner, T[nameIdx].t);
          }
        }
      } else if (cls && st.e > st.s) {
        cls.fields.push(...parseFields(st, access));
      }
    }
  };

  parseScope(0, T.length);

  const news: NewExpr[] = [];
  for (let i = 0; i < T.length; i++) {
    if (T[i].t !== "new" || T[i - 1]?.t === "operator" || T[i + 1]?.t === "(") continue;
    let owned = false;
    for (let k = i - 1; k >= 0 && i - k <= 12; k--) {
      const p = T[k].t;
      if (p === ";" || p === "{" || p === "}") break;
      if (OWNERS.has(p)) owned = true;
    }
    news.push({ file, line: T[i].line, owned });
  }
  return { file, classes, functions, bodies, news };
}
