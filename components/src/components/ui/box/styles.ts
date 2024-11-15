import styled, { css, type RuleSet } from "styled-components";
import CSS from "csstype";
import { camelToHyphen, attr } from "../../../utils";
import type { ComponentProps, TransientCSSProperties } from "../../../types";

export type BoxProps = ComponentProps & {
  $viewport?: {
    sm?: TransientCSSProperties;
    md?: TransientCSSProperties;
    lg?: TransientCSSProperties;
    [key: string]: TransientCSSProperties | undefined;
  };
};

export const Box = styled.div<BoxProps>((props) => {
  function reducer(acc: RuleSet, [key, value]: [string, string | number]) {
    if (key.startsWith("$") && key !== "$viewport") {
      acc.push(
        // keys will always be CSS properties
        attr(camelToHyphen(key.slice(1)) as keyof CSS.PropertiesHyphen, value),
      );
    }

    return acc;
  }

  const styles = Object.entries(props).reduce(reducer, []);
  if (!props.$viewport) {
    return styles;
  }

  const { sm, md, lg, ...others } = props.$viewport || {};

  let rules = Object.entries(props.$viewport?.sm || {});
  if (rules.length) {
    styles.push(css`
      @media (max-width: 767px) {
        ${rules.reduce(reducer, [])}
      }
    `);
  }

  rules = Object.entries(props.$viewport?.md || {});
  if (rules.length) {
    styles.push(css`
      @media (min-width: 768px) and (max-width: 1279px) {
        ${rules.reduce(reducer, [])}
      }
    `);
  }

  rules = Object.entries(props.$viewport?.lg || {});
  if (rules.length) {
    styles.push(css`
      @media (min-width: 1280px) {
        ${rules.reduce(reducer, [])}
      }
    `);
  }

  Object.keys(others).forEach((key) => {
    rules = Object.entries(props.$viewport?.[key] || {});
    if (rules.length) {
      styles.push(css`
        ${[key]} {
          ${rules.reduce(reducer, [])}
        }
      `);
      return;
    }
  });

  return styles;
});
