import {
  AddressElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PreviewSubscriptionFinanceResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import { shouldCollectBillingAddress } from "../../../utils";
import { Box, Button, Flex, Text, TransitionBox } from "../../ui";

import { Input, Label } from "./styles";

interface PaymentFormProps {
  onConfirm?: (paymentMethodId: string) => void;
  financeData?: PreviewSubscriptionFinanceResponseData | null;
}

export const PaymentForm = ({ onConfirm, financeData }: PaymentFormProps) => {
  const { t } = useTranslation();

  const stripe = useStripe();
  const elements = useElements();

  const { data, checkoutPrefill } = useEmbed();
  const billing = checkoutPrefill?.billingDetails;

  const collectEmail = data?.checkoutSettings.collectEmail ?? false;
  const collectPhone = data?.checkoutSettings.collectPhone ?? false;
  // Check if billing address collection is needed (either configured or required for tax)
  const shouldCollectAddress = shouldCollectBillingAddress(
    data?.checkoutSettings.collectAddress ?? false,
    financeData,
  );
  // The AddressElement (which also collects the billing name) is shown whenever
  // address or phone collection is active.
  const showBillingAddress = shouldCollectAddress || collectPhone;

  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const [email, setEmail] = useState(() => billing?.email ?? "");
  // Tracks whether the user has edited the email so a late-arriving prefill
  // value never clobbers their input.
  const userEditedEmailRef = useRef(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [isAddressComplete, setIsAddressComplete] = useState(
    () => !shouldCollectAddress,
  );

  // Stripe only reads AddressElement `defaultValues` on mount. Key the element
  // by the prefill identity so a prefill that arrives after mount remounts it.
  const addressDefaultsKey = useMemo(
    () => JSON.stringify(billing ?? {}),
    [billing],
  );

  // Keep the email input in sync with host-provided prefill until the user
  // edits it themselves.
  useEffect(() => {
    if (!userEditedEmailRef.current && billing?.email) {
      setEmail(billing.email);
    }
  }, [billing?.email]);

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

    // Only attach fields the merchant actually collects. The email input is
    // shown when `collectEmail` is set; the name comes from the AddressElement,
    // which is shown when billing address/phone collection is active.
    const billingDetails: { email?: string; name?: string } = {};
    if (collectEmail && email) {
      billingDetails.email = email;
    }
    if (showBillingAddress && billing?.name) {
      billingDetails.name = billing.name;
    }

    try {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: billingDetails,
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

  useEffect(() => {
    loadTimerRef.current = setTimeout(() => {
      if (!isPaymentReady) {
        setLoadError(t("Unable to load payment form."));
      }
    }, 10000);

    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, [t, isPaymentReady]);

  return (
    <Flex
      as="form"
      id="payment-form"
      onSubmit={handleSubmit}
      $flexDirection="column"
    >
      <Box $marginBottom="1.5rem">
        <PaymentElement
          id="payment-element"
          onReady={() => {
            setIsPaymentReady(true);
            if (loadTimerRef.current) {
              clearTimeout(loadTimerRef.current);
            }
          }}
          onLoadError={() => {
            setLoadError(t("Unable to load payment form."));
            if (loadTimerRef.current) {
              clearTimeout(loadTimerRef.current);
            }
          }}
          onChange={(event) => {
            setIsPaymentComplete(event.complete);
          }}
        />

        {loadError && (
          <Flex
            as={TransitionBox}
            $flexDirection="column"
            $justifyContent="center"
            $alignItems="center"
            $gap="1rem"
          >
            <Text $weight={500} $color="#DB6669">
              {loadError}
            </Text>
          </Flex>
        )}
      </Box>

      {stripe && collectEmail && (
        <Box data-field="name" $marginBottom="1.5rem" $verticalAlign="top">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="text"
            value={email}
            autoComplete="email"
            placeholder="Enter email address"
            onChange={(e) => {
              userEditedEmailRef.current = true;
              setEmail(e.target.value);
            }}
          />
        </Box>
      )}

      {showBillingAddress && (
        <Box $marginBottom="3.5rem">
          <AddressElement
            key={addressDefaultsKey}
            options={{
              mode: "billing",
              fields: {
                phone: collectPhone ? "always" : "never",
              },
              ...(billing?.name && {
                defaultValues: { name: billing.name },
              }),
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
