import { css } from "styled-components";

import { attr } from "./style";

test("`attr` should do nothing if `value` is not provided", () => {
  expect(attr("background")?.join("").trim()).toBeUndefined();
});

test("`attr` should concatenate a css property and provided value to a css string", () => {
  expect(attr("background", "white")?.join("").trim()).toBe(
    css`
      background: white;
    `
      .join("")
      .trim(),
  );
});
