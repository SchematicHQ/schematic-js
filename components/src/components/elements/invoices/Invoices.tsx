import { forwardRef, useEffect, useState } from "react";
import { useTheme } from "styled-components";
import { type ListInvoicesResponse } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency, toPrettyDate } from "../../../utils";
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

function formatInvoices(invoices: ListInvoicesResponse["data"]) {
  return invoices.map(({ amountDue, dueDate }) => ({
    ...(dueDate && { date: toPrettyDate(dueDate) }),
    amount: formatCurrency(amountDue),
  }));
}

export type InvoicesProps = DesignProps;

export const Invoices = forwardRef<
  HTMLDivElement | null,
  ElementProps & InvoicesProps & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  const { api, data } = useEmbed();

  const [invoices, setInvoices] = useState<
    {
      date?: string;
      amount?: string;
    }[]
  >(() => {
    const date = new Date();
    const amount = formatCurrency(
      data.subscription?.latestInvoice?.amountDue ?? 2000,
    );
    const period = data.company?.plan?.planPeriod ?? "month";
    console.debug("planPeriod", period);

    return new Array(6).fill(0).map(() => {
      date.setMonth(date.getMonth() - 1);

      return {
        date: toPrettyDate(date),
        amount,
      };
    });
  });

  useEffect(() => {
    api?.listInvoices().then(({ data }) => {
      setInvoices(formatInvoices(data));
    });
  }, [api]);

  return (
    <div ref={ref} className={className}>
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
            .map(({ date, amount }, index) => {
              return (
                <Flex key={index} $justifyContent="space-between">
                  {props.date.isVisible && (
                    <Text
                      $font={theme.typography[props.date.fontStyle].fontFamily}
                      $size={theme.typography[props.date.fontStyle].fontSize}
                      $weight={
                        theme.typography[props.date.fontStyle].fontWeight
                      }
                      $color={theme.typography[props.date.fontStyle].color}
                    >
                      {date}
                    </Text>
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
    </div>
  );
});
