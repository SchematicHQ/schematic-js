import styled, { css } from "styled-components";
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
      color = l > 50 ? darken(color, 7.5) : lighten(color, 7.5);
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
      const lightened = lighten(specified, 15);
      const color = specified === lightened ? darken(specified, 15) : lightened;

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
          font-size: ${15 / 16}rem;
          padding: ${12 / 16}rem 0;
          border-radius: ${6 / 16}rem;
        `;
      case "md":
        return css`
          font-size: ${17 / 16}rem;
          padding: ${16 / 16}rem 0;
          border-radius: ${8 / 16}rem;
        `;
      case "lg":
        return css`
          font-size: ${19 / 16}rem;
          padding: ${20 / 16}rem 0;
          border-radius: ${10 / 16}rem;
        `;
    }
  }}
`;
