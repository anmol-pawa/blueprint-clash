// A small C++ tokenizer for Senior Review. It is not a compiler front end: it only needs to survive
// comments, string/char/raw-string literals and preprocessor lines, and keep line numbers (ADR 0002).

export interface Token {
  t: string;
  line: number;
  kind: "id" | "num" | "str" | "punct";
}

const TWO = new Set(["::", "->", "&&", "||", "==", "!=", "<=", ">=", "++", "--", "+=", "-=", "*=", "/=", "<<"]);
const isIdStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdChar = (c: string) => /[A-Za-z0-9_]/.test(c);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let line = 1;
  let atLineStart = true;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      atLineStart = true;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (c === "#" && atLineStart) {
      // Preprocessor line, with backslash continuations.
      while (i < n && src[i] !== "\n") {
        if (src[i] === "\\" && src[i + 1] === "\n") {
          line++;
          i += 2;
          continue;
        }
        i++;
      }
      continue;
    }
    atLineStart = false;
    const startLine = line;
    if (c === "R" && src[i + 1] === '"') {
      const open = src.indexOf("(", i);
      const delim = src.slice(i + 2, open);
      const close = src.indexOf(")" + delim + '"', open);
      const end = close < 0 ? n : close + delim.length + 2;
      for (let k = i; k < end; k++) if (src[k] === "\n") line++;
      out.push({ t: '""', line: startLine, kind: "str" });
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === "\\") i++;
        if (src[i] === "\n") line++;
        i++;
      }
      i++;
      out.push({ t: c + c, line: startLine, kind: "str" });
      continue;
    }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdChar(src[j])) j++;
      out.push({ t: src.slice(i, j), line, kind: "id" });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_.']/.test(src[j])) j++;
      out.push({ t: src.slice(i, j), line, kind: "num" });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO.has(two)) {
      out.push({ t: two, line, kind: "punct" });
      i += 2;
      continue;
    }
    out.push({ t: c, line, kind: "punct" });
    i++;
  }
  return out;
}
