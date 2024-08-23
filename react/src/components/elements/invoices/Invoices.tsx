import { forwardRef, useMemo } from "react";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { toPrettyDate } from "../../../utils";
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

export type InvoicesProps = DesignProps;

export const Invoices = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { settings } = useEmbed();

  const { invoices } = useMemo(() => {
    /**
     * @TODO: resolve from data
     */
    return {
      invoices: [
        {
          date: toPrettyDate(new Date("2024-05-12")),
          amount: 200,
        },
        {
          date: toPrettyDate(new Date("2024-04-12")),
          amount: 200,
        },
      ],
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      <Flex $flexDirection="column" $gap="1rem">
        {props.header.isVisible && (
          <Flex $justifyContent="space-between" $alignItems="center">
            <Text
              $font={
                settings.theme.typography[props.header.fontStyle].fontFamily
              }
              $size={settings.theme.typography[props.header.fontStyle].fontSize}
              $weight={
                settings.theme.typography[props.header.fontStyle].fontWeight
              }
              $color={settings.theme.typography[props.header.fontStyle].color}
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
                      $font={
                        settings.theme.typography[props.date.fontStyle]
                          .fontFamily
                      }
                      $size={
                        settings.theme.typography[props.date.fontStyle].fontSize
                      }
                      $weight={
                        settings.theme.typography[props.date.fontStyle]
                          .fontWeight
                      }
                      $color={
                        settings.theme.typography[props.date.fontStyle].color
                      }
                    >
                      {toPrettyDate(date)}
                    </Text>
                  )}

                  {props.amount.isVisible && (
                    <Text
                      $font={
                        settings.theme.typography[props.amount.fontStyle]
                          .fontFamily
                      }
                      $size={
                        settings.theme.typography[props.amount.fontStyle]
                          .fontSize
                      }
                      $weight={
                        settings.theme.typography[props.amount.fontStyle]
                          .fontWeight
                      }
                      $color={
                        settings.theme.typography[props.amount.fontStyle].color
                      }
                    >
                      ${amount}
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
              $font={
                settings.theme.typography[props.collapse.fontStyle].fontFamily
              }
              $size={
                settings.theme.typography[props.collapse.fontStyle].fontSize
              }
              $weight={
                settings.theme.typography[props.collapse.fontStyle].fontWeight
              }
              $color={settings.theme.typography[props.collapse.fontStyle].color}
            >
              See all
            </Text>
          </Flex>
        )}
      </Flex>
    </div>
  );
});
