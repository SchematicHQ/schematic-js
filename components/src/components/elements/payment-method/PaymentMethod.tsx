import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { type FontStyle } from "../../../context";
import { PaymentForm } from "../../shared";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Element } from "../../layout";
import { Box, Flex, Modal, ModalHeader, Text } from "../../ui";

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

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
    },
    functions: {
      allowEdit: props.functions?.allowEdit ?? true,
      showExpiration: props.functions?.showExpiration ?? true,
    },
  };
};

interface PaymentMethodElementProps extends DesignProps {
  size?: "sm" | "md" | "lg";
  cardLast4?: string | null;
  monthsToExpiration?: number;
  onEdit?: () => void;
}

const PaymentMethodElement = ({
  size = "md",
  cardLast4,
  monthsToExpiration,
  onEdit,
  ...props
}: PaymentMethodElementProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  const sizeFactor = size === "lg" ? 2 : size === "md" ? 1 : 0.5;

  return (
    <Flex $flexDirection="column" $gap={`${sizeFactor}rem`}>
      {props.header.isVisible && (
        <Flex $justifyContent="space-between" $alignItems="center">
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            Payment Method
          </Text>

          {props.functions.showExpiration &&
            typeof monthsToExpiration === "number" &&
            monthsToExpiration < 4 && (
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $color="#DB6769"
              >
                {monthsToExpiration > 0
                  ? `Expires in ${monthsToExpiration} mo`
                  : "Expired"}
              </Text>
            )}
        </Flex>
      )}

      <Flex
        $justifyContent="space-between"
        $alignItems="center"
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.0625)"
            : "hsla(0, 0%, 100%, 0.125)"
        }
        $padding={`${sizeFactor / 2}rem ${sizeFactor}rem`}
        $borderRadius="9999px"
      >
        <Text $font={theme.typography.text.fontFamily} $size={14}>
          {cardLast4
            ? `💳 Card ending in ${cardLast4}`
            : "Other existing payment method"}
        </Text>

        {props.functions.allowEdit && onEdit && (
          <Text
            onClick={onEdit}
            $font={theme.typography.link.fontFamily}
            $size={theme.typography.link.fontSize}
            $weight={theme.typography.link.fontWeight}
            $leading={1}
            $color={theme.typography.link.color}
          >
            Edit
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

export type PaymentMethodProps = DesignProps;

export const PaymentMethod = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  const { api, data, layout, setLayout } = useEmbed();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(
    () => typeof data.subscription?.paymentMethod === "undefined",
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  const isLightBackground = useIsLightBackground();

  const paymentMethod = useMemo(() => {
    const { paymentMethodType, cardLast4, cardExpMonth, cardExpYear } =
      data.subscription?.paymentMethod || {};

    let monthsToExpiration: number | undefined;
    if (typeof cardExpYear === "number" && typeof cardExpMonth === "number") {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const timeToExpiration = Math.round(
        +new Date(cardExpYear, cardExpMonth - 1) -
          +new Date(currentYear, currentMonth),
      );
      monthsToExpiration = Math.round(
        timeToExpiration / (1000 * 60 * 60 * 24 * 30),
      );
    }

    return {
      paymentMethodType,
      cardLast4,
      monthsToExpiration,
    };
  }, [data.subscription?.paymentMethod]);

  const createSetupIntent = useCallback(async () => {
    if (!api || !data.component?.id) {
      return;
    }

    try {
      setIsLoading(true);
      const { data: setupIntent } = await api.getSetupIntent({
        componentId: data.component.id,
      });
      setSetupIntent(setupIntent);
      setShowPaymentForm(true);
    } catch {
      setError("Error initializing payment method change. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [api, data.component?.id]);

  const updatePaymentMethod = useCallback(
    async (id: string) => {
      if (!api || !id) {
        return;
      }

      try {
        setIsLoading(true);
        await api.updatePaymentMethod({
          updatePaymentMethodRequestBody: {
            paymentMethodId: id,
          },
        });
        setLayout("success");
      } catch {
        setError("Error updating payment method. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [api, setLayout],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useEffect(() => {
    document.body.style.overflow = layout === "payment" ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [layout]);

  if (!paymentMethod.paymentMethodType) {
    return null;
  }

  return (
    <Element ref={ref} className={className}>
      <PaymentMethodElement
        onEdit={() => setLayout("payment")}
        {...paymentMethod}
        {...props}
      />

      {layout === "payment" &&
        createPortal(
          <Modal size="md" onClose={() => setShowPaymentForm(false)}>
            <ModalHeader bordered>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={19}
                $weight={600}
                $color={theme.typography.text.color}
              >
                Edit payment method
              </Text>
            </ModalHeader>

            <Flex $position="relative" $height="calc(100% - 5rem)">
              <Flex
                $flexDirection="column"
                $flexGrow="1"
                $gap="1rem"
                $padding="2rem 2.5rem 2rem 2.5rem"
                $backgroundColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.025)"
                    : "hsla(0, 0%, 100%, 0.025)"
                }
                $overflow="auto"
              >
                <>
                  {showPaymentForm ? (
                    <Elements
                      stripe={stripe}
                      options={{
                        appearance: {
                          theme: "stripe",
                          variables: {
                            // Base
                            fontFamily: '"Public Sans", system-ui, sans-serif',
                            spacingUnit: "0.25rem",
                            borderRadius: "0.5rem",
                            colorText: "#30313D",
                            colorBackground: "#FFFFFF",
                            colorPrimary: "#0570DE",
                            colorDanger: "#DB6669",

                            // Layout
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
                        clientSecret:
                          setupIntent?.setupIntentClientSecret as string,
                      }}
                    >
                      <PaymentForm
                        onConfirm={(value) => updatePaymentMethod(value)}
                      />
                    </Elements>
                  ) : (
                    <Flex $flexDirection="column" $gap="2rem">
                      <PaymentMethodElement
                        size="lg"
                        {...paymentMethod}
                        {...props}
                      />

                      <Box>
                        <Text
                          onClick={createSetupIntent}
                          $font={theme.typography.link.fontFamily}
                          $size={theme.typography.link.fontSize}
                          $weight={theme.typography.link.fontWeight}
                          $color={theme.typography.link.color}
                        >
                          Change payment method
                        </Text>
                      </Box>
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
                </>
              </Flex>
            </Flex>
          </Modal>,
          portal || document.body,
        )}
    </Element>
  );
});

PaymentMethod.displayName = "PaymentMethod";
