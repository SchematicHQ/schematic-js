import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useIsLightBackground } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Box, Flex, Input, Text } from "../../ui";

interface CheckoutProps {
  isPaymentMethodRequired: boolean;
  setPaymentMethodId: (id: string) => void;
  updatePromoCode: (code: string) => void;
}

export const Checkout = ({
  isPaymentMethodRequired,
  setPaymentMethodId,
  updatePromoCode,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const [discount, setDiscount] = useState("");

  if (!isPaymentMethodRequired) {
    return null;
  }

  return (
    <>
      <PaymentMethodDetails setPaymentMethodId={setPaymentMethodId} />

      <Flex $flexDirection="column" $gap="1rem">
        <Box>
          <Text display="heading4">{t("Discount")}</Text>
        </Box>

        <Flex
          $alignItems="center"
          $gap="1rem"
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.0625)"
              : "hsla(0, 0%, 100%, 0.125)"
          }
          $borderRadius="9999px"
        >
          <Box $flexGrow={1}>
            <Input
              $size="full"
              $color="secondary"
              $variant="text"
              type="text"
              placeholder={t("Enter discount code")}
              value={discount}
              onChange={(event) => {
                const value = event.target.value;
                setDiscount(value);
              }}
              style={{
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "9999px",
                maxWidth: "100%",
                padding: "0.5rem 1rem",
              }}
            />
          </Box>

          <Box $flexShrink={0} $padding="0.5rem 1rem">
            <Text
              onClick={() => updatePromoCode(discount)}
              display="link"
              $leading={1}
            >
              {t("Apply discount")}
            </Text>
          </Box>
        </Flex>
      </Flex>
    </>
  );
};
