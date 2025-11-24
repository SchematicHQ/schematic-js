import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type CurrencyBalance,
  type InvoiceResponseData,
} from "../../../api/checkoutexternal";
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

  const { data, settings, debug, getUpcomingInvoice, getCustomerBalance } =
    useEmbed();

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [upcomingInvoice, setUpcomingInvoice] = useState<InvoiceResponseData>();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);

  const discounts = useMemo(() => {
    return (data?.subscription?.discounts || []).map((discount) => ({
      couponId: discount.couponId,
      customerFacingCode: discount.customerFacingCode || undefined,
      currency: discount.currency || undefined,
      amountOff: discount.amountOff ?? undefined,
      percentOff: discount.percentOff ?? undefined,
      isActive: discount.isActive,
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

  const getBalances = useCallback(async () => {
    if (data?.subscription && !data.subscription.cancelAt) {
      try {
        const response = await getCustomerBalance();

        if (response) {
          setBalances(response.data.balances);
        }
      } catch (err) {
        debug("Failed to fetch customer balance.", err);
      }
    }
  }, [data?.subscription, debug, getCustomerBalance]);

  useEffect(() => {
    getInvoice();
  }, [getInvoice]);

  useEffect(() => {
    getBalances();
  }, [getBalances]);

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
                    <Text display={props.price.fontStyle} $leading={1}>
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

                {balances.length > 0 && (
                  <Flex
                    as={TransitionBox}
                    $justifyContent="space-between"
                    $alignItems="start"
                    $gap="1rem"
                  >
                    <Text $weight={600}>{t("Remaining balance")}</Text>

                    <Flex $flexDirection="column" $gap="0.5rem">
                      {balances.map((item, idx) => (
                        <Text key={idx}>
                          {formatCurrency(item.balance, item.currency)}
                        </Text>
                      ))}
                    </Flex>
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
                      {discounts.reduce(
                        (acc: React.ReactElement[], discount) => {
                          if (
                            typeof discount.percentOff === "number" ||
                            typeof discount.amountOff === "number"
                          ) {
                            acc.push(
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
                                    {typeof discount.percentOff === "number"
                                      ? t("Percent off", {
                                          percent: discount.percentOff,
                                        })
                                      : t("Amount off", {
                                          amount: formatCurrency(
                                            discount.amountOff as number, // we already checked for `number` type
                                            discount?.currency,
                                          ),
                                        })}
                                  </Text>
                                </Box>
                              </Flex>,
                            );
                          }

                          return acc;
                        },
                        [],
                      )}
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
