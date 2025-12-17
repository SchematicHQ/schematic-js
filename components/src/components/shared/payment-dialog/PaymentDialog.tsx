import { useCallback, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Flex, Modal, ModalContent, ModalHeader, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top = 0 }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const { setLayout, clearCheckoutState } = useEmbed();

  const modalRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    clearCheckoutState();
    setLayout("portal");
  }, [setLayout, clearCheckoutState]);

  useLayoutEffect(() => {
    const element = modalRef.current;

    if (element) {
      if (element.open) {
        return;
      }

      if (element.parentElement === document.body) {
        element.showModal();
      } else {
        element.show();
      }
    }
  }, []);

  return (
    <Modal ref={modalRef} size="md" top={top} onClose={handleClose}>
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
};
