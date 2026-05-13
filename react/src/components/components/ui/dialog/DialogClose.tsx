import { useIsLightBackground } from "../../../hooks";
import { Flex, Icon, type BoxProps } from "../../ui";

interface DialogCloseProps extends BoxProps {
  onClose?: () => void;
}

export const DialogClose = ({ onClose, ...rest }: DialogCloseProps) => {
  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      tabIndex={0}
      onClick={onClose}
      $justifyContent="center"
      $alignItems="center"
      $cursor="pointer"
      $width="2.75rem"
      $height="2.75rem"
      {...rest}
    >
      <Icon
        name="close"
        size="2xl"
        color={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.275)"
            : "hsla(0, 0%, 100%, 0.275)"
        }
      />
    </Flex>
  );
};
