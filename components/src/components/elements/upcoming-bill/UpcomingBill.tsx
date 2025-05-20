import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { type InvoiceResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { formatCurrency, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Box, Button, Flex, Loader, Text } from "../../ui";

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

  const { api, data } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [upcomingInvoice, setUpcomingInvoice] = useState<InvoiceResponseData>();

  const { discounts } = useMemo(() => {
    const discounts = (data.subscription?.discounts || []).map((discount) => ({
      amountOff: discount.amountOff,
      couponId: discount.couponId,
      customerFacingCode: discount.customerFacingCode,
      isActive: discount.isActive,
      percentOff: discount.percentOff,
    }));

    return {
      discounts,
    };
  }, [data.subscription]);

  const loadInvoice = useCallback(async () => {
    if (!api || !data.component?.id) {
      return;
    }

    try {
      setError(undefined);
      setIsLoading(true);
      const response = await api.hydrateUpcomingInvoice({
        componentId: data.component.id,
      });
      setUpcomingInvoice(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, data.component?.id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="1rem"
    >
      {error ? (
        <Flex
          $flexDirection="column"
          $justifyContent="center"
          $alignItems="center"
          $gap="1rem"
        >
          <Text $weight={500} $color="#DB6669">
            {t("There was a problem retrieving your upcoming invoice.")}
          </Text>
          <Button
            onClick={() => loadInvoice()}
            $size="sm"
            $variant="ghost"
            $fullWidth={false}
          >
            {t("Try again")}
          </Button>
        </Flex>
      ) : upcomingInvoice ? (
        <>
          {props.header.isVisible && upcomingInvoice.dueDate && (
            <Flex $justifyContent="space-between" $alignItems="center">
              <Text display={props.header.fontStyle}>
                {props.header.prefix} {toPrettyDate(upcomingInvoice.dueDate)}
              </Text>
            </Flex>
          )}

          <Flex $justifyContent="space-between" $alignItems="start" $gap="1rem">
            {props.price.isVisible && (
              <Flex $alignItems="end" $flexGrow="1">
                <Text display={props.price.fontStyle} $leading={1}>
                  {formatCurrency(
                    upcomingInvoice.amountDue,
                    upcomingInvoice.currency,
                  )}
                </Text>
              </Flex>
            )}

            <Box $lineHeight={1.15} $maxWidth="10rem" $textAlign="right">
              <Text display={props.contractEndDate.fontStyle} $leading={1}>
                {t("Estimated bill.")}
              </Text>
            </Box>
          </Flex>
        </>
      ) : (
        <Flex $justifyContent="center" $alignItems="center">
          <Loader $color={theme.primary} $isLoading={isLoading} />
        </Flex>
      )}

      {discounts.length > 0 && (
        <Flex $justifyContent="space-between" $alignItems="center">
          <Box>
            <Text $weight={600}>{t("Discount")}</Text>
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
                  <Text $size={0.75 * theme.typography.text.fontSize}>
                    {discount.customerFacingCode}
                  </Text>
                </Flex>

                <Box>
                  <Text>
                    {t("Percent off", { percent: discount.percentOff })}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Box>
        </Flex>
      )}
    </Element>
  );
});

UpcomingBill.displayName = "UpcomingBill";
