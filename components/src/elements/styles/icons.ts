import { iconsList } from "@schematichq/schematic-icons";

import { iconFontCss } from "./icon-font";

/**
 * The icon font and a rule per glyph, appended to the elements stylesheet by
 * `<SchematicStyles />`. Glyphs render on `.schematic-icon
 * .schematic-icon--<name>`. The names and codepoints are the package's own
 * `iconsList`, so they cannot drift from the font. The package's selectors
 * (`i[class^="icon-"]`, `.icon-*`) are not reused: they are global, carry
 * `!important`, and would collide with a host that loads the package itself.
 */

const glyphs: Record<string, number> = iconsList;

/** Whether the font draws `name`; anything else, an emoji, is drawn as text. */
export function isIconName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(glyphs, name);
}

const baseCss = `.schematic-icon {
  display: inline-block;
  font-family: "schematic-icons";
  font-style: normal;
  font-variant: normal;
  font-weight: normal;
  line-height: 1;
  speak: never;
  text-transform: none;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
}`;

export const iconsCss: string = [
  iconFontCss.trim(),
  "",
  baseCss,
  "",
  ...Object.entries(glyphs).map(
    ([name, codepoint]) =>
      `.schematic-icon--${name}::before {\n  content: "\\${codepoint.toString(16)}";\n}`,
  ),
].join("\n");
