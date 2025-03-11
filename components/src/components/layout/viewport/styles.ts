import styled from "styled-components";
import { Box } from "../../ui";

export const StyledViewport = styled(Box)
  .attrs(({ theme }) => ({
    $gridTemplateColumns: `repeat(auto-fit, minmax(320px, 1fr))`,
    $viewport: {
      md: {
        $gridTemplateColumns: `repeat(${theme.numberOfColumns}, minmax(320px, 1fr))`,
      },
    },
  }))
  .withConfig({
    shouldForwardProp: (prop) =>
      !["$numberOfColumns", "numberOfColumns"].includes(prop),
  })`
  display: grid;

  margin-left: auto;
  margin-right: auto;
  gap: 1rem;
`;
