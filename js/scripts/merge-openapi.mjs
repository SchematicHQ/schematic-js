#!/usr/bin/env node
/**
 * Merges OpenAPI specs (JSON) into one, so a client generated from more than
 * one credential's spec shares the models they have in common rather than
 * carrying a copy per spec. Both specs come from the same API, so a schema
 * one spec names the same as another's must be the same schema; one that is
 * not means the specs were read from different API revisions, and the merge
 * refuses rather than picking a side.
 *
 * Usage: merge-openapi.mjs <out.json> <in.json> [<in.json>...]
 */
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";

const [outFile, ...inFiles] = process.argv.slice(2);
if (!outFile || inFiles.length === 0) {
  console.error("usage: merge-openapi.mjs <out.json> <in.json> [<in.json>...]");
  process.exit(1);
}

const [base, ...rest] = inFiles.map((file) =>
  JSON.parse(fs.readFileSync(file, "utf8")),
);
const merged = structuredClone(base);
merged.paths ??= {};
merged.components ??= {};

let conflicts = 0;
for (const [index, spec] of rest.entries()) {
  const file = inFiles[index + 1];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (merged.paths[path] !== undefined) {
      console.error(`path in more than one spec: ${path} (${file})`);
      conflicts += 1;
      continue;
    }
    merged.paths[path] = item;
  }
  for (const [section, entries] of Object.entries(spec.components ?? {})) {
    merged.components[section] ??= {};
    for (const [name, value] of Object.entries(entries)) {
      const existing = merged.components[section][name];
      if (existing === undefined) {
        merged.components[section][name] = value;
      } else if (
        // Each spec describes its own credential; the client sends it, not
        // the generated code.
        section !== "securitySchemes" &&
        !isDeepStrictEqual(existing, value)
      ) {
        console.error(`#/components/${section}/${name} differs in ${file}`);
        conflicts += 1;
      }
    }
  }
}

if (conflicts > 0) {
  process.exit(1);
}
fs.writeFileSync(outFile, JSON.stringify(merged, null, 2));
