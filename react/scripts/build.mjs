#!/usr/bin/env node
// Builds all four output bundles (core CJS/ESM + components CJS/ESM) via
// esbuild's JS API. Centralized here so the long shared `external` list
// lives in one place instead of being duplicated across four scripts in
// package.json.

import { build, context } from "esbuild";

// Deps externalized in every build. Some are heavy peer deps (Stripe,
// styled-components, i18next), some are shared with the consumer's app
// (react), and some used to be inlined into the components chunk but
// were promoted to optional peer deps so they show up in the consumer's
// audit graph and dedupe against their own copy.
//
// `lodash/*` covers subpath imports like `lodash/debounce`; without it,
// only a bare `lodash` import would be externalized.
const SHARED_EXTERNAL = [
  "react",
  "@schematichq/schematic-js",
  "@schematichq/schematic-icons",
  "@stripe/react-stripe-js",
  "@stripe/stripe-js",
  "styled-components",
  "i18next",
  "react-i18next",
  "lodash",
  "lodash/*",
  "pako",
  "uuid",
];

// The /components subpath additionally externalizes react-dom and this
// package itself (the components entry imports the already-loaded core,
// it must not bundle a second copy).
const COMPONENTS_EXTERNAL = [
  ...SHARED_EXTERNAL,
  "react-dom",
  "@schematichq/schematic-react",
];

// The /composable subpath ships the headless primitives. It bundles the
// styled-free data hooks (which import `SchematicContext` from the external
// root package), so it externalizes `@schematichq/schematic-react` for the
// same single-instance reason as /components (SCHY-372). It should never
// reach for the heavy UI peers — they stay external so a leak fails the
// /composable tree-shake check rather than silently inlining.
const COMPOSABLE_EXTERNAL = [
  ...SHARED_EXTERNAL,
  "react-dom",
  "@schematichq/schematic-react",
];

const builds = [
  {
    name: "core:cjs",
    entryPoints: ["src/index.tsx"],
    bundle: true,
    external: SHARED_EXTERNAL,
    format: "cjs",
    outfile: "dist/schematic-react.cjs.js",
  },
  {
    name: "core:esm",
    entryPoints: ["src/index.tsx"],
    bundle: true,
    external: SHARED_EXTERNAL,
    format: "esm",
    splitting: true,
    outdir: "dist",
    entryNames: "schematic-react.esm",
    chunkNames: "chunks/[name]-[hash]",
  },
  {
    name: "components:cjs",
    entryPoints: ["src/components/index.tsx"],
    bundle: true,
    external: COMPONENTS_EXTERNAL,
    format: "cjs",
    outfile: "dist/components/schematic-react-components.cjs.js",
  },
  {
    name: "components:esm",
    entryPoints: ["src/components/index.tsx"],
    bundle: true,
    external: COMPONENTS_EXTERNAL,
    format: "esm",
    splitting: true,
    outdir: "dist/components",
    entryNames: "schematic-react-components.esm",
    chunkNames: "chunks/[name]-[hash]",
  },
  {
    name: "composable:cjs",
    entryPoints: ["src/components/composable/index.tsx"],
    bundle: true,
    external: COMPOSABLE_EXTERNAL,
    format: "cjs",
    outfile: "dist/composable/schematic-react-composable.cjs.js",
  },
  {
    name: "composable:esm",
    entryPoints: ["src/components/composable/index.tsx"],
    bundle: true,
    external: COMPOSABLE_EXTERNAL,
    format: "esm",
    splitting: true,
    outdir: "dist/composable",
    entryNames: "schematic-react-composable.esm",
    chunkNames: "chunks/[name]-[hash]",
  },
];

// CLI args filter the build set. An arg matches by exact name
// (`core:esm`) or by colon-prefix (`core` → both `core:cjs` and
// `core:esm`). With no args, every target is built. `--watch` keeps
// esbuild running and rebuilds on file changes.
const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const requested = args.filter((a) => a !== "--watch");
const selected =
  requested.length === 0
    ? builds
    : builds.filter((b) =>
        requested.some((r) => b.name === r || b.name.startsWith(`${r}:`)),
      );

if (requested.length > 0 && selected.length === 0) {
  console.error(`[build] no builds matched: ${requested.join(", ")}`);
  console.error(`[build] available: ${builds.map((b) => b.name).join(", ")}`);
  process.exit(1);
}

if (watchMode) {
  await Promise.all(
    selected.map(async ({ name, ...options }) => {
      const ctx = await context(options);
      await ctx.watch();
      console.log(`[build] watching: ${name}`);
    }),
  );
  console.log(
    `[build] watching ${selected.length} bundle${selected.length === 1 ? "" : "s"} (Ctrl+C to stop)`,
  );
} else {
  const start = Date.now();
  await Promise.all(
    selected.map(async ({ name, ...options }) => {
      await build(options);
      console.log(`[build] ok: ${name}`);
    }),
  );
  console.log(
    `[build] ${selected.length} bundle${selected.length === 1 ? "" : "s"} built in ${Date.now() - start}ms`,
  );
}
