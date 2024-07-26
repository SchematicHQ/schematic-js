import { useSchematicEmbed } from "../../hooks";
import { Container } from "./styles";

export interface PlanCardProps {
  children?: React.ReactNode;
}

export const PlanCard = ({ children }: PlanCardProps) => {
  const { nodes } = useSchematicEmbed();
  const root = nodes.at(0);
  const { sectionLayout, borderRadius } = root?.props || {};

  return (
    <Container $layout={sectionLayout} $radius={borderRadius}>
      {children}
    </Container>
  );
};
