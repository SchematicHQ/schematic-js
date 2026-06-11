import { styled } from "styled-components";

import { Text } from "../../ui/text";

export const Markdown = styled(Text)`
  a {
    color: ${({ theme }) => theme.typography.link.color};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.primary};
      outline-offset: 2px;
    }
  }

  strong {
    font-weight: 700;
    font-variation-settings: "wght" 700;
  }

  em {
    font-style: italic;
  }
`;
