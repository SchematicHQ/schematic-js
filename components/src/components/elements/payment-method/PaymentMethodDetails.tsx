import { Elements } from "@stripe/react-stripe-js";
import {
  loadStripe,
  type Stripe,
  type StripeConstructorOptions,
} from "@stripe/stripe-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type CheckoutFieldWithValue,
  type PaymentMethodResponseData,
  type PreviewSubscriptionFinanceResponseData,
  type SetupIntentResponseData,
} from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  usePaymentConfirmation,
} from "../../../hooks";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import { createKeyboardExecutionHandler } from "../../../utils";
import { PaymentForm } from "../../shared";
import { Input, Label } from "../../shared/payment-form/styles";
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

interface ConfirmPaymentIntentProps {
  clientSecret: string;
  callback: (confirmed: boolean) => void;
}

interface PaymentMethodDetailsProps {
  setPaymentMethodId?: (id: string) => void;
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

export const PaymentMethodDetails = ({
  setPaymentMethodId,
  confirmPaymentIntentProps,
  financeData,
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
    updateCustomFieldValues,
  } = useEmbed();

  const { defaultPaymentMethod, paymentMethods, subscription } = useMemo(() => {
    return {
      defaultPaymentMethod: data?.company?.defaultPaymentMethod,
      paymentMethods: data?.company?.paymentMethods || [],
      subscription: data?.subscription,
    };
  }, [
    data?.company?.defaultPaymentMethod,
    data?.company?.paymentMethods,
    data?.subscription,
  ]);

  const isLightBackground = useIsLightBackground();

  const initialPaymentMethod =
    subscription?.paymentMethod || defaultPaymentMethod;
  const [isLoading, setIsLoading] = useState(!initialPaymentMethod);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [showDifferentPaymentMethods, setShowDifferentPaymentMethods] =
    useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<
    PaymentMethodResponseData | undefined
  >(initialPaymentMethod);

  const customCheckoutFields = data?.customCheckoutFields ?? [];
  const hasCustomFields = customCheckoutFields.length > 0;
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >(() => {
    const values: Record<string, string> = {};
    for (const field of data?.customCheckoutFields ?? []) {
      values[field.id] = field.value ?? "";
    }
    return values;
  });
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false);

  const prevCustomFieldsRef = useRef(data?.customCheckoutFields);
  useEffect(() => {
    if (data?.customCheckoutFields !== prevCustomFieldsRef.current) {
      prevCustomFieldsRef.current = data?.customCheckoutFields;
      if (!editingCustomFields) {
        const values: Record<string, string> = {};
        for (const field of data?.customCheckoutFields ?? []) {
          values[field.id] = field.value ?? "";
        }
        setCustomFieldValues(values);
      }
    }
  }, [data?.customCheckoutFields, editingCustomFields]);

  const resetCustomFieldValues = useCallback(() => {
    const values: Record<string, string> = {};
    for (const field of data?.customCheckoutFields ?? []) {
      values[field.id] = field.value ?? "";
    }
    setCustomFieldValues(values);
  }, [data?.customCheckoutFields]);

  const handleSaveCustomFields = useCallback(async () => {
    setIsSavingCustomFields(true);
    try {
      await updateCustomFieldValues?.(customFieldValues);
      setEditingCustomFields(false);
    } catch {
      setError(t("Error saving custom field values. Please try again."));
    } finally {
      setIsSavingCustomFields(false);
    }
  }, [t, customFieldValues, updateCustomFieldValues]);

  const { isConfirming: isConfirmingPayment } = usePaymentConfirmation({
    stripe,
    clientSecret: confirmPaymentIntentProps?.clientSecret,
    onSuccess: () => {
      confirmPaymentIntentProps?.callback(true);
    },
    onError: (error) => {
      console.error("Payment confirmation error:", error);
      confirmPaymentIntentProps?.callback(false);
    },
    autoConfirm: true,
  });

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

  const initializeStripe = useCallback(() => {
    if (stripe || !setupIntent) {
      return;
    }

    let publishableKey =
      setupIntent.publishableKey || setupIntent.schematicPublishableKey;

    const stripeOptions: StripeConstructorOptions = {};

    if (setupIntent.accountId) {
      publishableKey = setupIntent.schematicPublishableKey;
      stripeOptions.stripeAccount = setupIntent.accountId;
    }

    const stripePromise = loadStripe(publishableKey, stripeOptions);

    stripePromise
      .then((instance) => {
        if (!instance) {
          setError(t("Unable to load payment form."));
          setShowPaymentForm(false);
          return;
        }
        setStripe(stripePromise);
      })
      .catch(() => {
        setError(t("Unable to load payment form."));
        setShowPaymentForm(false);
      });
  }, [t, stripe, setupIntent]);

  const initializePaymentMethod = useCallback(() => {
    const pending = createSetupIntent() ?? Promise.resolve(undefined);

    return pending
      .then((response) => {
        if (response) {
          setSetupIntent(response.data);
        }
      })
      .catch(() => {
        setError(
          t("Error initializing payment method change. Please try again."),
        );
      })
      .finally(() => {
        setShowPaymentForm(true);
        setIsLoading(false);
      });
  }, [t, createSetupIntent]);

