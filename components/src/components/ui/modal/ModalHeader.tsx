import { useCallback } from "react";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Button, Flex, Icon } from "../../ui";

interface ModalHeaderProps {
  children?: React.ReactNode;
  bordered?: boolean;
  onClose?: () => void;
}

export const ModalHeader = ({
  children,
  bordered = false,
  onClose,
}: ModalHeaderProps) => {
  const { settings, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $position="sticky"
      $top={0}
      $left={0}
      $zIndex={1}
      $justifyContent={children ? "space-between" : "end"}
      $alignItems="center"
      $flexShrink={0}
      $gap="1rem"
      $height="3.5rem"
      $padding="0 1rem"
      $backgroundColor={settings.theme.card.background}
      {...(bordered && {
        $borderWidth: "0",
        $borderBottomWidth: "1px",
        $borderBottomStyle: "solid",
        $borderBottomColor: isLightBackground
          ? "hsla(0, 0%, 0%, 0.15)"
          : "hsla(0, 0%, 100%, 0.15)",
      })}
      $viewport={{
        md: {
          $height: "5rem",
          $padding: "0 0.75rem 0 3rem",
        },
      }}
    >
      {children}

      <Button
        onClick={handleClose}
        style={{ cursor: "pointer", padding: "0 0.5rem 0 0" }}
        $color="secondary"
        $variant="text"
      >
        <Icon
          name="close"
          style={{
            fontSize: 36,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)",
          }}
        />
      </Button>
    </Flex>
  );
};
