import styled, { css } from "styled-components";
import { Box } from "..";

export const Container = styled(Box)`
  sub,
  sup {
    position: static;
    line-height: 1;
  }

  sub {
    vertical-align: baseline;
  }

  sup {
    vertical-align: top;
  }
`;

import { ModalSizeProps } from "./Modal";

interface ModalHeaderWrapperProps {
  bordered: boolean;
  isLightBackground: boolean;
  hasChildren: boolean;
}

export const ModalHeaderWrapper = styled.div<ModalHeaderWrapperProps>`
  display: flex;
  justify-content: ${({ hasChildren }) =>
    hasChildren ? "space-between" : "flex-end"};
  align-items: center;
  flex-shrink: 0;
  height: 5rem;
  gap: 1rem;
  padding: 0 1.5rem 0 3rem;

  ${({ bordered, isLightBackground }) =>
    bordered &&
    css`
      border-bottom-width: 1px;
      border-bottom-style: solid;
      border-bottom-color: ${isLightBackground
        ? "hsla(0, 0%, 0%, 0.15)"
        : "hsla(0, 0%, 100%, 0.15)"};
    `}

  @media (max-width: 768px) {
    ::-webkit-scrollbar {
      display: none;
    }
    z-index: 1;
    position: sticky;
    left: 0;
    top: 0;
    overflow: hidden;
    overflow-x: auto;
    max-width: 100%;
    background-color: ${({ theme }) => theme.card.background};
    height: 4rem;
    padding: 0 0.75rem 0 1.5rem;
    border-radius: 0;
    gap: 0.16rem;

    .checkout-stage-circle {
      display: none;
    }
  }
`;

export const ModalHeaderInnerWrapper = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    gap: 0.16rem;
  }
`;

interface ModalInnerWrapperProps {
  size?: ModalSizeProps;
}

export const ModalInnerWrapper = styled.div<ModalInnerWrapperProps>`
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${({ theme }) => theme.card.background};
  border-radius: 0.5rem;
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;

  ${({ size }) =>
    size === "auto"
      ? `
    width: fit-content;
    height: fit-content;
  `
      : `
    width: 100%;
    ${size === "lg" ? "height: 100%;" : "height: fit-content;"}
    max-width: ${size === "sm" ? "480px" : size === "md" ? "688px" : "1356px"};
    max-height: 860px;
  `}

  @media (max-width: 768px) {
    overflow-y: auto;
  }
`;
