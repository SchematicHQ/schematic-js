import {
  AddressElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type PreviewSubscriptionFinanceResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import { isCheckoutData } from "../../../utils";
import { Box, Button, Flex, Text } from "../../ui";

import { Input, Label } from "./styles";

interface PaymentFormProps {
  onConfirm?: (paymentMethodId: string) => void;
  financePreview?: PreviewSubscriptionFinanceResponseData;
}

export const PaymentForm = ({
  onConfirm,
  financePreview,
}: PaymentFormProps) => {
  const { t } = useTranslation();

  const stripe = useStripe();
  const elements = useElements();

  const { data } = useEmbed();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  const shouldCollectAddress = useMemo(() => {
    return (
      (isCheckoutData(data) && data?.checkoutSettings.collectAddress) ??
      financePreview?.taxRequireBillingDetails ??
      false
    );
  }, [data, financePreview?.taxRequireBillingDetails]);
  const [isAddressComplete, setIsAddressComplete] =
    useState(!shouldCollectAddress);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setIsConfirmed(false);
    setMessage(undefined);

    try {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              email,
            },
          },
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (onConfirm && typeof setupIntent?.payment_method === "string") {
        onConfirm(setupIntent.payment_method);
        setIsConfirmed(true);
      } else {
        // TODO: handle other payment method types
      }

      if (error?.type === "card_error" || error?.type === "validation_error") {
        setMessage(error.message);
      }
    } catch {
      setMessage(t("A problem occurred while saving your payment method."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      as="form"
      id="payment-form"
      onSubmit={handleSubmit}
      $flexDirection="column"
      $overflowX="hidden"
      $overflowY="auto"
    >
      <Box $marginBottom="1.5rem">
        <PaymentElement
          id="payment-element"
          onChange={(event) => {
            setIsPaymentComplete(event.complete);
          }}
        />
      </Box>

      {stripe && isCheckoutData(data) && data.checkoutSettings.collectEmail && (
        <Box data-field="name" $marginBottom="1.5rem" $verticalAlign="top">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="text"
            value={email}
            autoComplete="email"
            placeholder="Enter email address"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Box>
      )}

      {(shouldCollectAddress ||
        (isCheckoutData(data) && data.checkoutSettings.collectPhone)) && (
        <Box $marginBottom="3.5rem">
          <AddressElement
            options={{
              mode: "billing",
              fields: {
                phone:
                  isCheckoutData(data) && data.checkoutSettings.collectPhone
                    ? "always"
                    : "never",
              },
            }}
            id="address-element"
            onChange={(event) => {
              setIsAddressComplete(event.complete);
            }}
          />
        </Box>
      )}

      <Button
        id="submit"
        disabled={
          isLoading ||
          !stripe ||
          !elements ||
          isConfirmed ||
          !isPaymentComplete ||
          !isAddressComplete
        }
        style={{ flexShrink: 0 }}
        $color="primary"
        $isLoading={isLoading}
        $fullWidth
      >
        {isLoading ? t("Loading") : t("Save payment method")}
      </Button>

      {message && (
        <Box $margin="1rem 0">
          <Text id="payment-message" $size={15} $weight={500} $color="#DB6669">
            {message}
          </Text>
        </Box>
      )}
    </Flex>
  );
};
