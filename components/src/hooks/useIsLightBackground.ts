import { useMemo } from "react";
import { useTheme } from "styled-components";

import { hexToHSL } from "../utils";

export function useIsLightBackground() {
  const theme = useTheme();

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  return isLightBackground;
}
