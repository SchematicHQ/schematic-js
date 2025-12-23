import { useMemo } from "react";

import { isLightColor } from "../utils";

import { useEmbed } from "./useEmbed";

export function useIsLightBackground() {
  const { settings } = useEmbed();

  const isLightBackground = useMemo(() => {
    return isLightColor(settings.theme.card.background);
  }, [settings.theme.card.background]);

  return isLightBackground;
}
