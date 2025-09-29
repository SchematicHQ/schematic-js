import { css, styled } from "styled-components";

import { useIsLightBackground } from "../../../hooks";

export const Input = styled.input<{
  $size?: "xs" | "sm" | "md" | "lg" | "full";
  $color?: "primary" | "secondary" | "danger";
  $variant?: "filled" | "outline" | "ghost" | "text";
}>(({ theme, $size = "md", $variant = "filled" }) => {
  const isLightBackground = useIsLightBackground();

  return css`
    font-family: "Inter", sans-serif;
    font-weight: 500;
    width: 100%;
    max-width: 15rem;
    margin: 0;
    padding: 0;
    border-width: 1px;
    border-style: solid;
    border-radius: 5px;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      margin: 0.25rem;
      padding: 0 0.25rem;
    }

    ${() => {
      switch ($size) {
        case "sm": {
          return css`
            font-size: 0.875rem;
            line-height: 1.5rem;
            height: 1.5rem;
          `;
        }

        case "md": {
          return css`
            font-size: 1rem;
            line-height: 3rem;
            height: 3rem;
            padding-left: 1rem;
          `;
        }

        case "lg": {
          return css`
            font-size: 1.25rem;
            line-height: 4rem;
            height: 4rem;
            padding-left: 1.5rem;
          `;
        }

        case "full": {
          return css`
            font-size: 1rem;
            line-height: 1;
            height: 100%;
            padding-left: 1rem;
          `;
        }
      }
    }}

    ${() => {
      const color =
        $variant !== "filled" && !isLightBackground
          ? theme.typography.text.color
          : "#000000";
      const bgColor = $variant === "filled" ? "#F1F1F1" : "transparent";
      const borderColor = $variant === "text" ? "transparent" : "#CBCBCB";
      return css`
        color: ${color};
        background-color: ${bgColor};
        border-color: ${borderColor};
      `;
    }}

    &:disabled {
      color: #9ca3af80;
      background-color: #f9fafb;
      border-color: #f3f4f6;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid ${theme.primary};
      outline-offset: 2px;
    }

    &::placeholder {
      color: ${isLightBackground
        ? "hsla(0, 0%, 0%, 0.375)"
        : "hsla(0, 0%, 100%, 0.375)"};
    }
  `;
});
