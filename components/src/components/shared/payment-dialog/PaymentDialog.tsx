import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { PaymentMethodDetails } from "../../elements";
import { Modal, ModalContent, ModalHeader, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top = 0 }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const modalRef = useRef<HTMLDivElement>(null);

  return (
    <Modal ref={modalRef} size="md" top={top}>
      <ModalHeader bordered>
        <Text $size={18}>{t("Edit payment method")}</Text>
      </ModalHeader>

      <ModalContent>
        <PaymentMethodDetails />
      </ModalContent>
    </Modal>
  );
};
