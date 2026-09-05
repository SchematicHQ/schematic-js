// Regenerates src/elements/locales/en.json from the element package's string
// catalogue. Run it after changing copy or a description:
//
//   pnpm run elements:locales
//
// strings.test.ts compares the committed file against the same source, so a
// change that skips this step fails the suite rather than shipping stale
// copy to translators.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import esbuild from "esbuild";

const OUT = resolve("src/elements/locales/en.json");

// The catalogue is TypeScript, so bundle it to a module node can import.
// `@schematichq/schematic-react` is type-only there, so nothing pulls React in.
const dir = await mkdtemp(join(tmpdir(), "schematic-locales-"));
const bundle = join(dir, "strings.mjs");
try {
  await esbuild.build({
    entryPoints: ["src/elements/strings.ts"],
    bundle: true,
    format: "esm",
    outfile: bundle,
    external: ["@schematichq/schematic-react"],
  });
  const { arbBundle } = await import(pathToFileURL(bundle).href);
  await writeFile(OUT, JSON.stringify(arbBundle(), null, 2) + "\n");
  console.log(`[locales] wrote ${OUT}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
