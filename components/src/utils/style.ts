import type CSS from "csstype";
import { css } from "styled-components";

type Key = keyof CSS.PropertiesHyphen;
type Value = string | number;

export function attr(key: Key, value?: Value) {
  if (typeof value !== "undefined") {
    return css`
      ${key}: ${value};
    `;
  }
}
