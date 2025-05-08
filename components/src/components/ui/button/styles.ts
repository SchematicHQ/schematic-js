import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { darken, hexToHSL, hslToHex, lighten } from "../../../utils";
import { Icon } from "../icon/styles";
import { loaderStyles } from "../loader";

export type ButtonColor = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "filled" | "outline" | "ghost" | "text";
export type ButtonAlignment = "start" | "center" | "end";
export type ButtonSelfAlignment = "start" | "center" | "end";

export interface ButtonProps {
  $color?: ButtonColor;
  $size?: ButtonSize;
  $variant?: ButtonVariant;
  $isLoading?: boolean;
  $alignment?: ButtonAlignment;
  $selfAlignment?: ButtonSelfAlignment;
  $fullWidth?: boolean;
}

export const Button = styled.button<ButtonProps>(
  ({
    $color = "primary",
    $size = "md",
    $variant = "filled",
    $isLoading = false,
    $alignment = "center",
    $selfAlignment = "center",
    $fullWidth = true,
    disabled,
    theme,
  }) => {
    const themeColor = theme[$color];

    return css`
      appearance: none;
      font-family: "Public Sans", sans-serif;
      font-weight: 500;
      line-height: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid transparent;
      transition: all 0.1s;

      &:hover {
        cursor: pointer;
      }

      &::before {
        content: "";
        ${loaderStyles({ $color: themeColor, $size, $isLoading })}
      }

      ${() => {
        const { l } = hexToHSL(themeColor);

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

      ${() => {
        const { l } = hexToHSL(theme.card.background);

        let color = themeColor;
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
            border-color: ${l > 50
              ? darken(theme.card.background, 0.2)
              : lighten(theme.card.background, 0.2)};
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

            &:hover {
              text-decoration: underline;
            }

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

      &-disabled {
        color: #9ca3af80;
        background-color: #f9fafb;
        border-color: #f3f4f6;
        cursor: not-allowed;
      }

      &:disabled:hover {
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        ${() => {
          const specified = themeColor;
          const lightened = lighten(specified, 0.15);
          const color =
            specified === lightened ? darken(specified, 0.15) : lightened;

          const { l } = hexToHSL(themeColor);
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
            const { l } = hexToHSL(theme.card.background);

            return css`
              border-color: ${l > 50
                ? darken(theme.card.background, 0.125)
                : lighten(theme.card.background, 0.125)};
              box-shadow: 0 1px 2px
                ${l > 50
                  ? darken(theme.card.background, 0.075)
                  : lighten(theme.card.background, 0.075)};
            `;
          }
        }}
      }

      ${() => {
        switch ($size) {
          case "sm":
            return css`
              font-size: ${15 / TEXT_BASE_SIZE}rem;
              height: ${40 / TEXT_BASE_SIZE}rem;
              padding: ${7 / TEXT_BASE_SIZE}rem ${20 / TEXT_BASE_SIZE}rem;
              border-radius: ${6 / TEXT_BASE_SIZE}rem;
            `;
          case "md":
            return css`
              font-size: ${17 / TEXT_BASE_SIZE}rem;
              height: ${52 / TEXT_BASE_SIZE}rem;
              padding: ${8 / TEXT_BASE_SIZE}rem ${24 / TEXT_BASE_SIZE}rem;
              border-radius: ${8 / TEXT_BASE_SIZE}rem;
            `;
          case "lg":
            return css`
              font-size: ${19 / TEXT_BASE_SIZE}rem;
              height: ${64 / TEXT_BASE_SIZE}rem;
              padding: ${9 / TEXT_BASE_SIZE}rem ${28 / TEXT_BASE_SIZE}rem;
              border-radius: ${10 / TEXT_BASE_SIZE}rem;
            `;
        }
      }}

      ${() => {
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

    ${() => {
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

    ${() => {
        if ($fullWidth) {
          return css`
            width: 100%;
            padding: 0;
          `;
        }

        return css`
          width: fit-content;
        `;
      }}
    `;
  },
);
