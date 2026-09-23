import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { iconsCss } from "./icons";

import { schematicStylesCss } from ".";

/**
 * icons.ts is generated from the installed `@schematichq/schematic-icons`
 * by scripts/inline-icons.mjs. These tests hold the generated file to the
 * package it was cut from, so a bump without `pnpm run icons` fails here.
 */

const require = createRequire(import.meta.url);
// `styles.css` is the only file path the package exports; the glyph map
// sits beside it.
const cssPath = require.resolve("@schematichq/schematic-icons/styles.css");
const packageCss = readFileSync(cssPath, "utf8");
const glyphs: Record<string, number> = JSON.parse(
  readFileSync(join(dirname(cssPath), "schematic-icons.json"), "utf8"),
);

function base64Of(css: string): string {
  const match = css.match(/base64,([A-Za-z0-9+/=]+)/);
  if (match === null) {
    throw new Error("No base64 font in the CSS");
  }
  return match[1];
}

describe("the inlined icon font", () => {
  test("is the one the installed package ships", () => {
    expect(iconsCss.match(/@font-face/g)).toHaveLength(1);
    expect(base64Of(iconsCss)).toBe(base64Of(packageCss));
    expect(iconsCss).toMatch(/font-family: "schematic-icons"/);
  });

  test("blocks rather than swapping, so no glyph flashes as a codepoint", () => {
    expect(iconsCss).toMatch(/@font-face \{[^}]*font-display: block;/);
  });

  test("owns its selectors: no !important, none of the package's", () => {
    expect(iconsCss).not.toContain("!important");
    expect(iconsCss).not.toMatch(/\.icon-/);
    expect(iconsCss).not.toMatch(/\[class\^="icon-"\]/);
  });

  test("carries every glyph in the package, at its codepoint", () => {
    const names = Object.keys(glyphs);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const codepoint = glyphs[name].toString(16);
      expect(iconsCss).toContain(
        `.schematic-icon--${name}::before {\n  content: "\\${codepoint}";\n}`,
      );
    }
    expect(
      iconsCss.match(/\.schematic-icon--[a-z0-9-]+::before/g),
    ).toHaveLength(names.length);
  });

  test("puts the Visa mark where the package does", () => {
    expect(glyphs.visa).toBeDefined();
    expect(iconsCss).toContain(
      `.schematic-icon--visa::before {\n  content: "\\${glyphs.visa.toString(16)}";\n}`,
    );
  });

  test("reaches the packaged stylesheet once, after the token pass", () => {
    expect(schematicStylesCss.endsWith(iconsCss)).toBe(true);
    expect(schematicStylesCss.match(/@font-face/g)).toHaveLength(1);
  });
});
