import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
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

  const { upcomingInvoice } = useMemo(() => {
    return {
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
    <Element ref={ref} className={className}>
      {props.header.isVisible && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
        >
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
              {formatCurrency(upcomingInvoice.amountDue)}
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
    </Element>
  );
});

UpcomingBill.displayName = "UpcomingBill";
