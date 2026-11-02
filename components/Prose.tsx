import type { ReactNode } from "react";

/** Inline `code` and **bold**, nothing else: content is our own markdown, so a tiny renderer is enough and cannot inject HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i} className="rounded bg-white/10 px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

type Block = { kind: "h"; level: number; text: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] } | { kind: "code"; text: string };

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (line.startsWith("```")) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) body.push(lines[i]);
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: "h", level: h[1].length, text: h[2] });
      continue;
    }
    const ul = /^\s*[-*]\s+/;
    const ol = /^\s*\d+\.\s+/;
    if (ul.test(line) || ol.test(line)) {
      const re = ul.test(line) ? ul : ol;
      const items: string[] = [];
      for (; i < lines.length && re.test(lines[i]); i++) items.push(lines[i].replace(re, ""));
      i--;
      blocks.push({ kind: re === ul ? "ul" : "ol", items });
      continue;
    }
    const para: string[] = [line.trim()];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !/^(#{1,4}\s|```|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i + 1])) para.push(lines[++i].trim());
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
}

export function Prose({ md, className = "" }: { md: string; className?: string }) {
  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {parseBlocks(md).map((b, i) => {
        switch (b.kind) {
          case "h":
            return b.level === 1 ? <h2 key={i} className="font-display text-xl text-[var(--accent-2)]">{inline(b.text)}</h2> : <h3 key={i} className="font-display pt-2 text-base text-[var(--accent-2)]">{inline(b.text)}</h3>;
          case "ul":
            return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
          case "ol":
            return <ol key={i} className="list-decimal space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>;
          case "code":
            return <pre key={i} className="overflow-x-auto rounded border border-slate-600 bg-black/30 p-2 font-mono text-xs">{b.text}</pre>;
          default:
            return <p key={i}>{inline(b.text)}</p>;
        }
      })}
    </div>
  );
}
