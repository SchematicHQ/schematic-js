import { forwardRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Flex, Modal, ModalContent, ModalHeader, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = forwardRef<
  HTMLDialogElement | null,
  PaymentDialogProps
>(({ top = 0 }, ref) => {
  const { t } = useTranslation();

  const { setLayout, clearCheckoutState } = useEmbed();

  const handleClose = useCallback(() => {
    setLayout("portal");
    clearCheckoutState();
  }, [setLayout, clearCheckoutState]);

  return (
    <Modal ref={ref} size="md" top={top} onClose={handleClose}>
      <ModalHeader bordered onClose={handleClose}>
        <Text $size={18}>{t("Edit payment method")}</Text>
      </ModalHeader>

      <ModalContent>
        <Flex $position="relative" $flexGrow={1} $overflow="auto">
          <PaymentMethodDetails />
        </Flex>
      </ModalContent>
    </Modal>
  );
});

PaymentDialog.displayName = "PaymentDialog";
