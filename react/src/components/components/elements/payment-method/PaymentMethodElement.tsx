import { t } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  type CheckoutFieldWithValue,
  type PaymentMethodResponseData,
} from "../../../api/checkoutexternal";
import { getPaymentMethodData } from "../../../composable/payment-method";
import { type FontStyle } from "../../../embed";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Box, Flex, Icon, Text, type IconNames } from "../../ui";

type PaymentElementSizes = "sm" | "md" | "lg";

export interface DesignProps {
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
  customCheckoutFields?: CheckoutFieldWithValue[];
  size?: PaymentElementSizes;
  paymentMethod?: PaymentMethodResponseData;
  monthsToExpiration?: number;
  onEdit?: () => void;
  onRemove?: () => void;
}

interface PaymentElementProps {
  iconName?: IconNames | string;
  iconTitle?: string;
  label?: string;
  paymentLast4?: string | null;
}

const PaymentElement = ({
  iconName,
  iconTitle,
  label,
  paymentLast4,
}: PaymentElementProps) => {
  const { settings } = useEmbed();

  return (
    <Flex $flexDirection="row" $alignItems="center" $gap="0.5rem">
      {iconName && (
        <Icon
          name={iconName}
          title={iconTitle}
          color={settings.theme.typography.text.color}
        />
      )}

      {(label || paymentLast4) && (
        <Box $flexGrow={1}>
          {label && <Text>{label}</Text>}{" "}
          {paymentLast4 && <Text>{paymentLast4}</Text>}
        </Box>
      )}
    </Flex>
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

export const PaymentMethodElement = ({
  customCheckoutFields,
  size = "md",
  paymentMethod,
  monthsToExpiration,
  onEdit,
  onRemove,
  ...props
}: PaymentMethodElementProps) => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const sizeFactor = size === "lg" ? 1.5 : size === "md" ? 1 : 0.5;

  const hasCustomFields =
    customCheckoutFields && customCheckoutFields.length > 0;

  return (
    <Flex $flexDirection="column" $gap={`${sizeFactor}rem`}>
      {props.header.isVisible && (
        <Flex $justifyContent="space-between" $alignItems="center">
          <Text display={props.header.fontStyle}>{t("Payment Details")}</Text>

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
          <PaymentElement {...getPaymentMethodData(paymentMethod)} />
        ) : (
          <EmptyPaymentElement />
        )}

        {onRemove && (
          <Text
            onClick={onRemove}
            onKeyDown={createKeyboardExecutionHandler(onRemove)}
            display="link"
            $leading="none"
          >
            {t("Remove")}
          </Text>
        )}

        {props.functions.allowEdit && onEdit && (
          <Text
            onClick={onEdit}
            onKeyDown={createKeyboardExecutionHandler(onEdit)}
            display="link"
            $leading="none"
          >
            {paymentMethod ? t("Edit") : t("Add")}
          </Text>
        )}
      </Flex>

      {hasCustomFields && (
        <Flex $flexDirection="column" $gap="0.75rem" $marginTop="0.5rem">
          {customCheckoutFields.map((field) => (
            <Flex key={field.id} $flexDirection="column" $gap="0.125rem">
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
                {field.value != null && field.value !== "" ? (
                  field.value
                ) : (
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
      $marginRight="2px" // prevents the focus ring of the removal icon from being cut off
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
        <Icon
          name={iconName}
          title={iconTitle}
          color={settings.theme.typography.text.color}
        />
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

      <Icon
        tabIndex={0}
        onClick={() => {
          handleDelete(paymentMethod.id);
        }}
        onKeyDown={createKeyboardExecutionHandler(() =>
          handleDelete(paymentMethod.id),
        )}
        style={{ cursor: "pointer" }}
        name="close"
        size="lg"
        color={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.275)"
            : "hsla(0, 0%, 100%, 0.275)"
        }
      />
    </Flex>
  );
};
