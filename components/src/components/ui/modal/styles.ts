import { css, styled } from "styled-components";

import { Box } from "../../ui";

import { type ModalSize } from ".";

interface ModalProps {
  $size?: ModalSize;
}

export const Overlay = styled(Box)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999999;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  scrollbar-width: thin;
  scrollbar-gutter: stable both-edges;
`;

export const Modal = styled.div.attrs({
  tabIndex: 0,
  role: "dialog",
  "aria-modal": true,
})<ModalProps>`
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  flex-direction: column;
  width: 100%;
  height: fit-content;
  max-height: 100dvh;
  overflow: auto;
  background-color: ${({ theme }) => theme.card.background};
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
  }

  @media (min-width: 768px) {
    ${({ $size }) => {
      return css`
        width: ${$size === "auto" ? "fit-content" : "100%"};
        max-width: ${$size === "sm"
          ? "480px"
          : $size === "md"
            ? "688px"
            : "1356px"};
        height: ${$size === "lg" ? "100%" : "fit-content"};
        border-radius: 0.5rem;
      `;
    }}
  }

  @media (min-width: 768px) and (min-height: 896px) {
    max-height: 860px;
  }
`;
