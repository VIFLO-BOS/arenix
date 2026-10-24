// Fast per-file syntax check (no type checking). Usage: node scripts/qa/syntax-check.mjs <dir|file>... [--all]
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
const all = args.includes("--all");
const roots = args.filter((a) => a !== "--all");
const files = [];
function walk(p) { if (statSync(p).isDirectory()) { for (const n of readdirSync(p)) walk(join(p, n)); } else if (/\.(ts|tsx)$/.test(p)) files.push(p); }
roots.forEach(walk);
let bad = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const out = ts.transpileModule(src, { reportDiagnostics: true, fileName: f, compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } });
  const diags = out.diagnostics ?? [];
  if (!diags.length) continue;
  bad++;
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const shown = all ? diags : diags.slice(0, 6);
  console.log(`\n## ${f} (${diags.length} errors)`);
  for (const d of shown) {
    const { line } = ts.getLineAndCharacterOfPosition(sf, d.start ?? 0);
    const text = src.split("\n")[line] ?? "";
    console.log(`  L${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}\n      ${text.trim().slice(0, 160)}`);
  }
}
console.log(`\n${bad} files with syntax errors out of ${files.length}`);
process.exit(bad ? 1 : 0);
