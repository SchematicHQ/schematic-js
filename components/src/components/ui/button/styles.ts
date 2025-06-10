import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { darken, hexToHSL, hslToHex, lighten } from "../../../utils";
import { Text } from "../../ui";
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
  $fullWidth?: boolean;
  $isLoading?: boolean;
  $alignment?: ButtonAlignment;
  $selfAlignment?: ButtonSelfAlignment;
}

export const Button = styled.button<ButtonProps>(
  ({
    theme,
    disabled = false,
    $color = "primary",
    $size = "md",
    $variant = "filled",
    $fullWidth = false,
    $isLoading = false,
    $alignment = "center",
    $selfAlignment,
  }) => {
    return css`
      appearance: none;
      font-family: "Public Sans", sans-serif;
      font-weight: 500;
      line-height: 1;
      display: flex;
      justify-content: ${$alignment};
      align-items: center;
      ${() =>
        $selfAlignment &&
        css`
          align-self: ${$selfAlignment};
        `}
      gap: 0.5rem;
      width: ${$fullWidth ? "100%" : "fit-content"};
      border: 1px solid transparent;
      transition: 0.1s;

      ${function sizeStyles() {
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

      ${function colorStyles() {
        const { l } = hexToHSL(theme[$color]);

        let color = l > 50 ? "#000000" : "#FFFFFF";
        if (disabled) {
          color = l > 50 ? lighten(color, 42.5) : darken(color, 42.5);
        }

        return css`
          color: ${color};

          ${Text}, ${Icon} {
            color: ${color};
          }
        `;
      }}

      ${function variantStyles() {
        const { l } = hexToHSL(theme.card.background);

        let color = theme[$color];
        if (disabled) {
          color = hslToHex({ h: 0, s: 0, l });
          color = l > 50 ? darken(color, 0.075) : lighten(color, 0.15);
        }

        if ($variant === "outline") {
          return css`
            color: ${color};
            background-color: transparent;
            border-color: ${color};

            ${Text}, ${Icon} {
              color: ${color};
            }
          `;
        }

        if ($variant === "ghost") {
          return css`
            color: ${color};
            background-color: transparent;
            border-color: ${l > 50
              ? darken(theme.card.background, 0.2)
              : lighten(theme.card.background, 0.2)};

            ${Text}, ${Icon} {
              color: ${color};
            }
          `;
        }

        if ($variant === "text") {
          return css`
            color: ${color};
            background-color: transparent;
            border-color: transparent;

            ${Text}, ${Icon} {
              color: ${color};
            }
          `;
        }

        return css`
          background-color: ${color};
          border-color: ${color};
        `;
      }}

      &:hover {
        cursor: pointer;
      }

      &:focus-visible {
        outline: 2px solid ${theme.primary};
        outline-offset: 2px;
      }

      &::before {
        content: "";
        ${loaderStyles({ $color: theme[$color], $size, $isLoading })}
      }

      &:disabled {
        color: #9ca3af80;
        background-color: #f9fafb;
        border-color: #f3f4f6;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        ${function hoverStyles() {
          const { l } = hexToHSL(theme[$color]);
          const color = l > 50 ? "#000000" : "#FFFFFF";

          const specified = theme[$color];
          const lightened = lighten(specified, 0.15);
          const bgColor =
            specified === lightened ? darken(specified, 0.15) : lightened;

          if ($variant === "filled") {
            return css`
              background-color: ${bgColor};
              border-color: ${bgColor};
            `;
          }

          if ($variant === "outline") {
            return css`
              color: ${color};
              background-color: ${bgColor};
              border-color: ${bgColor};

              ${Text}, ${Icon} {
                color: ${color};
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

          if ($variant === "text") {
            return css`
              text-decoration: underline;
            `;
          }
        }}
      }
    `;
  },
);
