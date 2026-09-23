import { iconsList } from "@schematichq/schematic-icons";
import packageCss from "@schematichq/schematic-icons/styles.css?raw";

import { iconsCss } from "./icons";

import { schematicStylesCss } from ".";

/**
 * icons.ts is generated from the installed `@schematichq/schematic-icons`
 * by scripts/inline-icons.mjs. These tests hold the generated file to the
 * package it was cut from, so a bump without `pnpm run icons` fails here.
 * `iconsList` is the package's glyph map, the same data as its
 * schematic-icons.json.
 */

const glyphs: Record<string, number> = iconsList;

function base64Of(css: string): string {
  const match = css.match(/base64,([A-Za-z0-9+/=]+)/);
  if (match === null) {
    throw new Error("No base64 font in the CSS");
  }
  return match[1];
}

const glyphRule = (name: string, codepoint: number) =>
  `.schematic-icon--${name}::before {\n  content: "\\${codepoint.toString(16)}";\n}`;

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
      expect(iconsCss).toContain(glyphRule(name, glyphs[name]));
    }
    expect(
      iconsCss.match(/\.schematic-icon--[a-z0-9-]+::before/g),
    ).toHaveLength(names.length);
  });

  test("puts the Visa mark where the package does", () => {
    expect(glyphs.visa).toBeDefined();
    expect(iconsCss).toContain(glyphRule("visa", glyphs.visa));
  });

  test("reaches the packaged stylesheet once, after the token pass", () => {
    expect(schematicStylesCss.endsWith(iconsCss)).toBe(true);
    expect(schematicStylesCss.match(/@font-face/g)).toHaveLength(1);
  });
});
