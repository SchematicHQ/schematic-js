import {
  iconsList,
  type IconNames,
  type IconProps as SchematicIconProps,
} from "@schematichq/schematic-icons";

import * as styles from "./styles";

export { iconsList, type IconNames };

const iconNames = new Set(Object.keys(iconsList));
const isIconName = (value: string): value is IconNames => iconNames.has(value);

// Pictographic emoji (📈, 🪜, …) are valid icon values and should render as-is.
// Use Extended_Pictographic — not \p{Emoji}, which also matches digits, #, *.
const isEmoji = (value: string) => /\p{Extended_Pictographic}/u.test(value);

export const ICON_FALLBACK_CLASS = "icon-fallback-monogram";

// Warn at most once per unknown name so a missing icon repeated across a list
// doesn't flood the console.
const warnedNames = new Set<string>();

const getNameProps = (name: string) => {
  // Known icon: render the font glyph.
  if (isIconName(name)) {
    return { name };
  }

  // Emoji/symbol: render the whole string (never slice multi-codepoint emoji).
  if (isEmoji(name)) {
    return { as: "span" as const, children: name };
  }

  // Unknown named icon — e.g. a slug whose glyph isn't in this bundle's icon
  // set, usually because the icon was added after this build of
  // @schematichq/schematic-components. Render a compact monogram instead of the
  // raw name (which overflows the icon box), and warn so the missing icon is
  // discoverable.
  if (!warnedNames.has(name)) {
    warnedNames.add(name);
    console.warn(
      `[schematic] Unknown icon "${name}"; rendering a monogram fallback. ` +
        `It may have been added after this @schematichq/schematic-components build.`,
    );
  }

  const monogram = name.trim().charAt(0).toUpperCase();
  return {
    as: "span" as const,
    className: ICON_FALLBACK_CLASS,
    title: name,
    children: monogram || name,
  };
};

export interface IconProps extends Omit<SchematicIconProps, "name"> {
  name: IconNames | string; // allow for emoji unicode characters
  variant?: "filled" | "outline";
  size?: "tn" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  color?: string;
  background?: string;
  rounded?: boolean;
}

export const Icon = ({
  children,
  name,
  variant,
  size,
  color = "white",
  background,
  rounded,
  ...rest
}: IconProps) => {
  return (
    <styles.Icon
      $variant={variant}
      $size={size}
      $color={color}
      $background={background}
      $rounded={rounded}
      {...getNameProps(name)}
      {...rest}
    />
  );
};
