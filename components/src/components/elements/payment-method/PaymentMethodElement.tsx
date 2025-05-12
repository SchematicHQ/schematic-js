import { t } from "i18next";
import { CSSProperties, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type { DefaultTheme } from "styled-components/dist/models/ThemeProvider";

import type { PaymentMethodResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useIsLightBackground } from "../../../hooks";
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
  iconStyles?: CSSProperties;
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
  const theme = useTheme();

  return (
    <Text $font={theme.typography.text.fontFamily} $size={16}>
      <Flex $flexDirection="row" $alignItems="center" $gap="0.5rem">
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
            {t("No payment method added yet")}
          </Box>
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

export const PaymentMethodElement = ({
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
      $gap="0.5rem"
      $borderBottomWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.175)"
          : "hsla(0, 0%, 100%, 0.175)"
      }
      $padding="0.5rem"
      $font={theme.typography.text.fontFamily}
      $color={theme.typography.text.color}
    >
      <Box $paddingLeft="0.5rem" $paddingRight="0.5rem">
        {iconName && (
          <Icon name={iconName} title={iconTitle} style={iconStyles} />
        )}
      </Box>

      <Box $flexGrow="1">
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {t(label as string)} {paymentLast4}
        </Text>
      </Box>

      <Box
        $flexGrow="1"
        $color={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.375)"
            : "hsla(0, 0%, 100%, 0.375)"
        }
      >
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {expirationDate && t("Expires", { date: expirationDate })}
        </Text>
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
