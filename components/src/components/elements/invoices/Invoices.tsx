import { forwardRef, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { type InvoiceResponseData } from "../../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { formatCurrency, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Flex, Icon, Text } from "../../ui";

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

function resolveDesignProps(props: RecursivePartial<DesignProps>): DesignProps {
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

function formatInvoices(invoices: InvoiceResponseData[] = []) {
  return invoices
    .sort((a, b) => (a.dueDate && b.dueDate ? +b.dueDate - +a.dueDate : 1))
    .map(({ amountDue, dueDate, url, currency }) => ({
      amount: formatCurrency(amountDue, currency),
      ...(dueDate && { date: toPrettyDate(dueDate) }),
      ...(url && { url }),
    }));
}

export type InvoicesProps = DesignProps & {
  data?: InvoiceResponseData[];
};

export const Invoices = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> & {
      data?: InvoiceResponseData[];
    } & React.HTMLAttributes<HTMLDivElement>
>(({ className, data, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { listInvoices, settings } = useEmbed();

  const [invoices, setInvoices] = useState(() => formatInvoices(data));
  const [listSize, setListSize] = useState(props.limit.number);

  const getInvoices = useCallback(
    async function getInvoices() {
      const response = await listInvoices();
      if (response) {
        setInvoices(formatInvoices(response.data));
      }
    },
    [listInvoices],
  );

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

  return (
    <Element ref={ref} className={className}>
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
                      {props.date.isVisible && date && (
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
                        <Text display={props.amount.fontStyle}>{amount}</Text>
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
                    style={{ color: "#D0D0D0" }}
                  />

                  <Text
                    onClick={toggleListSize}
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
    </Element>
  );
});

Invoices.displayName = "Invoices";
