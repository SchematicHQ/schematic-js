import { Icon, IconNameTypes } from "./Icon";
import { Container } from "./styles";

interface IconRoundProps {
  name: IconNameTypes;
  style?: "outline" | "filled";
  size?: "tn" | "sm" | "md" | "lg";
}

export const IconRound = ({
  name,
  style = "filled",
  size = "md",
}: IconRoundProps) => {
  return (
    <Container $size={size} $style={style}>
      <Icon name={name} />
    </Container>
  );
};
