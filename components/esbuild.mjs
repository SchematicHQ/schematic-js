// Build entry for the bundled library (replaces the inline esbuild CLI calls).
//
// Why this exists instead of a one-line `esbuild` invocation:
// styled-components ships a `browser` field in its package.json that remaps its
// universal build to a browser-only build with the server-side rendering path
// compiled out. esbuild honors that field under the default `browser` platform,
// so the bundled styled-components loses its `isServer ? VirtualTag` branch and
// calls `document` while injecting styles. That crashes any consumer that renders
// our components during SSR / static prerender ("ReferenceError: document is not
// defined").
//
// We force esbuild to bundle styled-components' *universal* build (which checks
// for `window`/`document` at runtime and is SSR-safe) by resolving it to an
// absolute file path, which bypasses the `browser` field remap. The universal
// build lazily `require("stream")` inside its Node streaming SSR helper — an API
// we never call — so we point `stream` at an empty shim to keep it out of the
// browser bundle.

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import esbuild from "esbuild";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const args = process.argv.slice(2);
const format = args.includes("--format=cjs") ? "cjs" : "esm";
const watch = args.includes("--watch");

const outfile =
  format === "cjs"
    ? "dist/schematic-components.cjs.js"
    : "dist/schematic-components.esm.js";

// Resolve styled-components' universal build (the package's `main`/`module`
// fields, not its `browser` remap) to an absolute path.
const scPkgPath = require.resolve("styled-components/package.json");
const scPkgDir = dirname(scPkgPath);
const scPkg = require(scPkgPath);
const styledComponentsUniversal = resolve(
  scPkgDir,
  format === "cjs" ? scPkg.main : scPkg.module,
);

const ssrSafeStyledComponents = {
  name: "ssr-safe-styled-components",
  setup(build) {
    // Pin styled-components to its universal (SSR-safe) build, bypassing the
    // `browser` field remap that strips the server path.
    build.onResolve({ filter: /^styled-components$/ }, () => ({
      path: styledComponentsUniversal,
    }));

    // The universal build lazily requires Node's `stream` for streaming SSR,
    // which we never use. Shim it to an empty module so it stays out of the
    // browser bundle.
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
  entryPoints: ["src/index.ts"],
  bundle: true,
  format,
  outfile,
  external: ["react", "react-dom", "@stripe/react-stripe-js"],
  define: {
    "process.env.SCHEMATIC_COMPONENTS_VERSION": JSON.stringify(version),
  },
  plugins: [ssrSafeStyledComponents],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log(`[esbuild] watching (${format})…`);
} else {
  await esbuild.build(options);
}
