import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL } from "../../../utils";
import { Box } from "../../ui";

export const Element = styled(Box)``;

interface StyledCardProps {
  $sectionLayout?: "merged" | "separate";
  $borderRadius?: number;
  $color?: string;
  $padding?: number;
  $shadow?: boolean;
}

export const StyledCard = styled.div<StyledCardProps>(
  ({
    theme,
    $sectionLayout = "merged",
    $borderRadius = 8,
    $padding = 48,
    $shadow = true,
  }) => {
    const { l } = hexToHSL(theme.card.background);
    const borderColor =
      l > 50 ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)";
    const borderRadius = `${$borderRadius / TEXT_BASE_SIZE}rem`;
    const boxShadow = "0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A";
    const Selector = $sectionLayout === "merged" ? "&" : Element;

    return css`
      font-size: ${TEXT_BASE_SIZE}px;
      box-sizing: border-box;

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      ${Selector} {
        color: ${theme.typography.text.color};
        background: ${theme.card.background};
        border-radius: ${borderRadius};
        ${$shadow && `box-shadow: ${boxShadow};`}
      }

      ${Element} {
        padding: ${($padding * 0.75) / TEXT_BASE_SIZE}rem
          ${$padding / TEXT_BASE_SIZE}rem;

        &:not(:last-child) {
          ${$sectionLayout === "merged"
            ? css`
                border-bottom: 1px solid ${borderColor};
              `
            : css`
                margin-bottom: 1rem;
              `}
        }
      }
    `;
  },
);
