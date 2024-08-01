import styled, { css } from "styled-components";
import { lighten, darken } from "../../../utils";
import { Button } from "../../ui/button";

export const StyledButton = styled(Button)<{
  $size?: "sm" | "md" | "lg";
  $color?: string;
  $backgroundColor?: string;
}>`
  font-family: "Public Sans", sans-serif;
  font-weight: 500;
  text-align: center;
  width: 100%;
  color: ${({ $color, theme }) => $color || theme.text};
  ${({ $backgroundColor, theme }) => {
    const color = $backgroundColor || theme.button;
    return css`
      background-color: ${color};
      border-color: ${color};
    `;
  }}

  &:hover {
    ${({ $backgroundColor, theme }) => {
      const specified = $backgroundColor || theme.button;
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
