import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type {
  PaymentMethodResponseData,
  SetupIntentResponseData,
} from "../../../api/checkoutexternal";
import type { FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
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
}

export const PaymentMethodDetails = ({
  setPaymentMethodId,
}: PaymentMethodDetailsProps) => {
  // TODO: I think we do not support edit in overlays at the moment
  const props = resolveDesignProps();

  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, setData } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [showDifferentPaymentMethods, setShowDifferentPaymentMethods] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    PaymentMethodResponseData | undefined
  >(data.subscription?.paymentMethod || data.company?.defaultPaymentMethod);

  const monthsToExpiration = useMemo(() => {
    let expiration: number | undefined;

    if (
      typeof paymentMethod?.cardExpYear === "number" &&
      typeof paymentMethod?.cardExpMonth === "number"
    ) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const timeToExpiration = Math.round(
        +new Date(paymentMethod.cardExpYear, paymentMethod.cardExpMonth - 1) -
          +new Date(currentYear, currentMonth),
      );
      expiration = Math.round(timeToExpiration / (1000 * 60 * 60 * 24 * 30));
    }
    return expiration;
  }, [paymentMethod?.cardExpYear, paymentMethod?.cardExpMonth]);

  const createSetupIntent = useCallback(async () => {
    if (!api || !data.component?.id) {
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Remove component id from here and from api
      const response = await api.getSetupIntent({
        componentId: data.component.id,
      });
      setSetupIntent(response.data);
    } catch {
      setError(
        t("Error initializing payment method change. Please try again."),
      );
    } finally {
      setShowPaymentForm(true);
      setIsLoading(false);
    }
  }, [t, api, data.component?.id]);

  const updatePaymentMethod = useCallback(
    async (externalId: string) => {
      if (!api || !externalId) {
        return;
      }

      try {
        setIsLoading(true);

        const updatePaymentMethodResponse = await api.updatePaymentMethod({
          updatePaymentMethodRequestBody: {
            paymentMethodId: externalId,
          },
        });

        setPaymentMethod(updatePaymentMethodResponse.data);

        // TODO: Refactor
        // Set data for sidebar
        if (setPaymentMethodId) {
          setPaymentMethodId(updatePaymentMethodResponse.data.externalId);
        }

        setData({
          ...data,
          // Optimistic update
          // If there is subscription - we have set payment method to subscription
          ...(data.subscription
            ? {
                subscription: {
                  ...data.subscription,
                  paymentMethod: updatePaymentMethodResponse.data,
                },
              }
            : {}),
          ...(data.company
            ? {
                company: {
                  ...data.company,
                  paymentMethods: [
                    updatePaymentMethodResponse.data,
                    ...(data.company?.paymentMethods || []),
                  ],
                  // Optimistic update
                  // If there is no subscription - we have updated default payment method in company
                  ...(data.subscription
                    ? {}
                    : {
                        defaultPaymentMethod: updatePaymentMethodResponse.data,
                      }),
                },
              }
            : {}),
        });
      } catch {
        setError(t("Error updating payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [api, data, setData, setPaymentMethodId, t],
  );

  const deletePaymentMethod = useCallback(
    async (id: string) => {
      if (!api || !id) {
        return;
      }

      try {
        setIsLoading(true);
        // Payment method id is used and expected
        // Some problem with type generation
        await api.deletePaymentMethod({
          checkoutId: id,
        });

        setData({
          ...data,
          company: {
            ...data.company!,
            paymentMethods: (data.company?.paymentMethods ?? []).filter(
              (pm) => pm.id !== id,
            ),
          },
        });
      } catch {
        setError(t("Error deleting payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [api, data, setData, t],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useEffect(() => {
    if (!setupIntent && (!paymentMethod || showPaymentForm)) {
      createSetupIntent();
    }
  }, [setupIntent, paymentMethod, showPaymentForm, createSetupIntent]);

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
        <Loader $color={theme.primary} $size="2xl" $isLoading={isLoading} />
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
        {setupIntent && showPaymentForm ? (
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
                    color: theme.typography.text.color,
                  },
                },
              },
              clientSecret: setupIntent?.setupIntentClientSecret as string,
            }}
          >
            <PaymentForm
              onConfirm={async (paymentMethodId) => {
                await updatePaymentMethod(paymentMethodId);
                setShowPaymentForm(false);
                setShowDifferentPaymentMethods(false);
              }}
            />

            {paymentMethod && (
              <Box>
                <Text
                  onClick={() => {
                    setShowPaymentForm(false);
                    setShowDifferentPaymentMethods(false);
                  }}
                  $font={theme.typography.link.fontFamily}
                  $size={theme.typography.link.fontSize}
                  $weight={theme.typography.link.fontWeight}
                  $color={theme.typography.link.color}
                >
                  {t("Select existing payment method")}
                </Text>
              </Box>
            )}
          </Elements>
        ) : (
          <Flex $flexDirection="column" $gap="2rem">
            <PaymentMethodElement
              size="lg"
              paymentMethod={paymentMethod}
              monthsToExpiration={monthsToExpiration}
              {...props}
            />

            {(data.company?.paymentMethods || []).length > 0 && (
              <Box>
                <Text
                  onClick={() => {
                    setShowDifferentPaymentMethods((prev) => !prev);
                  }}
                  $font={theme.typography.link.fontFamily}
                  $size={theme.typography.link.fontSize}
                  $weight={theme.typography.link.fontWeight}
                  $color={theme.typography.link.color}
                >
                  {t("Choose different payment method")}
                  <Icon
                    name="chevron-down"
                    style={{
                      display: "inline-flex",
                      marginLeft: "0.5rem",
                      ...(showDifferentPaymentMethods && {
                        transform: "rotate(180deg)",
                      }),
                    }}
                  />
                </Text>
              </Box>
            )}

            {showDifferentPaymentMethods && (
              <Flex $flexDirection="column" $overflowY="hidden">
                <Flex $flexDirection="column" $overflowY="scroll">
                  {(
                    data.company?.paymentMethods.filter(
                      (pm) => pm.id !== paymentMethod?.id,
                    ) || []
                  ).map((paymentMethod) => (
                    <PaymentListElement
                      key={paymentMethod.id}
                      paymentMethod={paymentMethod}
                      setDefault={updatePaymentMethod}
                      handleDelete={deletePaymentMethod}
                    />
                  ))}
                </Flex>

                {(!setupIntent ||
                  !paymentMethod ||
                  showDifferentPaymentMethods) && (
                  <Button onClick={createSetupIntent} $size="lg" $fullWidth>
                    {t("Add new payment method")}
                  </Button>
                )}
              </Flex>
            )}
          </Flex>
        )}

        {!isLoading && error && (
          <Box>
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={500}
              $color="#DB6669"
            >
              {error}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
