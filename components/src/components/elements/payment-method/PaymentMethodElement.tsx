import { t } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type PaymentMethodResponseData } from "../../../api/checkoutexternal";
import { type FontStyle, type ThemeSettings } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Box, Flex, Icon, IconNameTypes, Text } from "../../ui";

type PaymentMethodType =
  | "card"
  | "us_bank_account"
  | "amazon_pay"
  | "cashapp"
  | "paypal"
  | "link"
  | string;

type PaymentElementSizes = "sm" | "md" | "lg";

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

interface PaymentElementProps {
  iconName?: IconNameTypes;
  iconTitle?: string;
  iconStyles?: React.CSSProperties;
  label?: string;
  paymentLast4?: string | null;
}

const PaymentElement = ({
  iconName,
  iconTitle,
  iconStyles,
  label,
  paymentLast4,
}: PaymentElementProps) => {
  return (
    <Text>
      <Flex $flexDirection="row" $alignItems="center" $gap="0.5rem">
        {iconName && (
          <Box>
            <Icon name={iconName} title={iconTitle} style={iconStyles} />
          </Box>
        )}

        {(label || paymentLast4) && (
          <Box $flexGrow={1}>
            {label && <Text>{label}</Text>}{" "}
            {paymentLast4 && <Text>{paymentLast4}</Text>}
          </Box>
        )}
      </Flex>
    </Text>
  );
};

const EmptyPaymentElement = () => {
  return (
    <Text>
      <Flex $flexDirection="row" $alignItems="center">
        <Flex $alignItems="center">
          <Box $lineHeight={1}>{t("No payment method added yet")}</Box>
        </Flex>
      </Flex>
    </Text>
  );
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
      label: "Card ending in",
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
      iconTitle: billingName || billingEmail || "Amazon Pay account",
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
  theme: ThemeSettings;
}) => {
  const iconStyles = {
    sm: { fontSize: 24 },
    md: { fontSize: 28 },
    lg: { fontSize: 32 },
  };

  return {
    ...iconStyles[size],
    lineHeight: 1,
    color: theme.typography.text.color,
  };
};

export const PaymentMethodElement = ({
  size = "md",
  paymentMethod,
  monthsToExpiration,
  onEdit,
  ...props
}: PaymentMethodElementProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const sizeFactor = useMemo(() => {
    if (size === "lg") {
      return 1.5;
    }
    if (size === "md") {
      return 1;
    }

    return 0.5;
  }, [size]);

  return (
    <Flex $flexDirection="column" $gap={`${sizeFactor}rem`}>
      {props.header.isVisible && (
        <Flex $justifyContent="space-between" $alignItems="center">
          <Text display={props.header.fontStyle}>{t("Payment Method")}</Text>

          {props.functions.showExpiration &&
            typeof monthsToExpiration === "number" &&
            monthsToExpiration < 4 && (
              <Text $size={14} $color="#DB6769">
                {monthsToExpiration > 0
                  ? t("Expires in X months", { months: monthsToExpiration })
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
        $padding={`${sizeFactor / 2.25}rem ${sizeFactor}rem`}
        $borderRadius="9999px"
      >
        {paymentMethod ? (
          <PaymentElement
            {...getPaymentMethodData(paymentMethod)}
            iconStyles={getIconStyles({ size, theme: settings.theme })}
          />
        ) : (
          <EmptyPaymentElement />
        )}

        {props.functions.allowEdit && onEdit && (
          <Text
            onClick={onEdit}
            onKeyDown={createKeyboardExecutionHandler(onEdit)}
            display="link"
            $leading={1}
          >
            {paymentMethod ? t("Edit") : t("Add")}
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

interface PaymentElementListProps {
  paymentMethod: PaymentMethodResponseData;
  setDefault: (id: string) => void;
  handleDelete: (id: string) => void;
}

export const PaymentListElement = ({
  paymentMethod,
  setDefault,
  handleDelete,
}: PaymentElementListProps) => {
  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { iconName, iconTitle, label, paymentLast4 } =
    getPaymentMethodData(paymentMethod);
  const iconStyles = getIconStyles({ size: "lg", theme: settings.theme });

  const expirationDate = useMemo(() => {
    const { cardExpMonth, cardExpYear } = paymentMethod;
    if (!cardExpMonth || !cardExpYear) {
      return;
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
      $gap="0.5rem"
      $padding="0.5rem 0"
      $borderWidth="0 0 1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.175)"
          : "hsla(0, 0%, 100%, 0.175)"
      }
    >
      {iconName && (
        <Box>
          <Icon name={iconName} title={iconTitle} style={iconStyles} />
        </Box>
      )}

      {(label || paymentLast4) && (
        <Box $flexGrow={1}>
          {label && <Text>{label}</Text>}{" "}
          {paymentLast4 && <Text>{paymentLast4}</Text>}
        </Box>
      )}

      {expirationDate && (
        <Box
          $flexGrow={1}
          $color={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.375)"
              : "hsla(0, 0%, 100%, 0.375)"
          }
        >
          <Text>{t("Expires", { date: expirationDate })}</Text>
        </Box>
      )}

      <Box>
        <Text
          onClick={() => {
            setDefault(paymentMethod.externalId);
          }}
          onKeyDown={createKeyboardExecutionHandler(() =>
            setDefault(paymentMethod.externalId),
          )}
          display="link"
        >
          {t("Set default")}
        </Text>
      </Box>

      <Box
        tabIndex={0}
        onClick={() => {
          handleDelete(paymentMethod.id);
        }}
        onKeyDown={createKeyboardExecutionHandler(() =>
          handleDelete(paymentMethod.id),
        )}
        $cursor="pointer"
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
