import { Modal, ModalHeader, Text } from "../../ui";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { PaymentMethodDetails } from "../../elements";
import { useEmbed } from "../../../hooks";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top = 0 }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { setLayout } = useEmbed();

  return (
    <Modal size="md" top={top} onClose={() => setLayout("portal")}>
      <ModalHeader bordered onClose={() => setLayout("portal")}>
        <Text
          $font={theme.typography.text.fontFamily}
          $size={18}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {t("Edit payment method")}
        </Text>
      </ModalHeader>

      <PaymentMethodDetails />
    </Modal>
  );
};
