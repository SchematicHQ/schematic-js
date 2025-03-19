import {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type {
  PaymentMethodResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { type FontStyle } from "../../../context";
import { PaymentForm } from "../../shared";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Element } from "../../layout";
import {
  Box,
  EmbedButton,
  Flex,
  Icon,
  IconNameTypes,
  Modal,
  ModalHeader,
  Text,
} from "../../ui";
import { t } from "i18next";
import { DefaultTheme } from "styled-components/dist/models/ThemeProvider";

type PaymentMethodType =
  | "card"
  | "us_bank_account"
  | "amazon_pay"
  | "cashapp"
  | "paypal"
  | "link"
  | string;

type PaymentElementSizes = "sm" | "md" | "lg";

interface PaymentElementProps {
  iconName?: IconNameTypes;
  iconTitle?: string;
  iconStyles?: CSSProperties;
  label?: string;
  paymentLast4?: string | null;
}

interface PaymentElementListProps {
  paymentMethod: PaymentMethodResponseData;
  setDefault: (id: string) => void;
  handleDelete: (id: string) => void;
}

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

interface PaymentMethodElementProps extends DesignProps {
  size?: PaymentElementSizes;
  paymentMethod?: PaymentMethodResponseData;
  monthsToExpiration?: number;
  onEdit?: () => void;
}

const PaymentElement = ({
  iconName,
  iconTitle,
  iconStyles,
  label,
  paymentLast4,
}: PaymentElementProps) => {
  const theme = useTheme();

  return (
    <Text $font={theme.typography.text.fontFamily} $size={16}>
      <Flex $flexDirection="row" $alignItems="center">
        {iconName && (
          <Box>
            <Icon name={iconName} title={iconTitle} style={iconStyles} />
          </Box>
        )}

        <Flex $alignItems="center">
          <Box $lineHeight="1" $marginRight="4px">
            {t(label as string)}
          </Box>
          {paymentLast4 && (
            <Box $display="inline-block" $fontWeight="bold">
              {paymentLast4}
            </Box>
          )}
        </Flex>
      </Flex>
    </Text>
  );
};

const EmptyPaymentElement = () => {
  const theme = useTheme();

  return (
    <Text $font={theme.typography.text.fontFamily} $size={16}>
      <Flex $flexDirection="row" $alignItems="center">
        <Flex $alignItems="center">
          <Box $lineHeight="1" $marginRight="4px">
            {t("No payment method selected")}
          </Box>
        </Flex>
      </Flex>
    </Text>
  );
};

const PaymentListElement = ({
  paymentMethod,
  setDefault,
  handleDelete,
}: PaymentElementListProps) => {
  const theme = useTheme();
  const isLightBackground = useIsLightBackground();

  const { iconName, iconTitle, label, paymentLast4 } =
    getPaymentMethodData(paymentMethod);
  const iconStyles = getIconStyles({ size: "lg", theme });

  const expirationDate = useMemo(() => {
    const { cardExpMonth, cardExpYear } = paymentMethod;
    if (!cardExpMonth && !cardExpYear) {
      return "";
    }

    if (!cardExpYear) {
      return "";
    }

    const formatedYear = cardExpYear.toString().slice(-2);

    if (!cardExpMonth) {
      return formatedYear;
    }

    return `${cardExpMonth}/${formatedYear}`;
  }, [paymentMethod]);

  return (
    <Flex
      $flexDirection="row"
      $alignItems="center"
      $borderWidth="0"
      $borderBottomWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.175)"
          : "hsla(0, 0%, 100%, 0.175)"
      }
    >
      <Box $paddingLeft="0.5rem" $paddingRight="0.5rem">
        {iconName && (
          <Icon name={iconName} title={iconTitle} style={iconStyles} />
        )}
      </Box>

      <Box $flexGrow="1">
        {t(label as string)} {paymentLast4}
      </Box>

      <Box
        $flexGrow="1"
        $color={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.375)"
            : "hsla(0, 0%, 100%, 0.375)"
        }
      >
        {expirationDate && t("Expires", { date: expirationDate })}
      </Box>

      <Box>
        <Text
          onClick={() => {
            setDefault(paymentMethod.externalId);
          }}
          $font={theme.typography.link.fontFamily}
          $size={theme.typography.link.fontSize}
          $weight={theme.typography.link.fontWeight}
          $color={theme.typography.link.color}
        >
          {t("Set default")}
        </Text>
      </Box>

      <Box
        $cursor="pointer"
        $paddingLeft="1rem"
        onClick={() => {
          handleDelete(paymentMethod.id);
        }}
      >
        <Icon
          name="close"
          style={{
            fontSize: 28,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)",
          }}
        />
      </Box>
    </Flex>
  );
};

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

