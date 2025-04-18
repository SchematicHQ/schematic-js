import type CSS from "csstype";
import { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../const";

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

attr.px = function propAsPx(key: Key, value?: Value) {
  return (
    typeof value !== "undefined" &&
    css`
      ${key}: ${typeof value === "number" ? `${value}px` : value};
    `
  );
};

attr.rem = function propAsRem(key: Key, value?: Value) {
  return (
    typeof value !== "undefined" &&
    css`
      ${key}: ${typeof value === "number"
        ? `${value / TEXT_BASE_SIZE}rem`
        : value};
    `
  );
};
