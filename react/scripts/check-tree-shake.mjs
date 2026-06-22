#!/usr/bin/env node
// Validates that nothing reachable from the root entry via STATIC imports
// pulls in the heavy UI peer deps. The unified `SchematicProvider` at
// `src/provider.tsx` is supposed to stay light: the embed adapter is only
// reachable via a dynamic `import()` (the lazy Path C path) or via the
// /components subpath entry. If a string like "styled-components" or
// "@stripe/" appears anywhere in the eagerly-loaded graph, the abstraction
// has leaked.
//
// Note on splitting: the /core ESM build runs with `--splitting`, so the
// entry is mostly a shim that re-exports from `dist/chunks/`. We can't just
// scan `schematic-react.esm.js` — virtually all of its code lives in a
// chunk it statically imports. Instead, we walk the static-import graph
// rooted at the entry and scan every reachable file. Chunks reachable only
// via dynamic `import()` (e.g. the lazy embed adapter) are intentionally
// skipped — they don't load until a consumer actually mounts an embed
// component.
//
// Note on CJS: esbuild does not support `--splitting` for CJS, so the CJS
// bundle inlines the dynamic import and unavoidably mentions the heavy
// deps' module names in `require()` calls. The peer-dep guarantee is
// preserved (those deps stay external to the bundle), but a substring
// check would false-positive. CJS is therefore skipped here.
//
// Run after `yarn build` (which emits the bundles into dist/).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");

// Strings that should NEVER appear in any file reachable from the root
// entry via static imports. Each entry is a dependency that only the
// /components surface (or the lazy embed chunk) should reach for. All are
// externalized in every esbuild build, so the only way one of these would
// appear in the eagerly-loaded graph is if non-component code imported it
// directly — which is the leak we're guarding against.
const ROOT_FORBIDDEN = [
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

// The /headless surface is the headless primitive layer. It may bundle the
// styled-free data hooks, but it must NOT reach for any of the heavy UI peers
// — that's the whole point of a separate, lightweight entry. (lodash/pako/uuid
// are intentionally NOT forbidden here: a styled-free hook the primitives reuse
// may pull a `lodash/*` helper, and those stay external regardless.)
const HEADLESS_FORBIDDEN = [
  "@stripe/react-stripe-js",
  "@stripe/stripe-js",
  "styled-components",
  "i18next",
  "react-i18next",
  "@schematichq/schematic-icons",
];

// Markers for code that must only be reachable via a dynamic `import()`.
//
// `@schematichq/schematic-js` can't go in FORBIDDEN: the root entry
// legitimately *re-exports* a few of its values (`Schematic`, `RuleType`,
// `TrialStatus`, `UsagePeriod`), so its specifier appears on `export … from`
// lines in the entry shim without pulling the WS client *runtime* into the
// eager graph. The thing we actually want to keep lazy is the WS adapter,
// which is the only code that constructs `new Schematic(...)`. We detect a
// leak via a string only that adapter emits — the version header it sets when
// constructing the client. If it shows up in a statically-reachable file, the
// adapter (and `@schematichq/schematic-js` with it) escaped its lazy chunk.
const DYNAMIC_ONLY_MARKERS = ["X-Schematic-Client-Version"];

// One guarded entry per checked bundle, each with its own needle set. The ESM
// (splitting) builds are scanned because their entry shim statically imports
// the real chunks; CJS is skipped (see the note above on inlined dynamic
// imports). The headless bundle has no WS-adapter concern, so it omits the
// dynamic-only marker.
const GUARDED_BUNDLES = [
  {
    bundle: "dist/schematic-react.esm.js",
    needles: [...ROOT_FORBIDDEN, ...DYNAMIC_ONLY_MARKERS],
  },
  {
    bundle: "dist/headless/schematic-react-headless.esm.js",
    needles: HEADLESS_FORBIDDEN,
  },
];

// Matches static `import`/`export … from "x"` (and side-effect `import "x"`).
// Dynamic `import("x")` does NOT match: that form has `(` directly after
// `import`, while this pattern requires `\s+` between `import` and what
// follows. esbuild's output preserves that distinction.
const STATIC_IMPORT_RE =
  /(?:^|[;\n}])\s*(?:import|export)\s+(?:[^;'"]*?\s+from\s+)?["']([^"']+)["']/gm;

function collectStaticImports(src) {
  const out = [];
  STATIC_IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = STATIC_IMPORT_RE.exec(src)) !== null) {
    out.push(m[1]);
  }
  return out;
}

let failed = false;

for (const { bundle: rel, needles } of GUARDED_BUNDLES) {
  const abs = resolve(pkgRoot, rel);
  if (!existsSync(abs)) {
    console.error(`[check-tree-shake] missing bundle: ${rel}`);
    failed = true;
    continue;
  }

  const visited = new Set();
  const stack = [abs];
  const hitsByFile = [];

  while (stack.length > 0) {
    const file = stack.pop();
    if (visited.has(file)) continue;
    visited.add(file);

    if (!existsSync(file)) {
      console.error(
        `[check-tree-shake] missing file referenced from graph: ${relative(pkgRoot, file)}`,
      );
      failed = true;
      continue;
    }

    const src = readFileSync(file, "utf8");
    const hits = needles.filter((needle) => src.includes(needle));
    if (hits.length > 0) {
      hitsByFile.push({ file, hits });
    }

    for (const spec of collectStaticImports(src)) {
      // Only follow relative paths. Bare specifiers (e.g. "react") are
      // externals — they resolve to node_modules at consumer install
      // time, not to files we can scan.
      if (!spec.startsWith("./") && !spec.startsWith("../")) continue;
      stack.push(resolve(dirname(file), spec));
    }
  }

  if (hitsByFile.length === 0) {
    console.log(
      `[check-tree-shake] ok: ${rel} (scanned ${visited.size} file${visited.size === 1 ? "" : "s"})`,
    );
  } else {
    console.error(
      `[check-tree-shake] FAIL: forbidden refs reachable from ${rel} via static imports:`,
    );
    for (const { file, hits } of hitsByFile) {
      console.error(`  ${relative(pkgRoot, file)}: ${hits.join(", ")}`);
    }
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
