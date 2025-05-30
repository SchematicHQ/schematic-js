import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Modal, ModalHeader, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top = 0 }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const { setLayout } = useEmbed();

  return (
    <Modal size="md" top={top} onClose={() => setLayout("portal")}>
      <ModalHeader bordered onClose={() => setLayout("portal")}>
        <Text $size={18}>{t("Edit payment method")}</Text>
      </ModalHeader>

      <PaymentMethodDetails />
    </Modal>
  );
};
