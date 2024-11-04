import { ReactNode, useCallback } from "react";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Box, Icon } from "../../ui";
import { Wrapper } from "./styles";

interface ModalHeaderProps {
  children?: ReactNode;
  bordered?: boolean;
  onClose?: () => void;
}

export const ModalHeader = ({
  children,
  bordered = false,
  onClose,
}: ModalHeaderProps) => {
  const { setLayout } = useEmbed();
  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Wrapper
      bordered={bordered}
      isLightBackground={isLightBackground}
      hasChildren={!!children}
    >
      {children}

      <Box $cursor="pointer" onClick={handleClose}>
        <Icon
          name="close"
          style={{
            fontSize: 36,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)",
          }}
        />
      </Box>
    </Wrapper>
  );
};
