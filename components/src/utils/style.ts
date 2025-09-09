import type CSS from "csstype";
import { css } from "styled-components";

type Key = keyof CSS.PropertiesHyphen;
type Value = string | number;

export function attr(key: Key, value?: Value) {
  return (
    typeof value !== "undefined" &&
    css`
      ${key}: ${value};
    `
  );
}
