import styled, { css, keyframes } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { Box, type BoxProps, type Position } from "../../ui";

export const Trigger = styled(Box)``;

const coords = (position: Position) => {
  let x = 0;
  let y = 0;
  switch (position) {
    case "top":
      x = -50;
      y = -100;
      break;
    case "right":
      x = 0;
      y = -50;
      break;
    case "bottom":
      x = -50;
      y = 0;
      break;
    case "left":
      x = -100;
      y = -50;
      break;
  }

  return { x, y };
};

const arrowCoords = (position: Position) => {
  let x = 0;
  let y = 0;
  switch (position) {
    case "top":
      x = -50;
      y = -50;
      break;
    case "right":
      x = 50;
      y = -50;
      break;
    case "bottom":
      x = -50;
      y = 50;
      break;
    case "left":
      x = -50;
      y = -50;
      break;
  }

  return { x, y };
};

type Origin = Position | "center";

const origin = (position: Position) => {
  const o: { x: Origin; y: Origin } = {
    x: position === "top" ? "bottom" : position === "bottom" ? "top" : "center",
    y: position === "left" ? "right" : position === "right" ? "left" : "center",
  };

  return o;
};

export const grow = (translate: { x: number; y: number }) => {
  return keyframes`
    0% {
      opacity: 0;
      transform: translate(${translate.x}%, ${translate.y}%) scale(0);
    }

    100% {
      opacity: 1;
      transform: translate(${translate.x}%, ${translate.y}%) scale(1);
    }
  `;
};

interface ContentProps extends BoxProps {
  x: number;
  y: number;
  position: Position;
  zIndex: number;
}

export const Content = styled(Box).withConfig({
  shouldForwardProp: (prop) => !["x", "y", "position", "zIndex"].includes(prop),
})<ContentProps>(({ x, y, position, zIndex }) => {
  const translate = coords(position);
  const arrowTranslate = arrowCoords(position);
  const transformOrigin = origin(position);

  return css`
    position: absolute;
    top: calc(
      ${y}px -
        ${position === "top" ? 0.75 : position === "bottom" ? -0.75 : 0}rem
    );
    left: calc(
      ${x}px -
        ${position === "left" ? 0.75 : position === "right" ? -0.75 : 0}rem
    );
    transform: translate(${translate.x}%, ${translate.y}%);
    z-index: ${zIndex};
    line-height: 1;
    width: max-content;
    max-width: 100%;
    padding: ${1 / 1.15}rem 1rem;
    text-align: left;
    opacity: 0;
    background-color: ${({ theme }) => theme.card.background};
    border-radius: ${({ theme }) =>
      `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`};
    filter: drop-shadow(0px 1px 20px #1018280f)
      drop-shadow(0px 1px 3px #1018281a);
    transform-origin: ${transformOrigin.x} ${transformOrigin.y};
    animation: 0.2s ease-in-out 0.1s both ${grow(translate)};

    &::after {
      position: absolute;
      z-index: 0;
      ${position === "top"
        ? css`
            top: 100%;
            left: 50%;
          `
        : position === "right"
          ? css`
              top: 50%;
              right: 100%;
            `
          : position === "bottom"
            ? css`
                bottom: 100%;
                left: 50%;
              `
            : css`
                top: 50%;
                left: 100%;
              `};
      transform: translate(${arrowTranslate.x}%, ${arrowTranslate.y}%);
      content: "";
      display: block;
      width: 1rem;
      height: 1rem;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
      background-color: ${({ theme }) => theme.card.background};
    }
  `;
});
