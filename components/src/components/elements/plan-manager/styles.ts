import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL, hslToHex, lighten, darken } from "../../../utils";
import { Button, Text } from "../../ui";

export const StyledButton = styled(Button)<{
  $size?: "sm" | "md" | "lg";
  $color?: "primary" | "secondary" | "tertiary";
  $variant?: "outline" | "filled";
}>`
  font-family: "Public Sans", sans-serif;
  font-weight: 500;
  text-align: center;
  width: 100%;
  padding: 0;

  ${({ disabled, $color = "primary", theme }) => {
    const { l } = hexToHSL(theme[$color]);

    let textColor;
    let colorFn;
    if (l > 50) {
      textColor = "#000000";
      colorFn = lighten;
    } else {
      textColor = "#FFFFFF";
      colorFn = darken;
    }

    if (disabled) {
      textColor = colorFn(textColor, 42.5);
    }

    return css`
      color: ${textColor};

      ${Text} {
        color: ${textColor};
      }
    `;
  }};

  ${({ disabled, $color = "primary", theme, $variant = "filled" }) => {
    let color = theme[$color];
    if (disabled) {
      const { l } = hexToHSL(theme.card.background);
      color = hslToHex({ h: 0, s: 0, l });
      color = l > 50 ? darken(color, 0.075) : lighten(color, 0.15);
    }

    return $variant === "filled"
      ? css`
          background-color: ${color};
          border-color: ${color};
        `
      : css`
          background-color: transparent;
          border-color: ${color};
          color: ${color};

          ${Text} {
            color: ${color};
          }
        `;
  }}

  &:disabled:hover {
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    ${({ $color = "primary", theme, $variant = "filled" }) => {
      const specified = theme[$color];
      const lightened = lighten(specified, 0.15);
      const color =
        specified === lightened ? darken(specified, 0.15) : lightened;

      const { l } = hexToHSL(theme[$color]);
      const textColor = l > 50 ? "#000000" : "#FFFFFF";

      return $variant === "filled"
        ? css`
            background-color: ${color};
            border-color: ${color};
          `
        : css`
            background-color: ${color};
            border-color: ${color};
            color: ${textColor};

            ${Text} {
              color: ${textColor};
            }
          `;
    }}
  }

  ${({ $size = "md" }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${15 / TEXT_BASE_SIZE}rem;
          height: ${40 / TEXT_BASE_SIZE}rem;
          border-radius: ${6 / TEXT_BASE_SIZE}rem;
        `;
      case "md":
        return css`
          font-size: ${17 / TEXT_BASE_SIZE}rem;
          height: ${52 / TEXT_BASE_SIZE}rem;
          border-radius: ${8 / TEXT_BASE_SIZE}rem;
        `;
      case "lg":
        return css`
          font-size: ${19 / TEXT_BASE_SIZE}rem;
          height: ${64 / TEXT_BASE_SIZE}rem;
          border-radius: ${10 / TEXT_BASE_SIZE}rem;
        `;
    }
  }}
`;
