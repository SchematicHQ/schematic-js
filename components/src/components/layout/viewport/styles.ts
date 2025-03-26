import styled from "styled-components";

import { Box } from "../../ui";

export const StyledViewport = styled(Box)
  .attrs(({ theme }) => ({
    $gridTemplateColumns: "repeat(1, minmax(300px, 1fr))",
    $viewport: {
      md: {
        $gridTemplateColumns: `repeat(${theme.numberOfColumns}, minmax(300px, 1fr))`,
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
