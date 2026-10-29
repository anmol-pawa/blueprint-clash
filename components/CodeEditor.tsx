"use client";
import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { setDiagnostics, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type { Diagnostic } from "@/lib/judge/types";

interface Props {
  /** Changing `path` swaps the document (and resets undo history). */
  path: string;
  value: string;
  readOnly?: boolean;
  diagnostics?: Diagnostic[];
  onChange?: (value: string) => void;
}

const theme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "14px", backgroundColor: "#0c1630", color: "#e6edf7" },
    ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "auto" },
    ".cm-content": { padding: "8px 0", caretColor: "#ffffff" },
    "&.cm-focused": { outline: "none" },
    ".cm-cursor": { borderLeftColor: "#ffffff" },
    ".cm-gutters": { backgroundColor: "#0a1226", color: "#7f8fb0", border: "none" },
    ".cm-activeLine": { backgroundColor: "#16244a" },
    ".cm-activeLineGutter": { backgroundColor: "#16244a" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#2b4a8a" },
    ".cm-tooltip": { backgroundColor: "#16244a", color: "#e6edf7", border: "1px solid #3b4c78" },
  },
  { dark: true },
);

// Contrast-checked against #0c1630 (all at least 4.5:1).
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.modifier], color: "#ff9d6e" },
  { tag: [t.typeName, t.className, t.namespace], color: "#6fd3c8" },
  { tag: [t.string, t.special(t.string)], color: "#b5e07a" },
  { tag: [t.number, t.bool, t.null], color: "#f2c46d" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#8fa0c4", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#8ab4ff" },
  { tag: [t.meta, t.processingInstruction], color: "#c9a0ff" },
  { tag: [t.operator, t.punctuation], color: "#c8d3ea" },
]);

function toCm(state: EditorState, diags: Diagnostic[]): CmDiagnostic[] {
  const out: CmDiagnostic[] = [];
  for (const d of diags) {
    if (d.line < 1 || d.line > state.doc.lines) continue;
    const line = state.doc.line(d.line);
    const from = Math.min(line.from + Math.max(d.col - 1, 0), line.to);
    out.push({ from, to: Math.max(from, line.to), severity: d.severity === "error" ? "error" : d.severity === "warning" ? "warning" : "info", message: d.message });
  }
  return out;
}

export function CodeEditor({ path, value, readOnly = false, diagnostics = [], onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const diagRef = useRef(diagnostics);
  const ro = useRef(new Compartment());
  useEffect(() => {
    onChangeRef.current = onChange;
    diagRef.current = diagnostics;
  });

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(), history(), drawSelection(), highlightActiveLine(), bracketMatching(), indentOnInput(),
        syntaxHighlighting(highlight), cpp(), theme,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        ro.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current! });
    view.current = v;
    v.dispatch(setDiagnostics(v.state, toCm(v.state, diagRef.current)));
    return () => v.destroy();
    // A new document per file: path is the identity; value/readOnly seed the new state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    if (v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: ro.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (v) v.dispatch(setDiagnostics(v.state, toCm(v.state, diagnostics)));
  }, [diagnostics, path]);

  return <div ref={host} data-testid="code-editor" className="h-full min-h-0 overflow-hidden" />;
}
