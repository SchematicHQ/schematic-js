#!/usr/bin/env node
/**
 * Filters an OpenAPI spec (JSON) down to a set of paths plus the transitive
 * $ref closure of components they reference. Used to generate narrow API
 * clients from the full publishable-key / temporary-access-token specs, so
 * the customer bundle only carries the catalog/company surface instead of
 * every model in the spec.
 *
 * Usage: filter-openapi.mjs <in.json> <out.json> <path> [<path>...]
 */
import fs from "node:fs";

const [inFile, outFile, ...wantedPaths] = process.argv.slice(2);
if (!inFile || !outFile || wantedPaths.length === 0) {
  console.error(
    "usage: filter-openapi.mjs <in.json> <out.json> <path> [<path>...]",
  );
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(inFile, "utf8"));

const paths = {};
for (const p of wantedPaths) {
  if (!spec.paths?.[p]) {
    console.error(`path not found in spec: ${p}`);
    process.exit(1);
  }
  paths[p] = spec.paths[p];
}

// Collect every "$ref": "#/components/<section>/<name>" reachable from the
// kept paths, then iterate to closure through the referenced components.
const kept = new Map(); // "<section>/<name>" -> component value
const collectRefs = (node, into) => {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, into);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") {
        const match = value.match(/^#\/components\/([^/]+)\/(.+)$/);
        if (match) into.add(`${match[1]}/${match[2]}`);
      } else {
        collectRefs(value, into);
      }
    }
  }
};

const pending = new Set();
collectRefs(paths, pending);
while (pending.size > 0) {
  const next = new Set();
  for (const ref of pending) {
    if (kept.has(ref)) continue;
    const [section, name] = ref.split(/\/(.+)/);
    const value = spec.components?.[section]?.[name];
    if (value === undefined) {
      console.error(`unresolvable reference: #/components/${ref}`);
      process.exit(1);
    }
    kept.set(ref, value);
    collectRefs(value, next);
  }
  pending.clear();
  for (const ref of next) if (!kept.has(ref)) pending.add(ref);
}

const components = {};
for (const [ref, value] of kept) {
  const [section, name] = ref.split(/\/(.+)/);
  components[section] ??= {};
  components[section][name] = value;
}
// Auth schemes are referenced by name from `security`, not by $ref.
if (spec.components?.securitySchemes) {
  components.securitySchemes = spec.components.securitySchemes;
}

const filtered = {
  openapi: spec.openapi,
  info: spec.info,
  ...(spec.servers ? { servers: spec.servers } : {}),
  ...(spec.security ? { security: spec.security } : {}),
  paths,
  components,
};

fs.writeFileSync(outFile, JSON.stringify(filtered, null, 2));
const modelCount = Object.keys(components.schemas ?? {}).length;
console.log(
  `filtered ${inFile}: ${wantedPaths.length} paths, ${modelCount} schemas -> ${outFile}`,
);
