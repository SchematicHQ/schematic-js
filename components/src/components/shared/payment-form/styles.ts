import styled from "styled-components";

export const Label = styled.label`
  display: flex;
  margin-bottom: 0.75rem;
  font-family: "Public Sans", system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 400;
  transition:
    transform 0.5s cubic-bezier(0.19, 1, 0.22, 1),
    opacity 0.5s cubic-bezier(0.19, 1, 0.22, 1);
  color: #cdd6f4;
  touch-action: manipulation;
`;

export const Input = styled.input`
  padding: 0.75rem;
  background-color: white;
  border-radius: 0.5rem;
  transition:
    background 0.15s ease,
    border 0.15s ease,
    box-shadow 0.15s ease,
    color 0.15s ease;
  border: 1px solid #e6e6e6;
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.03),
    0 3px 6px rgba(0, 0, 0, 0.02);

  appearance: none;
  color: inherit;
  filter: none;
  font-family: "Public Sans", system-ui, sans-serif;
  font-size: 1rem;
  letter-spacing: inherit;
  outline-offset: 0;
  outline-width: 2px;

  animation: native-autofill-out 1ms;
  color-scheme: light;
  display: block;
  width: 100%;
  touch-action: manipulation;

  &:focus {
    outline: 0;
    border-color: #0570de;
    boxshadow:
      0 1px 1px rgba(0, 0, 0, 0.03),
      0 3px 6px rgba(0, 0, 0, 0.02),
      0 0 0 3px hsla(210, 96%, 45%, 25%),
      0 1px 1px 0 rgba(0, 0, 0, 0.08);
  }
`;
