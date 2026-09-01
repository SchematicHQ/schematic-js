// Emits two variants because styled-components ships two builds and neither
// works in both environments:
//   * its `browser` build injects global styles on the client but touches
//     `document`, crashing during SSR;
//   * its `universal` build is SSR-safe but its `createGlobalStyle` never
//     injects on the client — which blanks our icon font (<IconStyles />).
// So we build a `browser` variant (browser build) and a `server` variant
// (universal build); package.json `exports` routes the `browser` condition to
// the former and default/node to the latter.
// The server variant pins styled-components to its universal build by absolute
// path (bypassing the `browser` remap) and shims `stream` (pulled in only by an
// SSR streaming helper we never call).

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import esbuild from "esbuild";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const args = process.argv.slice(2);
const format = args.includes("--format=cjs") ? "cjs" : "esm";
const variant = args.includes("--variant=browser") ? "browser" : "server";
// The v3 entry (src/v3) has no styled-components, so it needs no
// browser/server split — one bundle pair serves every environment.
const entry = args.includes("--entry=v3-fixtures")
  ? "v3-fixtures"
  : args.includes("--entry=v3")
    ? "v3"
    : "main";
const watch = args.includes("--watch");

const ext = format === "cjs" ? "cjs.js" : "esm.js";
const outfile =
  entry === "v3-fixtures"
    ? `dist/schematic-components-v3-fixtures.${ext}`
    : entry === "v3"
      ? `dist/schematic-components-v3.${ext}`
      : variant === "browser"
      ? `dist/schematic-components.browser.${ext}`
      : `dist/schematic-components.${ext}`;

// Resolve styled-components' universal build (the package's `main`/`module`
// fields, not its `browser` remap) to an absolute path. Used by the server
// variant only.
const scPkgPath = require.resolve("styled-components/package.json");
const scPkgDir = dirname(scPkgPath);
const scPkg = require(scPkgPath);
const styledComponentsUniversal = resolve(
  scPkgDir,
  format === "cjs" ? scPkg.main : scPkg.module,
);

// Plugin that pins styled-components to its universal (SSR-safe) build for the
// server variant.
const ssrSafeStyledComponents = {
  name: "ssr-safe-styled-components",
  setup(build) {
    build.onResolve({ filter: /^styled-components$/ }, () => ({
      path: styledComponentsUniversal,
    }));

    // The universal build lazily requires Node's `stream` for streaming SSR,
    // which we never use. Shim it to an empty module so it stays out of the
    // bundle.
    build.onResolve({ filter: /^(node:)?stream$/ }, () => ({
      path: "stream",
      namespace: "empty-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "empty-shim" }, () => ({
      contents: "export default {};",
      loader: "js",
    }));
  },
};

const options = {
  entryPoints: [
    entry === "v3-fixtures"
      ? "src/v3/fixtures/index.ts"
      : entry === "v3"
        ? "src/v3/index.ts"
        : "src/index.ts",
  ],
  bundle: true,
  format,
  outfile,
  // The v3 entries must never inline React or the schematic SDKs: each
  // carries a module-level React context, and a bundled copy would read a
  // different context instance than the one the host's provider writes.
  external:
    entry === "main"
      ? ["react", "react-dom", "@stripe/react-stripe-js"]
      : [
          "react",
          "react-dom",
          "@schematichq/schematic-js",
          "@schematichq/schematic-react",
        ],
  define: {
    "process.env.SCHEMATIC_COMPONENTS_VERSION": JSON.stringify(version),
  },
  plugins: variant === "server" ? [ssrSafeStyledComponents] : [],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log(`[esbuild] watching (${variant}/${format})…`);
} else {
  await esbuild.build(options);
}
