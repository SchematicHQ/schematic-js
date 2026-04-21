import { css, styled } from "styled-components";

import { useIsLightBackground } from "../../../hooks";

export const Toggle = styled.input.attrs({ type: "checkbox" })`
  -webkit-appearance: none;
  appearance: none;
  font: inherit;
  font-size: inherit;
  color: inherit;
  letter-spacing: inherit;
  inline-size: 3.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 1rem;
  transition: 120ms background-color ease-in-out;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }

  &:checked {
    background-color: ${({ theme }) => theme.primary};
  }

  &::before {
    content: "";
    display: block;
    clip-path: revert;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    background-color: ${({ theme }) => theme.primary};
    border-radius: 1rem;
    transform: translateX(0);
    transition: 120ms transform ease-in-out;
  }

  &:checked::before {
    transform: translateX(1.65rem);
    background-color: ${({ theme }) => theme.card.background};
  }
`;
