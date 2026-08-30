// Vendors the Monaco editor's `vs` assets from node_modules into
// `public/monaco`, so Editor.tsx can load Monaco from this app
// (`/monaco/vs`) instead of a CDN. Runs as a postinstall step.
//
// `public/monaco` is gitignored — re-run `npm install` if it goes missing.

import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");

const src = path.join(frontendRoot, "node_modules", "monaco-editor", "min", "vs");
const destRoot = path.join(frontendRoot, "public", "monaco");
const dest = path.join(destRoot, "vs");

async function main() {
  if (!existsSync(src)) {
    console.error(`[copy-monaco] source not found: ${src}`);
    console.error("[copy-monaco] is monaco-editor installed? (npm install)");
    process.exit(1);
  }

  await rm(destRoot, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });
  await cp(src, dest, { recursive: true });

  console.log(`[copy-monaco] vendored monaco-editor into ${path.relative(frontendRoot, dest)}`);
}

main().catch((err) => {
  console.error("[copy-monaco] failed:", err);
  process.exit(1);
});
