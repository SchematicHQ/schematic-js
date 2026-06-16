import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { type InvoiceResponseData } from "../../../api/checkoutexternal";
import {
  Invoices as InvoicesPrimitive,
  useInvoices,
} from "../../../composable/invoices";
import { type FontStyle } from "../../../embed";
import { useEmbed } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { createKeyboardExecutionHandler } from "../../../utils";
import { Element } from "../../layout";
import {
  Button,
  Flex,
  Icon,
  Loader,
  Text,
  Tooltip,
  TransitionBox,
} from "../../ui";

// Re-exported for backward compatibility; the implementation now lives in the
// headless layer (`composable/invoices`).
export { formatInvoices } from "../../../composable/invoices";

export interface DesignProps {
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
  const design = resolveDesignProps(rest);

  return (
    <InvoicesPrimitive.Root limit={design.limit.number} data={data}>
      <InvoicesBody ref={ref} design={design} className={className} />
    </InvoicesPrimitive.Root>
  );
});

Invoices.displayName = "Invoices";

interface InvoicesBodyProps {
  design: DesignProps;
  className?: string;
}

const InvoicesBody = forwardRef<HTMLDivElement | null, InvoicesBodyProps>(
  ({ design, className }, ref) => {
    const { t } = useTranslation();

    const { settings } = useEmbed();

    const {
      visibleInvoices,
      isLoading,
      error,
      retry: getInvoices,
      hasMore,
      expanded,
      toggle,
      isEmpty,
    } = useInvoices();

    if (isEmpty) {
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
                {design.header.isVisible && (
                  <Flex $justifyContent="space-between" $alignItems="center">
                    <Text display={design.header.fontStyle}>
                      {t("Invoices")}
                    </Text>
                  </Flex>
                )}

                <Flex $flexDirection="column" $gap="0.5rem">
                  {visibleInvoices.map(
                    ({ date, amount, amountDue, url }, index) => {
                      return (
                        <Flex
                          key={index}
                          $justifyContent="space-between"
                          $alignItems="center"
                        >
                          {design.date.isVisible && (
                            <Text
                              display={design.date.fontStyle}
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

                          {design.amount.isVisible && (
                            <Tooltip
                              trigger={
                                <Text display={design.amount.fontStyle}>
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

                {design.collapse.isVisible && hasMore && (
                  <Flex $alignItems="center" $gap="0.5rem">
                    <Icon
                      name={`chevron-${expanded ? "up" : "down"}`}
                      color="#D0D0D0"
                    />

                    <Text
                      onClick={toggle}
                      onKeyDown={createKeyboardExecutionHandler(toggle)}
                      display={design.collapse.fontStyle}
                    >
                      {expanded ? t("See less") : t("See more")}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </TransitionBox>
          )
        )}
      </Element>
    );
  },
);

InvoicesBody.displayName = "InvoicesBody";
