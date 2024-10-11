import { forwardRef, useEffect, useState } from "react";
import { useTheme } from "styled-components";
import { type ListInvoicesResponse } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Icon, Flex, Text } from "../../ui";

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

function formatInvoices(invoices?: ListInvoicesResponse["data"]) {
  return (invoices || []).map(({ amountDue, dueDate, url }) => ({
    ...(dueDate && { date: toPrettyDate(dueDate) }),
    amount: formatCurrency(amountDue),
    url,
  }));
}

interface InvoiceDateProps {
  date: string;
  fontStyle: FontStyle;
  url?: string | null;
}

const InvoiceDate = ({ date, fontStyle, url }: InvoiceDateProps) => {
  const theme = useTheme();

  const dateText = (
    <Text
      $font={theme.typography[fontStyle].fontFamily}
      $size={theme.typography[fontStyle].fontSize}
      $weight={theme.typography[fontStyle].fontWeight}
      $color={theme.typography[fontStyle].color}
    >
      {date}
    </Text>
  );

  if (url) {
    <a href={url} target="_blank">
      {dateText}
    </a>;
  }

  return dateText;
};

export type InvoicesProps = DesignProps & {
  data?: ListInvoicesResponse["data"];
};

export const Invoices = forwardRef<
  HTMLDivElement | null,
  ElementProps & InvoicesProps & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  const { api } = useEmbed();

  const [invoices, setInvoices] = useState(() => formatInvoices(rest.data));

  useEffect(() => {
    api?.listInvoices().then(({ data }) => {
      setInvoices(formatInvoices(data));
    });
  }, [api]);

  return (
    <Element ref={ref} className={className}>
      <Flex $flexDirection="column" $gap="1rem">
        {props.header.isVisible && (
          <Flex $justifyContent="space-between" $alignItems="center">
            <Text
              $font={theme.typography[props.header.fontStyle].fontFamily}
              $size={theme.typography[props.header.fontStyle].fontSize}
              $weight={theme.typography[props.header.fontStyle].fontWeight}
              $color={theme.typography[props.header.fontStyle].color}
            >
              Invoices
            </Text>
          </Flex>
        )}

        <Flex $flexDirection="column" $gap="0.5rem">
          {invoices
            .slice(
              0,
              (props.limit.isVisible && props.limit.number) || invoices.length,
            )
            .map(({ date, amount, url }, index) => {
              return (
                <Flex key={index} $justifyContent="space-between">
                  {props.date.isVisible && date && (
                    <InvoiceDate
                      date={date}
                      fontStyle={props.date.fontStyle}
                      url={url}
                    />
                  )}

                  {props.amount.isVisible && (
                    <Text
                      $font={
                        theme.typography[props.amount.fontStyle].fontFamily
                      }
                      $size={theme.typography[props.amount.fontStyle].fontSize}
                      $weight={
                        theme.typography[props.amount.fontStyle].fontWeight
                      }
                      $color={theme.typography[props.amount.fontStyle].color}
                    >
                      {amount}
                    </Text>
                  )}
                </Flex>
              );
            })}
        </Flex>

        {props.collapse.isVisible && (
          <Flex $alignItems="center" $gap="0.5rem">
            <Icon name="chevron-down" style={{ color: "#D0D0D0" }} />

            <Text
              $font={theme.typography[props.collapse.fontStyle].fontFamily}
              $size={theme.typography[props.collapse.fontStyle].fontSize}
              $weight={theme.typography[props.collapse.fontStyle].fontWeight}
              $color={theme.typography[props.collapse.fontStyle].color}
            >
              See all
            </Text>
          </Flex>
        )}
      </Flex>
    </Element>
  );
});

Invoices.displayName = "Invoices";
