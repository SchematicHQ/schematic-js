import styled from "styled-components";

export const TooltipWrapper = styled.div`
  .tooltip {
    transition: all 0.2s ease-in-out;
  }

  &:hover {
    .tooltip {
      opacity: 1;
      visibility: visible;
    }
  }
`;
