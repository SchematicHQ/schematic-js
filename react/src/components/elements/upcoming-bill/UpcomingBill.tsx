import { forwardRef, useMemo } from "react";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { toPrettyDate } from "../../../utils";
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

  const { settings } = useEmbed();

  const { bill } = useMemo(() => {
    /**
     * @TODO: resolve from data
     */
    return {
      bill: {
        amount: 200,
        period: "monthly",
        dueDate: toPrettyDate(new Date("2024-06-12")),
        endDate: new Date("2025-05-12").toLocaleDateString(),
      },
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {props.header.isVisible && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 0.75rem"
        >
          <Text
            $font={settings.theme.typography[props.header.fontStyle].fontFamily}
            $size={settings.theme.typography[props.header.fontStyle].fontSize}
            $weight={
              settings.theme.typography[props.header.fontStyle].fontWeight
            }
            $color={settings.theme.typography[props.header.fontStyle].color}
          >
            {props.header.prefix} {bill.dueDate}
          </Text>
        </Flex>
      )}

      <Flex $justifyContent="space-between" $alignItems="start" $gap="1rem">
        {props.price.isVisible && (
          <Flex $alignItems="end" $flexGrow="1">
            <Text
              $font={
                settings.theme.typography[props.price.fontStyle].fontFamily
              }
              $size={settings.theme.typography[props.price.fontStyle].fontSize}
              $weight={
                settings.theme.typography[props.price.fontStyle].fontWeight
              }
              $color={settings.theme.typography[props.price.fontStyle].color}
              $lineHeight={1}
            >
              <Text
                $size="0.75em"
                $color={settings.theme.typography[props.price.fontStyle].color}
              >
                $
              </Text>
              {bill.amount}
            </Text>
          </Flex>
        )}

        <Box $maxWidth="140px" $lineHeight="1">
          <Text
            $font={
              settings.theme.typography[props.contractEndDate.fontStyle]
                .fontFamily
            }
            $size={
              settings.theme.typography[props.contractEndDate.fontStyle]
                .fontSize
            }
            $weight={
              settings.theme.typography[props.contractEndDate.fontStyle]
                .fontWeight
            }
            $color={
              settings.theme.typography[props.contractEndDate.fontStyle].color
            }
          >
            Estimated monthly bill.
            {props.contractEndDate.isVisible && (
              <>
                &nbsp;{props.contractEndDate.prefix} {bill.endDate}.
              </>
            )}
          </Text>
        </Box>
      </Flex>
    </div>
  );
});
