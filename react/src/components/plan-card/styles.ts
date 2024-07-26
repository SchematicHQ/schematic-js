import styled, { css } from "styled-components";
import { Container as UIContainer } from "../container";

export const Container = styled(UIContainer)<{
  $layout?: "merged" | "separate";
  $radius?: number;
}>`
  ${({ $layout = "merged", $radius = 8 }) =>
    $layout === "merged"
      ? css`
          > :first-child {
            border-top-left-radius: ${$radius / 16}rem;
            border-top-right-radius: ${$radius / 16}rem;
          }

          > :last-child {
            border-bottom-left-radius: ${$radius / 16}rem;
            border-bottom-right-radius: ${$radius / 16}rem;
          }

          > :not(:last-child) {
            border-bottom: 1px solid #eaeaea;
          }
        `
      : css`
          > :not(:last-child) {
            margin-bottom: 2rem;
          }

          > * {
            border-radius: ${$radius / 16}rem;
          }
        `}
`;
