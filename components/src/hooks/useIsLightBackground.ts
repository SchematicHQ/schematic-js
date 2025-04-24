import Color from "colorjs.io";
import { useMemo } from "react";
import { useTheme } from "styled-components";

export function useIsLightBackground() {
  const theme = useTheme();

  const isLightBackground = useMemo(() => {
    const { luminance } = new Color(theme.card.background);
    return luminance > 0.5;
  }, [theme.card.background]);

  return isLightBackground;
}