const getPaymentMethodData = ({
  accountLast4,
  accountName,
  bankName,
  billingName,
  billingEmail,
  cardBrand,
  cardLast4,
  paymentMethodType,
}: PaymentMethodResponseData) => {
  const cardBrands = new Set(["visa", "mastercard", "amex"]);
  const cardIcon = (icon: IconNameTypes) =>
    icon && cardBrands.has(icon) ? icon : "credit";

  const genericLabel =
    billingName || billingEmail || accountName || bankName || "Payment method";

  const payments: Record<PaymentMethodType, PaymentElementProps> = {
    card: {
      iconName: cardIcon(cardBrand as IconNameTypes),
      iconTitle: cardBrand || "Card",
      label: `Card ending in `,
      paymentLast4: cardLast4,
    },
    us_bank_account: {
      iconName: "bank",
      iconTitle: `${billingEmail} | ${bankName}`,
      label: bankName || billingEmail || "Bank account",
      paymentLast4: accountLast4,
    },
    amazon_pay: {
      iconName: "amazonpay",
      iconTitle: billingName || billingName || "Amazon Pay account",
      label: billingName || billingEmail || "Amazon Pay account",
    },
    cashapp: {
      iconName: "cashapp",
      iconTitle: accountName || billingEmail || "CashApp account",
      label: accountName || billingEmail || "CashApp account",
    },
    paypal: {
      iconName: "paypal",
      iconTitle: accountName || billingEmail || "PayPal account",
      label: accountName || billingEmail || "PayPal account",
    },
    link: {
      iconName: "link",
      iconTitle: billingEmail || accountName || "Link account",
      label: billingEmail || accountName || "Link account",
    },
  };

  return (
    payments[paymentMethodType || ""] ?? {
      iconName: "generic-payment",
      iconTitle: genericLabel,
      label: genericLabel,
    }
  );
};

const getIconStyles = ({
  size,
  theme,
}: {
  size: PaymentElementSizes;
  theme: DefaultTheme;
}) => {
  const iconStyles = {
    lg: { fontSize: 28, marginLeft: -2, marginRight: 8 },
    md: { fontSize: 25, marginLeft: 0, marginRight: 7, marginTop: -1 },
    sm: { fontSize: 24, marginLeft: 0, marginRight: 4 },
  };

  const getIconStyles = (size: PaymentElementSizes) =>
    iconStyles[size] ?? iconStyles.md;

  return {
    ...getIconStyles(size),
    marginRight: 4,
    lineHeight: 1,
    color: theme.typography.text.color,
  };
};

