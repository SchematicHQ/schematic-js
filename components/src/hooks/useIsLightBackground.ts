import { useMemo } from "react";

import { hexToHSL } from "../utils";

import { useEmbed } from "./useEmbed";

export function useIsLightBackground() {
  const { settings } = useEmbed();

  const isLightBackground = useMemo(() => {
    return hexToHSL(settings.theme.card.background).l > 50;
  }, [settings.theme.card.background]);

  return isLightBackground;
}
