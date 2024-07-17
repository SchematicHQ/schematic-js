import styled, { css } from "styled-components";
import { ButtonProps } from "./Button";

export const Button = styled.button<ButtonProps>`
  appearance: none;
  font-family: Manrope, Arial, Helvetica, sans-serif;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  transition-property: all;
  border: 1px solid transparent;
  border-radius: 0.5rem;

  &:hover {
    cursor: pointer;
  }

  ${({ size = "md" }) => {
    switch (size) {
      case "sm":
        return css`
          padding: 7px 1.75rem;
        `;
      case "md":
        return css`
          padding: 9px 1.5rem;
        `;
      case "lg":
        return css`
          font-size: 1rem;
          line-height: 1.5rem;
          padding: 9px 1.75rem;
        `;
    }
  }}

  ${({ color = "white" }) => {
    switch (color) {
      case "blue":
        return css`
          color: white;
          background-color: #60a5fa;
          border-color: #60a5fa;

          &:hover {
            color: white;
            background-color: black;
          }
        `;
      case "red":
        return css`
          color: #ef4444;
          background-color: transparent;
          border-color: #cbd5e1;

          &:hover {
            color: white;
            background-color: #ef4444;
            border-color: #ef4444;
          }
        `;
      case "white":
        return css`
          color: black;
          background-color: white;
          border-color: #d1d5db;

          &:hover {
            color: white;
            background-color: #60a5fa;
          }

          i {
            color: #60a5fa;
          }

          &:hover {
            i {
              color: white;
            }
          }
        `;
      case "black":
        return css`
          color: white;
          background-color: black;
        `;
    }
  }}

  &-disabled {
    color: #9ca3af80;
    background-color: #f9fafb;
    border-color: #f3f4f6;
    box-shadow: 0 0 #0000 !important;
    cursor: not-allowed !important;
  }

  .toggle-group {
    display: inline-flex;
    align-items: center;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;

    > * + * {
      margin-left: 0.5rem;
    }
  }
`;

/* .toggle-group {
  @apply border border-gray-300 rounded-md space-x-2 inline-flex items-center;

  button {
    @apply transition-all border border-solid border-transparent font-display text-sm hover:cursor-pointer text-gray-400;
    @apply rounded-lg appearance-none !important;

    &[data-state="on"] {
      @apply bg-black text-white font-semibold;
    }

    &[data-state="off"] {
    }
  }

  &-sm {
    @apply p-[2px] px-1;

    button {
      @apply px-4 py-[6px];
    }
  }

  &-md {
    button {
      @apply px-6 py-[9px];
    }
  }

  &-lg {
    button {
      @apply px-7 py-[14px] text-base;
    }
  }
} */
