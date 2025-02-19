import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { type BillingSubscriptionDiscountView } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { toPrettyDate, formatCurrency } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Text } from "../../ui";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
    prefix: string;
  };
  price: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  contractEndDate: {
    isVisible: boolean;
    fontStyle: FontStyle;
    prefix: string;
  };
}

function resolveDesignProps(props: RecursivePartial<DesignProps>): DesignProps {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
      prefix: props.header?.prefix ?? "Next bill due",
    },
    price: {
      isVisible: props.price?.isVisible ?? true,
      fontStyle: props.price?.fontStyle ?? "heading1",
    },
    contractEndDate: {
      isVisible: props.contractEndDate?.isVisible ?? true,
      fontStyle: props.contractEndDate?.fontStyle ?? "heading6",
      prefix: props.contractEndDate?.prefix ?? "Contract ends",
    },
  };
}

export type UpcomingBillProps = DesignProps;

export const UpcomingBill = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { upcomingInvoice, discounts } = useMemo(() => {
    const discounts = (
      (data.subscription?.discounts || []) as Pick<
        BillingSubscriptionDiscountView,
        | "amountOff"
        | "couponId"
        | "customerFacingCode"
        | "isActive"
        | "percentOff"
      >[]
    ).map((discount) => ({
      amountOff: discount.amountOff,
      couponId: discount.couponId,
      customerFacingCode: discount.customerFacingCode,
      isActive: discount.isActive,
      percentOff: discount.percentOff,
    }));

    return {
      discounts,
      upcomingInvoice: {
        ...(typeof data.upcomingInvoice?.amountDue === "number" && {
          amountDue: data.upcomingInvoice.amountDue,
        }),
        ...(data.subscription?.interval && {
          interval: data.subscription.interval,
        }),
        ...(data.upcomingInvoice?.dueDate && {
          dueDate: toPrettyDate(new Date(data.upcomingInvoice.dueDate)),
        }),
        currency: data.upcomingInvoice?.currency,
      },
    };
  }, [data.subscription, data.upcomingInvoice]);

  if (
    typeof upcomingInvoice.amountDue !== "number" ||
    !upcomingInvoice.dueDate
  ) {
    return null;
  }

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="1rem"
    >
      {props.header.isVisible && (
        <Flex $justifyContent="space-between" $alignItems="center">
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            {props.header.prefix} {upcomingInvoice.dueDate}
          </Text>
        </Flex>
      )}

      <Flex $justifyContent="space-between" $alignItems="start" $gap="1rem">
        {props.price.isVisible && (
          <Flex $alignItems="end" $flexGrow="1">
            <Text
              $font={theme.typography[props.price.fontStyle].fontFamily}
              $size={theme.typography[props.price.fontStyle].fontSize}
              $weight={theme.typography[props.price.fontStyle].fontWeight}
              $color={theme.typography[props.price.fontStyle].color}
              $leading={1}
            >
              {formatCurrency(
                upcomingInvoice.amountDue,
                upcomingInvoice.currency,
              )}
            </Text>
          </Flex>
        )}

        <Box $lineHeight={1.15} $maxWidth="10rem" $textAlign="right">
          <Text
            $font={theme.typography[props.contractEndDate.fontStyle].fontFamily}
            $size={theme.typography[props.contractEndDate.fontStyle].fontSize}
            $weight={
              theme.typography[props.contractEndDate.fontStyle].fontWeight
            }
            $color={theme.typography[props.contractEndDate.fontStyle].color}
            $leading={1}
          >
            {t("Estimated bill.")}
          </Text>
        </Box>
      </Flex>

      <Flex $justifyContent="space-between" $alignItems="center">
        <Box>
          <Text
            $font={theme.typography.text.fontFamily}
            $size={theme.typography.text.fontSize}
            $weight={600}
            $color={theme.typography.text.color}
          >
            {t("Discount")}
          </Text>
        </Box>
        <Box>
          {discounts.map((discount) => (
            <Flex key={discount.couponId} $alignItems="center" $gap="0.5rem">
              <Flex
                $alignItems="center"
                $padding="0.1875rem 0.375rem"
                $borderWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.15)"
                    : "hsla(0, 0%, 100%, 0.15)"
                }
                $borderRadius="0.3125rem"
              >
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={0.75 * theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  {discount.customerFacingCode}
                </Text>
              </Flex>

              <Box>
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  {t("Percent off", { percent: discount.percentOff })}
                </Text>
              </Box>
            </Flex>
          ))}
        </Box>
      </Flex>
    </Element>
  );
});

UpcomingBill.displayName = "UpcomingBill";
