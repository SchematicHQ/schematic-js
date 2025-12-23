import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Dialog, DialogContent, DialogHeader, Flex, Text } from "../../ui";

interface PaymentDialogProps {
  top?: number;
}

export const PaymentDialog = ({ top }: PaymentDialogProps) => {
  const { t } = useTranslation();

  const { layout, setLayout, clearCheckoutState } = useEmbed();

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [isModal, setIsModal] = useState(true);

  const handleClose = useCallback(() => {
    clearCheckoutState();
    setLayout("portal");
  }, [setLayout, clearCheckoutState]);

  useLayoutEffect(() => {
    const element = dialogRef.current;
    if (layout !== "payment" || !element || element.open) {
      return;
    }

    const isParentBody = element.parentElement === document.body;
    setIsModal(isParentBody);

    if (isParentBody) {
      element.showModal();
    } else {
      element.show();
    }
  }, [layout]);

  return (
    <Dialog
      ref={dialogRef}
      isModal={isModal}
      size="md"
      top={top}
      onClose={handleClose}
    >
      <DialogHeader bordered onClose={handleClose}>
        <Text $size={18}>{t("Edit payment method")}</Text>
      </DialogHeader>

      <DialogContent>
        <Flex $position="relative" $flexGrow={1} $overflow="auto">
          <PaymentMethodDetails />
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
