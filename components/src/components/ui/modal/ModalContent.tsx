import { forwardRef } from "react";

import { Flex } from "../../ui";

interface ModalContentProps {
  children?: React.ReactNode;
}

export const ModalContent = forwardRef<
  HTMLDivElement | null,
  ModalContentProps
>(({ children }, ref) => {
  return (
    <Flex
      ref={ref}
      $position="relative"
      $flexDirection="column"
      $viewport={{
        md: {
          $flexDirection: "row",
          $height: "calc(100% - 5rem + 3px)",
          $maxHeight: "calc(100dvh - 5rem + 3px)",
        },
      }}
    >
      {children}
    </Flex>
  );
});

ModalContent.displayName = "ModalContent";
