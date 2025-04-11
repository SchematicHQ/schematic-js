import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { darken, hexToHSL, hslToHex, lighten } from "../../../utils";
import { Icon } from "../icon/styles";
import { Button, ButtonSizeTypes } from "./Button";

export type EmbedButtonColor = "primary" | "secondary" | "danger";
export type EmbedButtonVariant = "filled" | "outline" | "ghost" | "text";
export type EmbedButtonAlignment = "start" | "center" | "end";
export type EmbedButtonSelfAlignment = "start" | "center" | "end";

export const EmbedButton = styled(Button)<{
  $size?: ButtonSizeTypes;
  $color?: EmbedButtonColor;
  $variant?: EmbedButtonVariant;
  $alignment?: EmbedButtonAlignment;
  $selfAlignment?: EmbedButtonSelfAlignment;
  $fullWidth?: boolean;
}>`
  font-family: "Public Sans", sans-serif;
  font-weight: 500;
  text-align: center;
  display: flex;
  align-items: center;

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

      ${Icon} {
        color: ${textColor};
      }
    `;
  }};

  ${({ disabled, $color = "primary", theme, $variant = "filled" }) => {
    const { l } = hexToHSL(theme.card.background);

    let color = theme[$color];
    if (disabled) {
      color = hslToHex({ h: 0, s: 0, l });
      color = l > 50 ? darken(color, 0.075) : lighten(color, 0.15);
    }

    if ($variant === "outline") {
      return css`
        background-color: transparent;
        border-color: ${color};
        color: ${color};

        ${Icon} {
          color: ${color};
        }
      `;
    }

    if ($variant === "ghost") {
      return css`
        background-color: transparent;
        border-color: #cbcbcb;
        color: ${color};

        ${Icon} {
          color: ${color};
        }
      `;
    }

    if ($variant === "text") {
      return css`
        background-color: transparent;
        border-color: transparent;
        color: ${color};

        ${Icon} {
          color: ${color};
        }
      `;
    }

    return css`
      background-color: ${color};
      border-color: ${color};
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

      if ($variant === "filled") {
        return css`
          background-color: ${color};
          border-color: ${color};
        `;
      }

      if ($variant === "outline") {
        return css`
          background-color: ${color};
          border-color: ${color};
          color: ${textColor};

          ${Icon} {
            color: ${textColor};
          }
        `;
      }

      if ($variant === "ghost") {
        return css`
          border-color: ${darken("#CBCBCB", 0.075)};
          box-shadow: 0 1px 2px ${lighten("#CBCBCB", 0.125)};
        `;
      }
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

  ${({ $alignment = "center" }) => {
    switch ($alignment) {
      case "start":
        return css`
          justify-content: start;
        `;
      case "end":
        return css`
          justify-content: end;
        `;
      case "center":
      default:
        return css`
          justify-content: center;
        `;
    }
  }}

  ${({ $selfAlignment = "center" }) => {
    switch ($selfAlignment) {
      case "start":
        return css`
          align-self: start;
        `;
      case "end":
        return css`
          align-self: end;
        `;
      case "center":
      default:
        return css`
          align-self: center;
        `;
    }
  }}

  ${({ $fullWidth = true }) => {
    if ($fullWidth) {
      return css`
        width: 100%;
        padding: 0;
      `;
    }

    return css`
      padding-left: 1rem;
      padding-right: 1rem;
    `;
  }}
`;
