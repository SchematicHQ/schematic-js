import CSS from "csstype";
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
        // keys will always be CSS properties
        attr(camelToHyphen(key.slice(1)) as keyof CSS.PropertiesHyphen, value),
      );
    }

    return acc;
  }

  const styles = Object.entries(props).reduce(reducer, []);

  for (const [key, value] of Object.entries(props.$viewport || {})) {
    styles.push(css`
      ${{
        sm: "@media (min-width: 640px)",
        md: "@media (min-width: 768px)",
        lg: "@media (min-width: 1024px)",
        xl: "@media (min-width: 1280px)",
        "2xl": "@media (min-width: 1536px)",
      }[key] || key} {
        ${Object.entries(value || {}).reduce(reducer, [])}
      }
    `);
  }

  return styles;
});
