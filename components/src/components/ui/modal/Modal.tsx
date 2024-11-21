import { useCallback } from "react";
import { useTheme } from "styled-components";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Flex } from "../../ui";
import { Container } from "./styles";

interface ModalProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement>;
  size?: "sm" | "md" | "lg" | "auto";
  top?: number;
  onClose?: () => void;
}

export const Modal = ({
  children,
  contentRef,
  size = "auto",
  top = 0,
  onClose,
  ...rest
}: ModalProps) => {
  const theme = useTheme();

  const { setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Container
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          handleClose();
        }
      }}
      {...rest}
      $position="absolute"
      $top="50%"
      $left="50%"
      $zIndex="999999"
      $transform="translate(-50%, -50%)"
      $width="100%"
      $height="100%"
      $marginTop={`${top}px`}
      $backgroundColor={
        isLightBackground ? "hsla(0, 0%, 85%, 0.8)" : "hsla(0, 0%, 0%, 0.8)"
      }
      $overflow="hidden"
      $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
      $scrollbarWidth="thin"
      $scrollbarGutter="stable both-edges"
    >
      <Flex
        ref={contentRef}
        $position="relative"
        $top="50%"
        $left="50%"
        $transform="translate(-50%, -50%)"
        $flexDirection="column"
        $overflow="auto"
        $width="100%"
        $height="100vh"
        $backgroundColor={theme.card.background}
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        role="dialog"
        aria-modal="true"
        $viewport={{
          md: {
            ...(size === "auto"
              ? { $width: "fit-content", $height: "fit-content" }
              : {
                  $width: "100%",
                  ...(size === "lg"
                    ? { $height: "100%" }
                    : { $height: "fit-content" }),
                  $maxWidth:
                    size === "sm"
                      ? "480px"
                      : size === "md"
                        ? "688px"
                        : "1356px",
                  $maxHeight: "860px",
                }),
            $borderRadius: "0.5rem",
          },
        }}
      >
        {children}
      </Flex>
    </Container>
  );
};
