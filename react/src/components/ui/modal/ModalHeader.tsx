import { useCallback } from "react";
import { useEmbed } from "../../../hooks";
import { lighten } from "../../../utils";
import { Box, Flex, Icon } from "../";

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => {
  const { settings, setLayout } = useEmbed();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $paddingLeft="2.5rem"
      $paddingRight="2.5rem"
      $padding="0.75rem 2.5rem"
      $justifyContent="space-between"
      $alignItems="center"
      $borderBottom="1px solid #DEDEDE"
      $gap="1rem"
      $backgroundColor={lighten(settings.theme.card.background, 2)}
      $borderRadius="0.5rem 0.5rem 0 0"
    >
      {children}

      <Box $cursor="pointer" onClick={handleClose}>
        <Icon name="close" style={{ fontSize: 36, color: "#B8B8B8" }} />
      </Box>
    </Flex>
  );
};
