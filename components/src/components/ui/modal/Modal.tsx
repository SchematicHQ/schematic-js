import { forwardRef, useCallback, useLayoutEffect } from "react";
import { useTheme } from "styled-components";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Container } from "../../layout";
import { Box, Flex } from "../../ui";

interface ModalProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  size?: "sm" | "md" | "lg" | "auto";
  top?: number;
  onClose?: () => void;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ children, contentRef, size = "auto", top = 0, onClose, ...rest }, ref) => {
    const theme = useTheme();

    const { setLayout } = useEmbed();

    const isLightBackground = useIsLightBackground();

    const handleClose = useCallback(() => {
      setLayout("portal");
      onClose?.();
    }, [setLayout, onClose]);

    useLayoutEffect(() => {
      contentRef?.current?.focus({ preventScroll: true });
    }, [contentRef]);

    return (
      <Box
        ref={ref}
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
        $overflow="hidden"
        $width="100%"
        $height="100%"
        $marginTop={`${top}px`}
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 87.5%, 0.9)"
            : "hsla(0, 0%, 12.5%, 0.9)"
        }
        $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
        $scrollbarWidth="thin"
        $scrollbarGutter="stable both-edges"
      >
        <Container>
          <Flex
            ref={contentRef}
            tabIndex={0}
            role="dialog"
            aria-modal="true"
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
                    }),
                $borderRadius: "0.5rem",
              },
              "@media (min-height: 896px)": {
                $maxHeight: "860px",
              },
            }}
          >
            {children}
          </Flex>
        </Container>
      </Box>
    );
  },
);

Modal.displayName = "Modal";