  const handleUpdatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      try {
        setIsLoading(true);

        const response = await updatePaymentMethod(paymentMethodId);
        if (response) {
          setCurrentPaymentMethod(response.data);

          // TODO: Refactor
          // Set data for sidebar
          if (setPaymentMethodId) {
            setPaymentMethodId(response.data.externalId);
          }

          // Trigger preview checkout to recalculate taxes with new billing info
          if (onPaymentMethodSaved) {
            onPaymentMethodSaved({});
          }
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
        const response = await deletePaymentMethod(paymentMethodId);
        if (response?.data.deleted) {
          setCurrentPaymentMethod(undefined);
        }
      } catch {
        setError(t("Error deleting payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [t, deletePaymentMethod],
  );

  useEffect(() => {
    initializeStripe();
  }, [initializeStripe]);

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
    <Flex
      $position="relative"
      $flexDirection="column"
      $flexGrow={1}
      $gap="1.5rem"
    >
      <Flex
        $position="absolute"
        $zIndex={isLoading || isConfirmingPayment ? 1 : 0}
        $justifyContent="center"
        $alignItems="center"
        $width="100%"
        $height="100%"
      >
        <Loader
          $color={settings.theme.primary}
          $size="2xl"
          $isLoading={isLoading || isConfirmingPayment}
        />
      </Flex>

      <Flex
        $zIndex={isLoading || isConfirmingPayment ? 0 : 1}
        $flexDirection="column"
        $flexGrow={1}
        $gap="1rem"
        $height="fit-content"
        $padding="1rem"
        $visibility={isLoading || isConfirmingPayment ? "hidden" : "visible"}
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.025)"
            : "hsla(0, 0%, 100%, 0.025)"
        }
        $viewport={{
          md: {
            $padding: "2rem 2.5rem",
          },
        }}
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
              financeData={financeData}
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
              {...(paymentMethods.length > 1 &&
                currentPaymentMethod && {
                  onRemove: () => {
                    handleDeletePaymentMethod(currentPaymentMethod.id);
                  },
                })}
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
                  color={settings.theme.typography.text.color}
                />
              </Flex>
            )}

            {showDifferentPaymentMethods && (
              <Flex $flexDirection="column" $gap="2rem" $marginTop="-1rem">
                {paymentMethods.length > 1 && (
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
                )}

                <Button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    initializePaymentMethod();
                  }}
                  $size="lg"
                  $fullWidth
                >
                  {t("Add new payment method")}
                </Button>
              </Flex>
            )}

            {hasCustomFields && (
              <Flex $flexDirection="column" $gap="1rem" $marginTop="0.5rem">
                <Flex $justifyContent="space-between" $alignItems="center">
                  <Text display="heading4">{t("Additional information")}</Text>
                  {!editingCustomFields && (
                    <Text
                      onClick={() => setEditingCustomFields(true)}
                      onKeyDown={createKeyboardExecutionHandler(() =>
                        setEditingCustomFields(true),
                      )}
                      display="link"
                      $leading="none"
                    >
                      {t("Edit")}
                    </Text>
                  )}
                </Flex>

                {editingCustomFields ? (
                  <Flex $flexDirection="column" $gap="1rem">
                    {customCheckoutFields.map((field) => (
                      <Box key={field.id}>
                        <Label htmlFor={`edit-field-${field.id}`}>
                          {field.name}
                          {field.required && (
                            <span
                              style={{
                                color: "#DB6669",
                                marginLeft: "0.25rem",
                              }}
                            >
                              *
                            </span>
                          )}
                        </Label>
                        <Input
                          id={`edit-field-${field.id}`}
                          type="text"
                          value={customFieldValues[field.id] ?? ""}
                          placeholder={field.helperText ?? ""}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                        />
                      </Box>
                    ))}
                    <Flex $gap="0.5rem">
                      <Button
                        type="button"
                        onClick={handleSaveCustomFields}
                        $isLoading={isSavingCustomFields}
                        disabled={
                          isSavingCustomFields ||
                          customCheckoutFields.some(
                            (f) =>
                              f.required &&
                              !customFieldValues[f.id]?.trim(),
                          )
                        }
                      >
                        {t("Save changes")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingCustomFields(false);
                          resetCustomFieldValues();
                        }}
                        $color="secondary"
                      >
                        {t("Cancel")}
                      </Button>
                    </Flex>
                  </Flex>
                ) : (
                  <Flex $flexDirection="column" $gap="0.5rem">
                    {customCheckoutFields.map((field) => (
                      <Flex
                        key={field.id}
                        $flexDirection="column"
                        $gap="0.125rem"
                      >
                        <Text
                          $size={12}
                          $color={
                            isLightBackground
                              ? "hsla(0, 0%, 0%, 0.5)"
                              : "hsla(0, 0%, 100%, 0.5)"
                          }
                        >
                          {field.name}
                        </Text>
                        <Text $size={14}>
                          {field.value || (
                            <span
                              style={{
                                fontStyle: "italic",
                                opacity: 0.5,
                              }}
                            >
                              {t("Not provided")}
                            </span>
                          )}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
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
