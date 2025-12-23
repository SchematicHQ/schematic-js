import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Flex, Icon } from "../../ui";

interface DialogHeaderProps {
  children?: React.ReactNode;
  bordered?: boolean;
  onClose?: () => void;
}

export const DialogHeader = ({
  children,
  bordered = false,
  onClose,
}: DialogHeaderProps) => {
  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      $position="sticky"
      $top={0}
      $left={0}
      $zIndex={2}
      $justifyContent={children ? "space-between" : "end"}
      $alignItems="center"
      $flexShrink={0}
      $gap="1rem"
      $padding="0.5rem 0.5rem 0.5rem 1.5rem"
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
          $padding: "1rem 0.75rem 1rem 3rem",
        },
      }}
    >
      {children}

      <Flex
        tabIndex={0}
        onClick={onClose}
        $justifyContent="center"
        $alignItems="center"
        $cursor="pointer"
        $width="2.75rem"
        $height="2.75rem"
      >
        <Icon
          name="close"
          size="xl"
          color={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)"
          }
        />
      </Flex>
    </Flex>
  );
};
