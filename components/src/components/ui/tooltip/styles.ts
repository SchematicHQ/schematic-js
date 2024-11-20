import styled from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { Box } from "../../ui";

export const TooltipWrapper = styled(Box)`
  position: relative;

  .tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 100%;
    line-height: 1;
    width: max-content;
    max-width: 100%;
    margin-bottom: 0.75rem;
    padding: ${1 / 1.15}rem 1rem;
    text-align: left;
    background-color: ${({ theme }) => theme.card.background};
    border-radius: ${({ theme }) =>
      `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`};
    filter: drop-shadow(0px 1px 20px #1018280f)
      drop-shadow(0px 1px 3px #1018281a);
    transition: opacity 0.1s 0.2s ease-in-out;
    opacity: 0;
    visibility: hidden;

    &::after {
      position: absolute;
      z-index: 0;
      top: 100%;
      left: 50%;
      transform: translate(-50%, -50%);
      content: "";
      display: block;
      width: 1rem;
      height: 1rem;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
      background-color: ${({ theme }) => theme.card.background};
    }
  }

  &:hover {
    .tooltip {
      opacity: 1;
      visibility: visible;
    }
  }
`;
