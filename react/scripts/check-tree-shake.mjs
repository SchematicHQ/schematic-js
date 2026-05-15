#!/usr/bin/env node
// Validates that the root entry's ESM main bundle does NOT contain code or
// imports from any of the heavy UI peer deps. The unified `SchematicProvider`
// at `src/provider.tsx` is supposed to stay light: the embed adapter is only
// reachable via a dynamic `import()` (the lazy Path C path) or via the
// /components subpath entry. If a string like "styled-components" or
// "@stripe/" appears in the root ESM bundle, the abstraction has leaked.
//
// Note on splitting: the /core ESM build runs with `--splitting`, so the
// dynamically-imported embed adapter lands in `dist/chunks/`. Those chunk
// files are EXPECTED to reference the heavy peer deps; they're only loaded
// at runtime when an embed component actually mounts. We therefore only
// scan the main entry file here, not the chunks.
//
// Note on CJS: esbuild does not support `--splitting` for CJS, so the CJS
// bundle inlines the dynamic import and unavoidably mentions the heavy
// deps' module names in `require()` calls. The peer-dep guarantee is
// preserved (those deps stay external to the bundle), but a substring
// check would false-positive. CJS is therefore skipped here.
//
// Run after `yarn build` (which emits the bundles into dist/).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");

const ROOT_BUNDLES = ["dist/schematic-react.esm.js"];

// Strings that should NEVER appear in the root ESM main bundle. Each entry
// is a dependency that only the /components surface (or the lazy embed
// chunk) should reach for. All are externalized in every esbuild build,
// so the only way one of these would appear in the root entry is if
// non-component code imported it directly — which is the leak we're
// guarding against.
const FORBIDDEN = [
  "@stripe/react-stripe-js",
  "@stripe/stripe-js",
  "styled-components",
  "i18next",
  "react-i18next",
  "@schematichq/schematic-icons",
  "lodash",
  "pako",
  "uuid",
];

let failed = false;

for (const rel of ROOT_BUNDLES) {
  const abs = resolve(pkgRoot, rel);
  if (!existsSync(abs)) {
    console.error(`[check-tree-shake] missing bundle: ${rel}`);
    failed = true;
    continue;
  }

  const src = readFileSync(abs, "utf8");
  const hits = FORBIDDEN.filter((needle) => src.includes(needle));

  if (hits.length === 0) {
    console.log(`[check-tree-shake] ok: ${rel}`);
  } else {
    console.error(
      `[check-tree-shake] FAIL: ${rel} contains forbidden refs: ${hits.join(", ")}`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
