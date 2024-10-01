import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { hexToHSL } from "../../../utils";
import { Box, Flex, Modal, ModalHeader, Text } from "../../ui";
import { PaymentForm } from "../plan-manager";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
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
    },
  };
};

interface PaymentMethodElementProps extends DesignProps {
  cardLast4?: string | null;
  monthsToExpiration?: number;
  onEdit?: () => void;
}

const PaymentMethodElement = ({
  cardLast4,
  monthsToExpiration,
  onEdit,
  ...props
}: PaymentMethodElementProps) => {
  const theme = useTheme();

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  return (
    <>
      {props.header.isVisible && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
        >
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            Payment Method
          </Text>

          {typeof monthsToExpiration === "number" && monthsToExpiration < 4 && (
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
        $margin="0 0 1rem"
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.0625)"
            : "hsla(0, 0%, 100%, 0.125)"
        }
        $padding="0.375rem 1rem"
        $borderRadius="9999px"
      >
        <Text $font={theme.typography.text.fontFamily} $size={14}>
          {cardLast4
            ? `💳 Card ending in ${cardLast4}`
            : "Other existing payment method"}
        </Text>

        {onEdit && (
          <Text
            onClick={onEdit}
            $font={theme.typography.link.fontFamily}
            $size={theme.typography.link.fontSize}
            $weight={theme.typography.link.fontWeight}
            $color={theme.typography.link.color}
          >
            Edit
          </Text>
        )}
      </Flex>
    </>
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

  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(
    () => typeof data.subscription?.paymentMethod === "undefined",
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

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

  /* const changePaymentMethod = useCallback(async () => {
    if (!api || !paymentMethodId) {
      return;
    }

    try {
      setIsLoading(true);
      await api.updatePaymentMethod({
        changeSubscriptionRequestBody: {
          newPaymentMethod: paymentMethodId,
        },
      });
      setLayout("success");
    } catch {
      setError(
        "Error processing payment. Please try a different payment method.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, paymentMethodId, setLayout]); */

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useLayoutEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!paymentMethod.paymentMethodType) {
    return null;
  }

  return (
    <div ref={ref} className={className}>
      <PaymentMethodElement
        onEdit={() => setLayout("payment")}
        {...paymentMethod}
        {...props}
      />

      {layout === "payment" &&
        createPortal(
          <Modal size="md">
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
                $flex="1"
                $overflow="auto"
              >
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
                          colorDanger: "#DF1B41",

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
                      onConfirm={(value) => {
                        setPaymentMethodId(value);
                      }}
                    />

                    {data.subscription?.paymentMethod && (
                      <Text
                        onClick={() => setShowPaymentForm(false)}
                        $font={theme.typography.link.fontFamily}
                        $size={theme.typography.link.fontSize}
                        $weight={theme.typography.link.fontWeight}
                        $color={theme.typography.link.color}
                      >
                        Use existing payment method
                      </Text>
                    )}
                  </Elements>
                ) : (
                  <>
                    <PaymentMethodElement {...paymentMethod} {...props} />

                    <Text
                      onClick={async () => {
                        if (!api || !data.component?.id) {
                          return;
                        }

                        const { data: setupIntent } = await api.getSetupIntent({
                          componentId: data.component.id,
                        });
                        setSetupIntent(setupIntent);
                        setShowPaymentForm(true);
                      }}
                      $font={theme.typography.link.fontFamily}
                      $size={theme.typography.link.fontSize}
                      $weight={theme.typography.link.fontWeight}
                      $color={theme.typography.link.color}
                    >
                      Change payment method
                    </Text>
                  </>
                )}
              </Flex>
            </Flex>
          </Modal>,
          portal || document.body,
        )}
    </div>
  );
});
