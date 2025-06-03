import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { PaymentMethodDetails } from "../../elements";
import { Modal, ModalHeader, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top = 0 }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Modal size="md" top={top} contentRef={contentRef}>
      <ModalHeader bordered>
        <Text $size={18}>{t("Edit payment method")}</Text>
      </ModalHeader>

      <PaymentMethodDetails />
    </Modal>
  );
};
