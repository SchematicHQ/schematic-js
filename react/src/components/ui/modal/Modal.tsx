import { useCallback, useEffect, useRef } from "react";
import { useEmbed } from "../../../hooks";
import { Box, Flex } from "../";

interface ModalProps {
  children: React.ReactNode;
  size?: "md" | "lg";
  onClose?: () => void;
}

export const Modal = ({ children, size = "lg", onClose }: ModalProps) => {
  const { setLayout } = useEmbed();

  const ref = useRef<HTMLDivElement>(null);

  const sizeWidthMap = {
    md: "700px",
    lg: "75%",
  };

  const sizeHeighthMap = {
    md: "auto",
    lg: "75%",
  };

  const sizeMaxWidthMap = {
    md: "auto",
    lg: "1140px",
  };

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

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
      $position="absolute"
      $top="50%"
      $left="50%"
      $zIndex="999999"
      $transform="translate(-50%, -50%)"
      $width="100%"
      $height="100%"
      $backgroundColor="#D9D9D9"
      $overflow="hidden"
    >
      <Flex
        $position="relative"
        $top="50%"
        $left="50%"
        $transform="translate(-50%, -50%)"
        $flexDirection="column"
        $maxWidth={sizeMaxWidthMap[size]}
        $width={sizeWidthMap[size]}
        $height={sizeHeighthMap[size]}
        $backgroundColor="#FBFBFB"
        $borderBottom="1px solid #DEDEDE"
        $borderRadius="0.5rem"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        id="select-plan-dialog"
        role="dialog"
        aria-labelledby="select-plan-dialog-label"
        aria-modal="true"
      >
        {children}
      </Flex>
    </Box>
  );
};
