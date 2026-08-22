import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type UpcomingInvoiceResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  ERROR_UNKNOWN,
  formatCurrency,
  isError,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { Box, Button, Flex, Loader, Text, TransitionBox } from "../../ui";

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

function resolveDesignProps(props: DeepPartial<DesignProps>): DesignProps {
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
  ElementProps & DeepPartial<DesignProps> & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, getUpcomingInvoice } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [upcomingInvoice, setUpcomingInvoice] = useState<
    UpcomingInvoiceResponseData | undefined
  >(data?.upcomingInvoice);

  const discounts = useMemo(() => {
    return (data?.subscription?.discounts || [])
      .filter(
        (discount) =>
          // Only surface discounts that are currently active and actually
          // reduce the bill; the API computes `isActive` at read time, so an
          // expired coupon must not linger in the account summary.
          discount.isActive &&
          ((typeof discount.percentOff === "number" &&
            discount.percentOff > 0) ||
            (typeof discount.amountOff === "number" && discount.amountOff > 0)),
      )
      .map((discount) => ({
        couponId: discount.couponId,
        customerFacingCode: discount.customerFacingCode || undefined,
        currency: discount.currency || undefined,
        amountOff: discount.amountOff ?? undefined,
        percentOff: discount.percentOff ?? undefined,
        duration: discount.duration,
        durationInMonths: discount.durationInMonths ?? undefined,
      }));
  }, [data?.subscription?.discounts]);

  const getInvoice = useCallback(async () => {
    if (
      data?.component?.id &&
      data?.subscription &&
      !data.subscription.cancelAt
    ) {
      try {
        setError(undefined);
        setIsLoading(true);

        const response = await getUpcomingInvoice(data.component.id);

        if (response) {
          setUpcomingInvoice(response.data);
        }
      } catch (err) {
        setError(isError(err) ? err : ERROR_UNKNOWN);
      } finally {
        setIsLoading(false);
      }
    }
  }, [data?.component?.id, data?.subscription, getUpcomingInvoice]);

  useEffect(() => {
    getInvoice();
  }, [getInvoice]);

  // ensure shared data updates are tracked
  // used to keep in sync with preview data
  // TODO: move this logic outside of components
  useEffect(() => {
    if (data?.upcomingInvoice) {
      setUpcomingInvoice(data.upcomingInvoice);
    }
  }, [data?.upcomingInvoice]);

  const { currency, applied, remaining } = useMemo(() => {
    const currency = upcomingInvoice?.currency;
    // Stripe balances are negative when the customer holds credit.
    const startingBalance = upcomingInvoice?.startingBalance ?? 0;
    const endingBalance = upcomingInvoice?.endingBalance ?? 0;
    const credit = Math.max(0, -startingBalance);
    const subtotal = Math.max(0, upcomingInvoice?.subtotal ?? 0);

    // Stripe only sets `ending_balance` once an invoice is finalized. On the
    // upcoming (preview) invoice it comes back as 0, so derive the amount
    // applied from the starting balance and the invoice subtotal in that case.
    const applied =
      endingBalance < 0 ? credit + endingBalance : Math.min(credit, subtotal);

    return { currency, applied, remaining: credit - applied };
  }, [
    upcomingInvoice?.currency,
    upcomingInvoice?.startingBalance,
    upcomingInvoice?.endingBalance,
    upcomingInvoice?.subtotal,
  ]);

  const hasApplied = applied > 0;
  const hasBalance = remaining > 0 || applied > 0;

  if (!data?.subscription || data.subscription.cancelAt) {
    return null;
  }

  return (
    <Element ref={ref} className={className}>
      <Flex as={TransitionBox} $justifyContent="center" $alignItems="center">
        <Loader $color={settings.theme.primary} $isLoading={isLoading} />
      </Flex>

      {error ? (
        <Flex
          as={TransitionBox}
          $flexDirection="column"
          $justifyContent="center"
          $alignItems="center"
          $gap="1rem"
        >
          <Text $weight={500} $color="#DB6669">
            {t("There was a problem retrieving your upcoming invoice.")}
          </Text>

          <Button
            type="button"
            onClick={() => getInvoice()}
            $size="sm"
            $variant="ghost"
            $fullWidth={false}
          >
            {t("Try again")}
          </Button>
        </Flex>
      ) : (
        !isLoading && (
          <TransitionBox>
            {upcomingInvoice ? (
              <Flex $flexDirection="column" $gap="1rem">
                {props.header.isVisible && upcomingInvoice.dueDate && (
                  <Text display={props.header.fontStyle}>
                    {props.header.prefix}{" "}
                    {toPrettyDate(upcomingInvoice.dueDate)}
                  </Text>
                )}

                <Flex
                  $justifyContent="space-between"
                  $alignItems="start"
                  $gap="1rem"
                >
                  {props.price.isVisible && (
                    <Text display={props.price.fontStyle} $leading="none">
                      {formatCurrency(
                        upcomingInvoice.amountDue,
                        upcomingInvoice.currency,
                      )}
                    </Text>
                  )}

                  <Box $maxWidth="10rem" $textAlign="right">
                    <Text display={props.contractEndDate.fontStyle}>
                      {t("Estimated bill")}
                    </Text>
                  </Box>
                </Flex>

                {hasApplied && (
                  <Flex
                    as={TransitionBox}
                    $justifyContent="space-between"
                    $alignItems="start"
                    $gap="1rem"
                  >
                    <Text $weight={600}>
                      {t("Applied balance towards next invoice")}
                    </Text>

                    <Text>{formatCurrency(-applied, currency)}</Text>
                  </Flex>
                )}

                {hasBalance && (
                  <Flex
                    as={TransitionBox}
                    $justifyContent="space-between"
                    $alignItems="start"
                    $gap="1rem"
                  >
                    <Text $weight={600}>
                      {t("Remaining balance after next invoice")}
                    </Text>

                    <Text>{formatCurrency(remaining, currency)}</Text>
                  </Flex>
                )}

                {discounts.length > 0 && (
                  <Flex
                    $justifyContent="space-between"
                    $alignItems="start"
                    $gap="1rem"
                  >
                    <Text $weight={600}>{t("Discount")}</Text>

                    <Flex
                      $flexDirection="column"
                      $alignItems="end"
                      $gap="0.5rem"
                    >
                      {discounts.map((discount) => {
                        const label =
                          typeof discount.percentOff === "number" &&
                          discount.percentOff > 0
                            ? t("Percent off", {
                                percent: discount.percentOff,
                              })
                            : t("Amount off", {
                                amount: formatCurrency(
                                  discount.amountOff as number, // active discounts always carry a positive amount or percent
                                  discount?.currency,
                                ),
                              });

                        return (
                          <Flex
                            key={discount.couponId}
                            $alignItems="center"
                            $gap="0.5rem"
                          >
                            {discount.customerFacingCode && (
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
                                  $size={
                                    0.75 *
                                    settings.theme.typography.text.fontSize
                                  }
                                  style={{ textTransform: "uppercase" }}
                                >
                                  {discount.customerFacingCode}
                                </Text>
                              </Flex>
                            )}

                            <Box>
                              <Text>
                                {discount.duration === "repeating" &&
                                discount.durationInMonths
                                  ? t("Discount for months", {
                                      discount: label,
                                      count: discount.durationInMonths,
                                    })
                                  : label}
                              </Text>
                            </Box>
                          </Flex>
                        );
                      })}
                    </Flex>
                  </Flex>
                )}
              </Flex>
            ) : (
              <Text display="heading2">{t("No upcoming invoice")}</Text>
            )}
          </TransitionBox>
        )
      )}
    </Element>
  );
});

UpcomingBill.displayName = "UpcomingBill";
