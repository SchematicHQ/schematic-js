import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  InvoiceStatus,
  type InvoiceResponseData,
} from "../../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed, useTruncatedList } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  ERROR_UNKNOWN,
  formatCurrency,
  isError,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { ExpandListToggle } from "../../shared";
import { Button, Flex, Loader, Text, Tooltip, TransitionBox } from "../../ui";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  date: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  amount: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  limit: {
    isVisible: boolean;
    number: number;
  };
  collapse: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
}

function resolveDesignProps(props: DeepPartial<DesignProps>): DesignProps {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
    },
    date: {
      isVisible: props.date?.isVisible ?? true,
      fontStyle: props.date?.fontStyle ?? "link",
    },
    amount: {
      isVisible: props.amount?.isVisible ?? true,
      fontStyle: props.amount?.fontStyle ?? "text",
    },
    limit: {
      isVisible: props.limit?.isVisible ?? true,
      number: props.limit?.number ?? 2,
    },
    collapse: {
      isVisible: props.collapse?.isVisible ?? true,
      fontStyle: props.collapse?.fontStyle ?? "link",
    },
  };
}

interface FormatInvoiceOptions {
  hideUpcoming?: boolean;
}

export function formatInvoices(
  invoices?: InvoiceResponseData[],
  options?: FormatInvoiceOptions,
) {
  const { hideUpcoming = true } = options || {};
  const now = new Date();

  const excludedStatuses: InvoiceStatus[] = [
    InvoiceStatus.Void,
    InvoiceStatus.Draft,
    InvoiceStatus.Uncollectible,
  ];

  return (invoices || [])
    .filter(({ amountDue, dueDate, externalId, status }) => {
      if (amountDue === 0) return false;
      if (externalId?.startsWith("upcoming_")) return false;
      if (status && excludedStatuses.includes(status as InvoiceStatus))
        return false;
      if (
        hideUpcoming &&
        status !== InvoiceStatus.Paid &&
        !(dueDate && +dueDate <= +now)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.dueDate ?? a.createdAt;
      const dateB = b.dueDate ?? b.createdAt;
      return +dateB - +dateA;
    })
    .map(({ amountDue, dueDate, createdAt, url, currency }) => {
      const formatted = formatCurrency(Math.abs(amountDue), currency);
      return {
        amount: amountDue < 0 ? `(${formatted})` : formatted,
        amountDue,
        date: toPrettyDate(dueDate ?? createdAt),
        url: url || undefined,
      };
    });
}

export type InvoicesProps = DesignProps & {
  data?: InvoiceResponseData[];
};

export const Invoices = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> & {
      data?: InvoiceResponseData[];
    } & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, listInvoices, settings } = useEmbed();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [invoices, setInvoices] = useState(() =>
    formatInvoices(
      data && "invoices" in data
        ? (data.invoices as InvoiceResponseData[])
        : rest.data,
    ),
  );
  // Expanding reveals at most `MAX_VISIBLE_INVOICE_COUNT`, so cap the list
  // before truncating it: the toggle then counts what expanding can actually
  // reach rather than the whole billing history.
  const reachableInvoices = useMemo(
    () => invoices.slice(0, MAX_VISIBLE_INVOICE_COUNT),
    [invoices],
  );
  const visibleInvoices = useTruncatedList(reachableInvoices, {
    limit: props.limit.number,
  });

  const getInvoices = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);

      const response = await listInvoices();

      if (response) {
        setInvoices(formatInvoices(response.data));
      }
    } catch (err) {
      setError(isError(err) ? err : ERROR_UNKNOWN);
    } finally {
      setIsLoading(false);
    }
  }, [listInvoices]);

  useEffect(() => {
    getInvoices();
  }, [getInvoices]);

  // this should be how the below TODO will set invoices
  useEffect(() => {
    if (rest.data) {
      setInvoices(formatInvoices(rest.data));
    }
  }, [rest.data]);

  // ensure shared data updates are tracked
  // used to keep in sync with preview data
  // TODO: move this logic outside of components
  useEffect(() => {
    if (data && "invoices" in data) {
      const invoicesPreviewData = data.invoices as InvoiceResponseData[];
      setInvoices(formatInvoices(invoicesPreviewData));
    }
  }, [data]);

  if (invoices.length === 0) {
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
            {t("There was a problem retrieving your invoices.")}
          </Text>

          <Button
            type="button"
            onClick={() => getInvoices()}
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
            <Flex $flexDirection="column" $gap="1rem">
              {props.header.isVisible && (
                <Flex $justifyContent="space-between" $alignItems="center">
                  <Text display={props.header.fontStyle}>{t("Invoices")}</Text>
                </Flex>
              )}

              {invoices.length > 0 ? (
                <>
                  <Flex $flexDirection="column" $gap="0.5rem">
                    {visibleInvoices.items.map(
                      ({ date, amount, amountDue, url }, index) => {
                        return (
                          <Flex
                            key={index}
                            $justifyContent="space-between"
                            $alignItems="center"
                          >
                            {props.date.isVisible && (
                              <Text
                                display={props.date.fontStyle}
                                {...(url && {
                                  as: "a",
                                  href: url,
                                  target: "_blank",
                                  rel: "noreferrer",
                                })}
                                $color={
                                  url
                                    ? settings.theme.typography.link.color
                                    : settings.theme.typography.text.color
                                }
                              >
                                {date}
                              </Text>
                            )}

                            {props.amount.isVisible && (
                              <Tooltip
                                trigger={
                                  <Text display={props.amount.fontStyle}>
                                    {amount}
                                  </Text>
                                }
                                content={
                                  amountDue < 0
                                    ? t("Invoice credit tooltip")
                                    : t("Invoice charge tooltip")
                                }
                              />
                            )}
                          </Flex>
                        );
                      },
                    )}
                  </Flex>

                  {props.collapse.isVisible && visibleInvoices.canExpand && (
                    <ExpandListToggle
                      isExpanded={visibleInvoices.isExpanded}
                      onToggle={visibleInvoices.toggle}
                      expandLabel={t("See more")}
                      collapseLabel={t("See less")}
                      fontStyle={props.collapse.fontStyle}
                      $gap="0.5rem"
                    />
                  )}
                </>
              ) : (
                <Text display="heading2">{t("No invoices created yet")}</Text>
              )}
            </Flex>
          </TransitionBox>
        )
      )}
    </Element>
  );
});

Invoices.displayName = "Invoices";
