import { styled } from "styled-components";

export const Checkbox = styled.input.attrs({ type: "checkbox" })`
  appearance: none;
  flex-shrink: 0;
  margin: 0;
  inline-size: 22px;
  block-size: 22px;
  border-radius: 0.375rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    120ms background-color ease-in-out,
    120ms border-color ease-in-out;
  background-color: ${({ theme }) => theme.card.background};
  border: 1px solid
    color-mix(
      in oklch,
      ${({ theme }) => theme.typography.text.color} 25%,
      ${({ theme }) => theme.card.background}
    );

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }

  &:checked {
    background-color: ${({ theme }) => theme.primary};
    border-color: ${({ theme }) => theme.primary};
  }

  &::before {
    content: "";
    inline-size: 6px;
    block-size: 11px;
    margin-block-end: 2px;
    border: solid ${({ theme }) => theme.card.background};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    transition: 120ms transform ease-in-out;
  }

  &:checked::before {
    transform: rotate(45deg) scale(1);
  }
`;
