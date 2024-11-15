import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

interface PlanCardProps {
  isSelected: boolean;
  hasShadow: boolean;
}

export const PlanCard = styled.div<PlanCardProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 280px;
  max-width: calc(${100 / 3}% - 1rem);
  background-color: ${({ theme }) => theme.card.background};
  outline-width: 2px;
  outline-style: solid;
  outline-color: ${({ theme, isSelected }) =>
    isSelected ? theme.primary : "transparent"};
  border-radius: ${({ theme }) =>
    `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`};

  ${({ hasShadow }) =>
    hasShadow &&
    `
      box-shadow: 0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06);
    `}

  @media (max-width: 768px) {
    max-width: calc(100% - 2rem);
  }
`;

export const SidebarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 21.5rem;
  background-color: ${({ theme }) => theme.card.background};
  border-radius: 0 0 0.5rem;
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;
  @media (max-width: 768px) {
    width: 100%;
  }
`;

export const PlansWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  flex-grow: 1;
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

interface CheckoutStageLabelProps {
  stage: string;
}

export const CheckoutStageLabel = styled.div<CheckoutStageLabelProps>`
  font-family: ${({ theme }) => theme.typography.text.fontFamily};
  color: ${({ theme }) => theme.typography.text.color};
  font-size: 1.1rem;
  white-space: nowrap;
  font-weight: ${({ stage }) => (stage === "plan" ? 600 : 400)};

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

export const BodyWrapper = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;
  height: calc(100% - 5rem);

  @media (max-width: 768px) {
    height: auto;
    flex-direction: column;
  }
`;

interface BodyInnerWrapperProps {
  bordered: boolean;
  isLightBackground: boolean;
}

export const BodyInnerWrapper = styled.div<BodyInnerWrapperProps>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 1rem;
  flex: 1;
  overflow: auto;
  padding: 2rem 2.5rem 2rem 2.5rem;

  ${({ bordered, isLightBackground }) =>
    bordered &&
    css`
      border-bottom-width: 1px;
      border-bottom-style: solid;
      border-bottom-color: ${isLightBackground
        ? "hsla(0, 0%, 0%, 0.15)"
        : "hsla(0, 0%, 100%, 0.15)"};
    `}

  @media (max-width: 768px) {
    padding: 1.5rem;
    height: auto;
    flex-direction: column;
  }
`;

export const BodyHeadWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  .head-copy {
    justify-content: start;
    align-items: start;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.16rem;
    .head-copy {
      justify-content: center;
      align-items: center;
    }
  }
`;
