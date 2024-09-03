import styled, { css } from "styled-components";
import { hexToHSL, lighten, darken } from "../../../utils";
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

  ${({ $color = "primary", theme }) => {
    const { l } = hexToHSL(theme[$color]);
    const textColor = l > 50 ? "#000000" : "#FFFFFF";
    return css`
      color: ${textColor};

      ${Text} {
        color: ${textColor};
      }
    `;
  }};

  ${({ $color = "primary", theme, $variant = "filled" }) => {
    const color = theme[$color];
    return $variant === "filled"
      ? css`
          background-color: ${color};
          border-color: ${color};
        `
      : css`
          background-color: transparent;
          border-color: #d2d2d2;
          color: #194bfb;
          ${Text} {
            color: #194bfb;
          }
        `;
  }}

  &:hover {
    ${({ $color = "primary", theme, $variant = "filled" }) => {
      const specified = theme[$color];
      const lightened = lighten(specified, 15);
      const color = specified === lightened ? darken(specified, 15) : lightened;

      return $variant === "filled"
        ? css`
            background-color: ${color};
            border-color: ${color};
          `
        : css`
            background-color: ${color};
            border-color: ${color};
            color: #ffffff;
            ${Text} {
              color: #ffffff;
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
