import { css, styled } from "styled-components";

import { isLightColor } from "../../../utils";
import { ContainerStyle, ResetStyle } from "../../layout";

import { type DialogSize } from ".";

interface DialogProps {
  $isModal: boolean;
  $size: DialogSize;
  $top: number;
}

export const Dialog = styled.dialog<DialogProps>(
  ({ theme, $isModal, $size, $top }) => {
    return css`
      ${ResetStyle}
      ${$isModal && ContainerStyle}

    position: absolute;
      top: 50%;
      left: 50%;
      z-index: 10;
      transform: translate(-50%, -50%);
      width: 100%;
      max-width: 100dvw;
      height: fit-content;
      max-height: 100dvh;
      margin: ${$top}px 0 0;
      overflow: auto;
      background-color: ${theme.card.background};
      box-shadow:
        0px 1px 20px 0px #1018280f,
        0px 1px 3px 0px #1018281a;
      scrollbar-color: ${isLightColor(theme.card.background)
          ? "hsla(0, 0%, 0%, 0.15)"
          : "hsla(0, 0%, 100%, 0.15)"}
        transparent;

      &:focus-visible {
        outline: 2px solid ${theme.primary};
      }

      &::backdrop {
        background-color: ${isLightColor(theme.card.background)
          ? "hsla(0, 0%, 87.5%, 0.9)"
          : "hsla(0, 0%, 12.5%, 0.9)"};
        backdrop-filter: blur(8px);
      }

      @media (min-width: 768px) {
        width: ${$size === "auto" ? "fit-content" : "100%"};
        max-width: ${$size === "sm"
          ? "480px"
          : $size === "md"
            ? "688px"
            : "1356px"};
        height: ${$size === "lg" ? "100%" : "fit-content"};
        border-radius: 0.5rem;
      }

      @media (min-width: 768px) and (min-height: 896px) {
        max-height: 860px;
      }
    `;
  },
);

export const Overlay = styled.div(({ theme }) => {
  return css`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9;
    width: 100%;
    height: 100%;
    background-color: ${isLightColor(theme.card.background)
      ? "hsla(0, 0%, 87.5%, 0.9)"
      : "hsla(0, 0%, 12.5%, 0.9)"};
    backdrop-filter: blur(8px);
  `;
});
