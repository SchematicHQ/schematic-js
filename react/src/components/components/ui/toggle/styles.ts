import { styled } from "styled-components";

export const Toggle = styled.input.attrs({ type: "checkbox" })`
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
  border-radius: 1rem;
  transition: 120ms background-color ease-in-out;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }

  &:checked {
    background-color: ${({ theme }) => theme.primary};
    border: 1px solid ${({ theme }) => theme.primary};
  }

  &:not(:checked) {
    background-color: color-mix(
      in oklch,
      ${({ theme }) => theme.typography.text.color} 25%,
      ${({ theme }) => theme.card.background}
    );
    border: 1px solid
      color-mix(
        in oklch,
        ${({ theme }) => theme.typography.text.color} 25%,
        ${({ theme }) => theme.card.background}
      );
  }

  &::before {
    content: "";
    display: block;
    clip-path: revert;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    background-color: ${({ theme }) => theme.card.background};
    border-radius: 1rem;
    transform: translateX(0);
    transition: 120ms transform ease-in-out;
  }

  &:checked::before {
    transform: translateX(1.65rem);
  }
`;
