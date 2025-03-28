import styled from "styled-components";

import { Box } from "../../ui";

export const StyledViewport = styled(Box)
  .withConfig({
    shouldForwardProp: (prop) =>
      !["$numberOfColumns", "numberOfColumns"].includes(prop),
  })
  .attrs(({ theme }) => ({
    $gridTemplateColumns: "repeat(1, minmax(300px, 1fr))",
    $viewport: {
      md: {
        $gridTemplateColumns: `repeat(${theme.numberOfColumns}, minmax(300px, 1fr))`,
      },
    },
  }))`
  display: grid;
  gap: 1rem;
  margin-left: auto;
  margin-right: auto;
`;
