import { css, styled } from "styled-components";

import { isLightColor } from "../../../utils";
import { Flex } from "../../ui";

export const Overlay = styled(Flex)(({ theme }) => {
  return css`
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9;
    width: 100%;
    height: 100%;
    background-color: color-mix(
      in oklch,
      color-mix(
          in oklch,
          ${theme.card.background},
          ${isLightColor(theme.card.background) ? "white" : "black"}
        )
        80%,
      transparent
    );
    backdrop-filter: blur(8px);
  `;
});
