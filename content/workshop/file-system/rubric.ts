import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public calls and sequences the collaborators: look up, check the kind, change the tree, return a status", phase: "base", owners: ["FileSystemImpl", "FileSystemService", "FileSystemFacade", "InMemoryFileSystem", "FileSystem"] },
  { id: "res-path", text: "Parses and normalises path text into names (separators, '.', '..', name limits) so no other class handles raw strings", phase: "base", owners: ["Path", "PathParser", "PathNormalizer", "PathUtil", "PathResolver"] },
  { id: "res-nodes", text: "Represents entries as one family (Composite) so a file, a directory and later a link answer the same questions, and the directory knows how to total its content", phase: "base", owners: ["Node", "Entry", "FileNode", "FsNode", "Inode"] },
  { id: "res-resolve", text: "Walks a path from the root to the entry it names (or to the directory that would hold it) and reports the right status when it cannot", phase: "base", owners: ["Resolver", "PathResolver", "Walker", "Lookup", "Navigator"] },
  { id: "res-search", text: "Walks the tree collecting the entries whose name matches a pattern, separate from the nodes themselves", phase: "storm1", owners: ["Finder", "Searcher", "TreeWalker", "Visitor", "NodeVisitor"] },
  { id: "res-glob", text: "Decides whether one name matches a pattern with '*' and '?', in linear time", phase: "storm1", owners: ["Glob", "Matcher", "GlobMatcher", "Pattern", "NameMatcher"] },
  { id: "res-links", text: "Represents a link as another kind of node and keeps the rule for following links and counting hops inside the one place that walks paths", phase: "storm2", owners: ["Link", "SymLink", "Symlink", "SymbolicLink", "LinkNode"] },
];
