import { Container } from "./styles";

export interface PlanCardProps {
  children?: React.ReactNode;
  layout?: "merged" | "separate";
}

export const PlanCard = ({ children, layout = "merged" }: PlanCardProps) => {
  return <Container $layout={layout}>{children}</Container>;
};
