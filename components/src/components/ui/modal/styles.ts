import { css, styled } from "styled-components";

import { useIsLightBackground } from "../../../hooks";

import { type ModalSize } from ".";

interface ModalProps {
  $size: ModalSize;
  $top: number;
}

export const Modal = styled.dialog<ModalProps>(({ theme, $size, $top }) => {
  const isLightBackground = useIsLightBackground();

  return css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    max-width: 100dvw;
    height: fit-content;
    max-height: 100dvh;
    margin-top: ${$top}px;
    overflow: auto;
    background-color: ${theme.card.background};
    box-shadow:
      0px 1px 20px 0px #1018280f,
      0px 1px 3px 0px #1018281a;
    scrollbar-color: ${isLightBackground
        ? "hsla(0, 0%, 0%, 0.15)"
        : "hsla(0, 0%, 100%, 0.15)"}
      transparent;

    body:has(&[open]) {
      overflow: hidden;
    }

    &:focus-visible {
      outline: 2px solid ${theme.primary};
    }

    &::backdrop {
      background-color: ${isLightBackground
        ? "hsla(0, 0%, 87.5%, 0.9)"
        : "hsla(0, 0%, 12.5%, 0.9)"};
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
});
