import { Container } from "./styles";

interface PlanManagerProps {
  children?: React.ReactNode;
  layout?: "merged" | "separate";
}

export const PlanManager = ({
  children,
  layout = "merged",
}: PlanManagerProps) => {
  return <Container layout={layout}>{children}</Container>;
};