const PaymentMethodElement = ({
  size = "md",
  paymentMethod,
  monthsToExpiration,
  onEdit,
  ...props
}: PaymentMethodElementProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  let sizeFactor = 0.5;
  if (size === "lg") {
    sizeFactor = 1.6;
  }
  if (size === "md") {
    sizeFactor = 1;
  }

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
            {t("Payment Method")}
          </Text>

          {props.functions.showExpiration &&
            typeof monthsToExpiration === "number" &&
            monthsToExpiration < 4 && (
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color="#DB6769"
              >
                {monthsToExpiration > 0
                  ? t("Expires in x months", { months: monthsToExpiration })
                  : t("Expired")}
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
        $padding={`${sizeFactor / 2.2}rem ${sizeFactor}rem`}
        $borderRadius="9999px"
      >
        {paymentMethod && (
          <PaymentElement
            {...getPaymentMethodData(paymentMethod)}
            {...getIconStyles({ size, theme })}
          />
        )}
        {!paymentMethod && <EmptyPaymentElement />}

        {props.functions.allowEdit && onEdit && (
          <Text
            onClick={onEdit}
            $font={theme.typography.link.fontFamily}
            $size={theme.typography.link.fontSize}
            $weight={theme.typography.link.fontWeight}
            $color={theme.typography.link.color}
            $leading={1}
          >
            {t("Edit")}
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
      allowEdit?: boolean;
    }
>(({ children, className, portal, allowEdit = true, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, layout, hydrate, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [top, setTop] = useState(0);
  const [showDifferentPaymentMethods, setShowDifferentPaymentMethods] =
    useState(false);

  const paymentMethod = useMemo(() => {
    return data.subscription?.paymentMethod;
  }, [data.subscription?.paymentMethod]);

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
      const { data: setupIntent } = await api.getSetupIntent({
        componentId: data.component.id,
      });
      setSetupIntent(setupIntent);
      setShowPaymentForm(true);
    } catch {
      setError(
        t("Error initializing payment method change. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, api, data.component?.id]);

  const dropDownDifferentPaymentMethods = useCallback(() => {
    setShowDifferentPaymentMethods((state) => !state);
  }, []);

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

        setLayout("portal");
        hydrate();
      } catch {
        setLayout("payment");
        setError(t("Error updating payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [t, api, hydrate, setLayout],
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
        await hydrate();
      } catch {
        setError(t("Error deleting payment method. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
    [api, hydrate, t],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useLayoutEffect(() => {
    const parent = portal || document.body;
    const value = Math.abs(
      (parent === document.body ? window.scrollY : parent.scrollTop) ?? 0,
    );
    setTop(value);

    parent.style.overflow = ["checkout", "payment"].includes(layout)
      ? "hidden"
      : "";

    return () => {
      parent.style.overflow = "";
    };
  }, [portal, layout]);

  return (
    <Element ref={ref} className={className}>
      <PaymentMethodElement
        paymentMethod={paymentMethod}
        monthsToExpiration={monthsToExpiration}
        {...(allowEdit && { onEdit: () => setLayout("payment") })}
        {...props}
      />

      {layout === "payment" &&
        createPortal(
          <Modal size="md" top={top} onClose={() => setShowPaymentForm(false)}>
            <ModalHeader bordered onClose={() => setShowPaymentForm(false)}>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={19}
                $weight={600}
                $color={theme.typography.text.color}
              >
                {t("Edit payment method")}
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
                {showPaymentForm ? (
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
                      clientSecret:
                        setupIntent?.setupIntentClientSecret as string,
                    }}
                  >
                    <PaymentForm
                      onConfirm={(paymentMethodId) =>
                        updatePaymentMethod(paymentMethodId)
                      }
                    />
                  </Elements>
                ) : (
                  <Flex $flexDirection="column" $gap="2rem">
                    <PaymentMethodElement
                      size="lg"
                      paymentMethod={paymentMethod}
                      monthsToExpiration={monthsToExpiration}
                      {...props}
                    />

                    <Box>
                      <Text
                        onClick={dropDownDifferentPaymentMethods}
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

                    {showDifferentPaymentMethods && (
                      <Flex
                        $flexDirection="column"
                        $overflowY="hidden"
                        $height="10rem"
                      >
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
                      </Flex>
                    )}

                    {(!paymentMethod || showDifferentPaymentMethods) && (
                      <EmbedButton onClick={createSetupIntent} size="lg">
                        {t("Add new payment method")}
                      </EmbedButton>
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
          </Modal>,
          portal || document.body,
        )}
    </Element>
  );
});

PaymentMethod.displayName = "PaymentMethod";
