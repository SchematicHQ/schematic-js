import type CSS from "csstype";
import styled, { css, type RuleSet } from "styled-components";

import type { ComponentProps, TransientCSSProperties } from "../../../types";
import { attr, camelToHyphen } from "../../../utils";

export type BoxProps = ComponentProps & {
  $viewport?: {
    sm?: TransientCSSProperties;
    md?: TransientCSSProperties;
    lg?: TransientCSSProperties;
    xl?: TransientCSSProperties;
    "2xl"?: TransientCSSProperties;
    [key: string]: TransientCSSProperties | undefined;
  };
};

export const Box = styled.div<BoxProps>((props) => {
  function reducer(acc: RuleSet, [key, value]: [string, string | number]) {
    if (key.startsWith("$") && !["$viewport"].includes(key)) {
      acc.push(
        // keys should always be CSS properties
        attr(camelToHyphen(key.slice(1)) as keyof CSS.PropertiesHyphen, value),
      );
    }

    return acc;
  }

  const styles = Object.entries(props).reduce(reducer, [
    css`
      &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.primary};
      }
    `,
  ]);

  for (const [key, value] of Object.entries(props.$viewport || {})) {
    styles.push(css`
      ${{
        sm: "@container (min-width: 640px)",
        md: "@container (min-width: 768px)",
        lg: "@container (min-width: 1024px)",
        xl: "@container (min-width: 1280px)",
        "2xl": "@container (min-width: 1536px)",
      }[key] || key} {
        ${Object.entries(value || {}).reduce(reducer, [])}
      }
    `);
  }

  return styles;
});

export const TransitionBox = styled(Box)`
  height: auto;
  opacity: 1;
  transition:
    height 0.1s ease-in,
    opacity 0.1s ease-out;

  @starting-style {
    height: 0;
    opacity: 0;
  }
`;
