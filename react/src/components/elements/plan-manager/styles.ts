import styled, { css } from "styled-components";
import { hexToHSL, lighten, darken } from "../../../utils";
import { Button, Text } from "../../ui";

export const StyledButton = styled(Button)<{
  $size?: "sm" | "md" | "lg";
  $color?: "primary" | "secondary" | "tertiary";
}>`
  font-family: "Public Sans", sans-serif;
  font-weight: 500;
  text-align: center;
  width: 100%;
  ${({ $color = "primary", theme }) => {
    const { l } = hexToHSL(theme[$color]);
    const color = l > 50 ? "#000000" : "#FFFFFF";
    return css`
      color: ${color};

      ${Text} {
        color: ${color};
      }
    `;
  }};

  ${({ $color = "primary", theme }) => {
    const color = theme[$color];
    return css`
      background-color: ${color};
      border-color: ${color};
    `;
  }}

  &:hover {
    ${({ $color = "primary", theme }) => {
      const specified = theme[$color];
      const lightened = lighten(specified, 15);
      const color = specified === lightened ? darken(specified, 15) : lightened;

      return css`
        background-color: ${color};
        border-color: ${color};
      `;
    }}
  }

  ${({ $size = "md" }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${15 / 16}rem;
          padding: ${12 / 16}rem 0;
          border-radius: ${8 / 16}rem;
        `;
      case "md":
        return css`
          font-size: ${17 / 16}rem;
          padding: ${16 / 16}rem 0;
          border-radius: ${10 / 16}rem;
        `;
      case "lg":
        return css`
          font-size: ${19 / 16}rem;
          padding: ${20 / 16}rem 0;
          border-radius: ${12 / 16}rem;
        `;
    }
  }}
`;
