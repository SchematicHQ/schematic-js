import { Elements } from "@stripe/react-stripe-js";
import {
  loadStripe,
  type Stripe,
  type StripeConstructorOptions,
} from "@stripe/stripe-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type PaymentMethodResponseData,
  type PreviewSubscriptionFinanceResponseData,
  type SetupIntentResponseData,
} from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import { createKeyboardExecutionHandler, isCheckoutData } from "../../../utils";
import { PaymentForm } from "../../shared";
import { Box, Button, Flex, Icon, Loader, Text } from "../../ui";

import {
  PaymentListElement,
  PaymentMethodElement,
} from "./PaymentMethodElement";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
    showExpiration: boolean;
  };
}

const resolveDesignProps = (): DesignProps => {
  return {
    header: {
      isVisible: true,
      fontStyle: "heading4",
    },
    functions: {
      allowEdit: true,
      showExpiration: true,
    },
  };
};

interface PaymentMethodDetailsProps {
  setPaymentMethodId?: (id: string) => void;
  financePreview?: PreviewSubscriptionFinanceResponseData;
  onPaymentMethodSaved?: (updates?: {
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

export const PaymentMethodDetails = ({
  setPaymentMethodId,
  financePreview,
  onPaymentMethodSaved,
}: PaymentMethodDetailsProps) => {
  // TODO: I think we do not support edit in overlays at the moment
  const props = resolveDesignProps();

  const { t } = useTranslation();

  const {
    data,
    settings,
    createSetupIntent,
    updatePaymentMethod,
    deletePaymentMethod,
  } = useEmbed();

  const { defaultPaymentMethod, paymentMethods, subscription } = useMemo(() => {
    if (isCheckoutData(data)) {
      return {
        defaultPaymentMethod: data.company?.defaultPaymentMethod,
        paymentMethods: data.company?.paymentMethods || [],
        subscription: data.subscription,
      };
    }

    return {
      defaultPaymentMethod: undefined,
      paymentMethods: [],
      subscription: undefined,
    };
  }, [data]);

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [showDifferentPaymentMethods, setShowDifferentPaymentMethods] =
    useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<
    PaymentMethodResponseData | undefined
  >(subscription?.paymentMethod || defaultPaymentMethod);

  const monthsToExpiration = useMemo(() => {
    let expiration: number | undefined;

    if (
      typeof currentPaymentMethod?.cardExpYear === "number" &&
      typeof currentPaymentMethod?.cardExpMonth === "number"
    ) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const timeToExpiration = Math.round(
        +new Date(
          currentPaymentMethod.cardExpYear,
          currentPaymentMethod.cardExpMonth - 1,
        ) - +new Date(currentYear, currentMonth),
      );
      expiration = Math.round(timeToExpiration / (1000 * 60 * 60 * 24 * 30));
    }
    return expiration;
  }, [currentPaymentMethod?.cardExpYear, currentPaymentMethod?.cardExpMonth]);

  const focusExistingPaymentMethods = () => {
    setShowPaymentForm(false);
    setShowDifferentPaymentMethods(false);
  };

  const toggleShowPaymentMethods = () => {
    setShowDifferentPaymentMethods((prev) => !prev);
  };

  const initializePaymentMethod = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await createSetupIntent();

      if (response) {
        setSetupIntent(response.data);
      }
    } catch {
      setError(
        t("Error initializing payment method change. Please try again."),
      );
    } finally {
      setShowPaymentForm(true);
      setIsLoading(false);
    }
  }, [t, createSetupIntent]);

  const handleUpdatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      try {
        setIsLoading(true);

        const response = await updatePaymentMethod(paymentMethodId);
        if (response) {
          setCurrentPaymentMethod(response.data);
          setPaymentMethodId?.(response.data.externalId);
          onPaymentMethodSaved?.();
        }
      } catch {
        setError(t("Error updating payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [t, setPaymentMethodId, updatePaymentMethod, onPaymentMethodSaved],
  );

  const handleDeletePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      try {
        setIsLoading(true);
        deletePaymentMethod(paymentMethodId);
      } catch {
        setError(t("Error deleting payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [t, deletePaymentMethod],
  );

  useEffect(() => {
    if (!stripe && setupIntent) {
      let publishableKey =
        setupIntent.publishableKey || setupIntent.schematicPublishableKey;

      const stripeOptions: StripeConstructorOptions = {};

      if (setupIntent.accountId) {
        publishableKey = setupIntent.schematicPublishableKey;
        stripeOptions.stripeAccount = setupIntent.accountId;
      }

      const stripePromise = loadStripe(publishableKey, stripeOptions);
      setStripe(stripePromise);
    }
  }, [stripe, setupIntent]);

  useEffect(() => {
    if (!setupIntent && (!currentPaymentMethod || showPaymentForm)) {
      initializePaymentMethod();
    }
  }, [
    setupIntent,
    currentPaymentMethod,
    showPaymentForm,
    initializePaymentMethod,
  ]);

  return (
    <Flex $position="relative">
      <Flex
        $position="absolute"
        $zIndex={isLoading ? 1 : 0}
        $justifyContent="center"
        $alignItems="center"
        $width="100%"
        $height="100%"
      >
        <Loader
          $color={settings.theme.primary}
          $size="2xl"
          $isLoading={isLoading}
        />
      </Flex>

      <Flex
        $position="relative"
        $zIndex={isLoading ? 0 : 1}
        $flexDirection="column"
        $flexGrow={1}
        $gap="1rem"
        $overflow="auto"
        $padding="2rem 2.5rem 2rem 2.5rem"
        $visibility={isLoading ? "hidden" : "visible"}
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.025)"
            : "hsla(0, 0%, 100%, 0.025)"
        }
      >
        {setupIntent && showPaymentForm && stripe ? (
          <Elements
            stripe={stripe}
            options={{
              appearance: {
                theme: "stripe",
                variables: {
                  fontFamily: '"Public Sans", system-ui, sans-serif',
                  spacingUnit: "0.25rem",
                  borderRadius: "0.5rem",
                  colorText: "#30313D",
                  colorBackground: "#FFFFFF",
                  colorPrimary: "#0570DE",
                  colorDanger: "#DB6669",
                  gridRowSpacing: "1.5rem",
                  gridColumnSpacing: "1.5rem",
                },
                rules: {
                  ".Label": {
                    fontSize: "1rem",
                    fontWeight: "400",
                    marginBottom: "0.75rem",
                    color: settings.theme.typography.text.color,
                  },
                },
              },
              clientSecret: setupIntent?.setupIntentClientSecret as string,
            }}
          >
            <PaymentForm
              financePreview={financePreview}
              onConfirm={async (paymentMethodId) => {
                await handleUpdatePaymentMethod(paymentMethodId);
                setShowPaymentForm(false);
                setShowDifferentPaymentMethods(false);
              }}
            />

            {currentPaymentMethod && (
              <Box>
                <Text
                  onClick={focusExistingPaymentMethods}
                  onKeyDown={createKeyboardExecutionHandler(
                    focusExistingPaymentMethods,
                  )}
                  display="link"
                >
                  {t("Select existing payment method")}
                </Text>
              </Box>
            )}
          </Elements>
        ) : (
          <Flex $flexDirection="column" $gap="2rem">
            <PaymentMethodElement
              paymentMethod={currentPaymentMethod}
              monthsToExpiration={monthsToExpiration}
              {...props}
            />

            {paymentMethods.length > 0 && (
              <Flex $alignItems="center" $gap="0.5rem">
                <Text
                  onClick={toggleShowPaymentMethods}
                  onKeyDown={createKeyboardExecutionHandler(
                    toggleShowPaymentMethods,
                  )}
                  display="link"
                >
                  {t("Choose different payment method")}
                </Text>

                <Icon
                  name={
                    showDifferentPaymentMethods ? "chevron-up" : "chevron-down"
                  }
                />
              </Flex>
            )}

            {showDifferentPaymentMethods && (
              <Flex $flexDirection="column" $gap="2rem" $marginTop="-1rem">
                <Flex $flexDirection="column" $overflow="auto">
                  {(
                    paymentMethods.filter(
                      (paymentMethod) =>
                        paymentMethod.id !== currentPaymentMethod?.id,
                    ) || []
                  ).map((paymentMethod) => (
                    <PaymentListElement
                      key={paymentMethod.id}
                      paymentMethod={paymentMethod}
                      setDefault={handleUpdatePaymentMethod}
                      handleDelete={handleDeletePaymentMethod}
                    />
                  ))}
                </Flex>

                {(!setupIntent || !currentPaymentMethod) && (
                  <Button
                    type="button"
                    onClick={initializePaymentMethod}
                    $size="lg"
                    $fullWidth
                  >
                    {t("Add new payment method")}
                  </Button>
                )}
              </Flex>
            )}
          </Flex>
        )}

        {!isLoading && error && (
          <Box>
            <Text $weight={500} $color="#DB6669">
              {error}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
