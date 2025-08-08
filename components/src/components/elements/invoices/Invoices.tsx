import { forwardRef, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { type InvoiceResponseData } from "../../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  ERROR_UNKNOWN,
  createKeyboardExecutionHandler,
  formatCurrency,
  isError,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { Button, Flex, Icon, Loader, Text, TransitionBox } from "../../ui";

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

function formatInvoices(
  invoices?: InvoiceResponseData[],
  options?: FormatInvoiceOptions,
) {
  const { hideUpcoming = true } = options || {};
  const now = new Date();

  return (invoices || [])
    .filter(({ dueDate }) => !hideUpcoming || (dueDate && +dueDate <= +now))
    .sort((a, b) => (a.dueDate && b.dueDate ? +b.dueDate - +a.dueDate : 1))
    .map(({ amountDue, dueDate, url, currency }) => ({
      amount: formatCurrency(amountDue, currency),
      date: dueDate ? toPrettyDate(dueDate) : undefined,
      url: url || undefined,
    }));
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
>(({ className, data, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { listInvoices, settings } = useEmbed();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [invoices, setInvoices] = useState(() => formatInvoices(data));
  const [listSize, setListSize] = useState(props.limit.number);

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

  const toggleListSize = () => {
    setListSize((prev) =>
      prev !== props.limit.number
        ? props.limit.number
        : MAX_VISIBLE_INVOICE_COUNT,
    );
  };

  useEffect(() => {
    getInvoices();
  }, [getInvoices]);

  useEffect(() => {
    setInvoices(formatInvoices(data));
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
                    {invoices
                      .slice(0, listSize)
                      .map(({ date, amount, url }, index) => {
                        return (
                          <Flex key={index} $justifyContent="space-between">
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
                              <Text display={props.amount.fontStyle}>
                                {amount}
                              </Text>
                            )}
                          </Flex>
                        );
                      })}
                  </Flex>

                  {props.collapse.isVisible &&
                    invoices.length > props.limit.number && (
                      <Flex $alignItems="center" $gap="0.5rem">
                        <Icon
                          name={`chevron-${listSize === props.limit.number ? "down" : "up"}`}
                          color="#D0D0D0"
                        />

                        <Text
                          onClick={toggleListSize}
                          onKeyDown={createKeyboardExecutionHandler(
                            toggleListSize,
                          )}
                          display={props.collapse.fontStyle}
                        >
                          {listSize === props.limit.number
                            ? t("See more")
                            : t("See less")}
                        </Text>
                      </Flex>
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
