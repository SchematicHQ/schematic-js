import styled from "styled-components";
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
    .head-copy {
      justify-content: center;
      align-items: center;
    }
  }
`;
