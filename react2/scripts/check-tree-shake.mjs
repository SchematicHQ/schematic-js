#!/usr/bin/env node
// Validates that the root entry bundle does NOT contain code from any of the
// heavy UI peer deps. If the root bundle ever leaks a string like
// "styled-components" or "@stripe/" it means a /components-only import has
// accidentally been pulled into the core entry, and importers of the root
// package would be forced to install those peer deps.
//
// Run after `yarn build` (which emits the bundles into dist/).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");

const ROOT_BUNDLES = [
  "dist/schematic-react2.esm.js",
  "dist/schematic-react2.cjs.js",
];

// Strings that should NEVER appear in the root bundle. Each entry is a peer
// dep that only the /components surface should reach for.
const FORBIDDEN = [
  "@stripe/react-stripe-js",
  "@stripe/stripe-js",
  "styled-components",
  "i18next",
  "react-i18next",
  "@schematichq/schematic-icons",
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
