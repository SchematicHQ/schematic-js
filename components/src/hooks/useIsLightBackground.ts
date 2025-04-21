import { useMemo } from "react";
import { useTheme } from "styled-components";

import { hexToHSL } from "../utils";

export function useIsLightBackground() {
  const theme = useTheme();

  const isLightBackground = useMemo(() => {
    const color = theme.card.background;
    if (/^[0-9A-F]{6}/.test(color)) {
      return hexToHSL(color).l > 50;
    }

    if (color.startsWith("oklch")) {
      const [, l, c] = color.match(/^oklch\((.+) (.+) (.+)\)/) || [];
      return Number(l) + Number(c) / 2 > 0.5;
    }

    return undefined;
  }, [theme.card.background]);

  return isLightBackground;
}
