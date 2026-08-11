import { useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  CheckoutFieldWithValue,
  PreviewSubscriptionFinanceResponseData,
} from "../../../api/checkoutexternal";
import { useIsLightBackground } from "../../../hooks";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import { renderOptInMarkdown, type TaxIdValues } from "../../../utils";
import { PaymentMethodDetails } from "../../elements";
import { Box, Checkbox, Flex, Input, Text } from "../../ui";

import { CustomCheckoutFields } from "./CustomCheckoutFields";
import { TaxIdField } from "./TaxIdField";

interface ConfirmPaymentIntentProps {
  clientSecret: string;
  callback: (confirmed: boolean) => void;
}

interface CheckoutProps {
  collectTaxId?: boolean;
  customCheckoutFields?: CheckoutFieldWithValue[];
  customFieldValues: Record<string, string>;
  isPaymentMethodRequired: boolean;
  onCustomFieldChange: (fieldId: string, value: string) => void;
  taxIdValues?: TaxIdValues;
  onTaxIdChange?: (value: TaxIdValues) => void;
  onTaxIdBlur?: () => void;
  taxIdError?: string;
  optInRequired: boolean;
  optInTitle?: string | null;
  optInText?: string | null;
  optInAccepted: boolean;
  setOptInAccepted: (accepted: boolean) => void;
  setPaymentMethodId: (id: string) => void;
  promoCode?: string | null;
  updatePromoCode: (code: string) => void;
  confirmPaymentIntentProps?: ConfirmPaymentIntentProps | null | undefined;
  financeData?: PreviewSubscriptionFinanceResponseData | null;
  onPaymentMethodSaved?: (updates: {
    period?: string;
    plan?: SelectedPlan;
    shouldTrial?: boolean;
    addOns?: SelectedPlan[];
    payInAdvanceEntitlements?: UsageBasedEntitlement[];
    addOnPayInAdvanceEntitlements?: UsageBasedEntitlement[];
    creditBundles?: CreditBundle[];
    promoCode?: string | null;
  }) => void;
}

export const Checkout = ({
  collectTaxId = false,
  customCheckoutFields,
  customFieldValues,
  isPaymentMethodRequired,
  onCustomFieldChange,
  taxIdValues,
  onTaxIdChange,
  onTaxIdBlur,
  taxIdError,
  optInRequired,
  optInTitle,
  optInText,
  optInAccepted,
  setOptInAccepted,
  setPaymentMethodId,
  promoCode,
  updatePromoCode,
  confirmPaymentIntentProps,
  financeData,
  onPaymentMethodSaved,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const [discount, setDiscount] = useState(promoCode ?? "");

  const hasCustomFields =
    !!customCheckoutFields && customCheckoutFields.length > 0;
  const showTaxId = collectTaxId && !!taxIdValues && !!onTaxIdChange;

  // The checkout stage can be reached without a payment method when the only
  // reason it exists is to collect custom checkout fields (e.g. a returning
  // customer with a card already on file), a tax ID, or an agreement. Render
  // nothing only when there is genuinely nothing to show.
  if (
    !isPaymentMethodRequired &&
    !hasCustomFields &&
    !showTaxId &&
    !optInRequired
  ) {
    return null;
  }

  const cardBackground = isLightBackground
    ? "hsla(0, 0%, 0%, 0.0625)"
    : "hsla(0, 0%, 100%, 0.125)";

  return (
    <Flex $flexDirection="column" $gap="1.5rem">
      {isPaymentMethodRequired && (
        <>
          <PaymentMethodDetails
            confirmPaymentIntentProps={confirmPaymentIntentProps}
            setPaymentMethodId={setPaymentMethodId}
            financeData={financeData}
            onPaymentMethodSaved={onPaymentMethodSaved}
          />

          <Flex $flexDirection="column" $gap="1rem">
            <Box>
              <Text display="heading4">{t("Discount")}</Text>
            </Box>

            <Flex
              $alignItems="center"
              $gap="1rem"
              $backgroundColor={cardBackground}
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
                  $leading="none"
                >
                  {t("Apply discount")}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </>
      )}

      {customCheckoutFields && customCheckoutFields.length > 0 && (
        <Flex $flexDirection="column" $gap="1.5rem">
          <Box>
            <Text display="heading4">{t("Additional information")}</Text>
          </Box>

          <CustomCheckoutFields
            fields={customCheckoutFields}
            values={customFieldValues}
            onChange={onCustomFieldChange}
          />
        </Flex>
      )}

      {showTaxId && (
        <Flex $flexDirection="column" $gap="1.5rem">
          <Box>
            <Text display="heading4">{t("Tax ID")}</Text>
          </Box>

          <TaxIdField
            value={taxIdValues}
            onChange={onTaxIdChange}
            onValueBlur={onTaxIdBlur}
          />

          {taxIdError && (
            <Box>
              <Text $weight={500} $color="#DB6669">
                {taxIdError}
              </Text>
            </Box>
          )}
        </Flex>
      )}

      {optInRequired && (
        <Flex $flexDirection="column" $gap="1rem">
          <Box>
            <Text display="heading4">{optInTitle || t("Agreement")}</Text>
          </Box>

          <Flex
            $alignItems="flex-start"
            $gap="1rem"
            $padding="1rem"
            $backgroundColor={cardBackground}
            $borderRadius="0.5rem"
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              // Let clicks on links pass through to the link; otherwise toggle.
              if ((event.target as HTMLElement).closest("a")) {
                return;
              }
              setOptInAccepted(!optInAccepted);
            }}
          >
            <Checkbox
              checked={optInAccepted}
              onChange={(event) => setOptInAccepted(event.target.checked)}
              onClick={(event) => event.stopPropagation()}
              aria-label={optInTitle || t("Agreement")}
            />
            <Box $flexGrow={1}>
              <Text>{renderOptInMarkdown(optInText)}</Text>
            </Box>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};
