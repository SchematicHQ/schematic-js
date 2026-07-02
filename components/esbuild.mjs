// Build entry for the bundled library (replaces the inline esbuild CLI calls).
//
// We emit TWO variants of each format, because styled-components ships two
// builds and neither one is correct in both environments:
//
//   * The `browser` build injects styles client-side (via useLayoutEffect) but
//     references `document` while injecting, so it throws
//     "ReferenceError: document is not defined" if it renders during SSR /
//     static prerender.
//
//   * The `universal` build (styled-components' `main`/`module` fields) is
//     SSR-safe — it guards DOM access at runtime — but its `createGlobalStyle`
//     only injects during a server render (ServerStyleSheet) and has no
//     client-side effect path, so on a pure client render it injects nothing.
//     Our icon font is delivered via `createGlobalStyle` (`<IconStyles />`), so
//     under the universal build every icon renders as an empty/fallback glyph.
//
// So we build:
//   * a `browser` variant that bundles styled-components' browser build — used
//     when a consumer bundles for the browser (the `browser` export condition).
//   * a `server` variant that bundles styled-components' universal build — used
//     for SSR / Node (the default `import`/`require` conditions).
//
// package.json `exports` maps the `browser` condition to the browser variant and
// everything else to the server variant, so each environment gets the build that
// works there. The server variant forces resolution of styled-components to its
// universal build via an absolute path (bypassing the `browser` field remap) and
// shims Node's `stream` (lazily required by an SSR streaming helper we never
// call) to keep it out of the bundle.

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import esbuild from "esbuild";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const args = process.argv.slice(2);
const format = args.includes("--format=cjs") ? "cjs" : "esm";
const variant = args.includes("--variant=browser") ? "browser" : "server";
const watch = args.includes("--watch");

const ext = format === "cjs" ? "cjs.js" : "esm.js";
const outfile =
  variant === "browser"
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
// server variant. The browser variant omits this plugin so esbuild's default
// `browser` platform picks up styled-components' browser build.
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
  entryPoints: ["src/index.ts"],
  bundle: true,
  format,
  outfile,
  external: ["react", "react-dom", "@stripe/react-stripe-js"],
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
