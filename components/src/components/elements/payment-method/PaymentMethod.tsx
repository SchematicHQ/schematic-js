import {
  forwardRef,
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

type PaymentMethodElementProps = DesignProps;

const PaymentMethodElement = (props: PaymentMethodElementProps) => {
  const theme = useTheme();

  const { api, data } = useEmbed();

  const [stage, setStage] = useState<"view" | "edit">("view");
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(
    () => typeof data.subscription?.paymentMethod === "undefined",
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  const { paymentMethod } = useMemo(() => {
    return {
      paymentMethod: data.subscription?.paymentMethod,
    };
  }, [data.subscription?.paymentMethod]);

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

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

  if (!paymentMethod?.paymentMethodType) {
    return null;
  }

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

          {typeof paymentMethod.monthsToExpiration === "number" &&
            paymentMethod.monthsToExpiration < 4 && (
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $color="#DB6769"
              >
                {paymentMethod.monthsToExpiration > 0
                  ? `Expires in ${paymentMethod.monthsToExpiration} mo`
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
          {paymentMethod.cardLast4
            ? `💳 Card ending in ${paymentMethod.cardLast4}`
            : "Other existing payment method"}
        </Text>
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
  const { data, layout } = useEmbed();

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

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  if (!paymentMethod.paymentMethodType) {
    return null;
  }

  return (
    <div ref={ref} className={className}>
      <PaymentMethodElement {...props} />

      {layout === "payment" &&
        createPortal(
          <Modal>
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
                {stage === "view" && <PaymentMethodElement {...props} />}
              </Flex>
            </Flex>
          </Modal>,
          portal || document.body,
        )}
    </div>
  );
});
