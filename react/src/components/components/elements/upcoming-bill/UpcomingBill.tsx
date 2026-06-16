import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import {
  UpcomingBill as UpcomingBillPrimitive,
  useUpcomingBill,
} from "../../../composable/upcoming-bill";
import { type FontStyle } from "../../../embed";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { formatCurrency, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Box, Button, Flex, Loader, Text, TransitionBox } from "../../ui";

export interface DesignProps {
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

  return (
    <UpcomingBillPrimitive.Root>
      <UpcomingBillBody ref={ref} design={props} className={className} />
    </UpcomingBillPrimitive.Root>
  );
});

UpcomingBill.displayName = "UpcomingBill";

interface UpcomingBillBodyProps {
  design: DesignProps;
  className?: string;
}

const UpcomingBillBody = forwardRef<
  HTMLDivElement | null,
  UpcomingBillBodyProps
>(({ design, className }, ref) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const {
    isVisible,
    isLoading,
    error,
    upcomingInvoice,
    balances,
    discounts,
    retry: getInvoice,
  } = useUpcomingBill();

  if (!isVisible) {
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
                {design.header.isVisible && upcomingInvoice.dueDate && (
                  <Text display={design.header.fontStyle}>
                    {design.header.prefix}{" "}
                    {toPrettyDate(upcomingInvoice.dueDate)}
                  </Text>
                )}

                <Flex
                  $justifyContent="space-between"
                  $alignItems="start"
                  $gap="1rem"
                >
                  {design.price.isVisible && (
                    <Text display={design.price.fontStyle} $leading="none">
                      {formatCurrency(
                        upcomingInvoice.amountDue,
                        upcomingInvoice.currency,
                      )}
                    </Text>
                  )}

                  <Box $maxWidth="10rem" $textAlign="right">
                    <Text display={design.contractEndDate.fontStyle}>
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

UpcomingBillBody.displayName = "UpcomingBillBody";
