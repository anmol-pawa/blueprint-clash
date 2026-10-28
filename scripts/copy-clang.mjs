// Copies the @yowasp/clang runtime (≈105 MB) and bp_test.h into public/clang/ so the judge worker can load them
// as plain static files (lazily, only on the judge page, outside the bundler). public/clang/ is git-ignored.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const src = join("node_modules", "@yowasp", "clang", "gen");
const dest = join("public", "clang");
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(src)) {
  const to = join(dest, f);
  if (!existsSync(to) || statSync(to).size !== statSync(join(src, f)).size) copyFileSync(join(src, f), to);
}
copyFileSync(join("lib", "judge", "cpp", "bp_test.h"), join(dest, "bp_test.h"));
console.log("public/clang ready");
