import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Box, Flex, Icon, Text } from "../../ui";
import { darken, lighten, hexToHSL } from "../../../utils";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  functions: {
    allowEdit: boolean;
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
    },
    functions: {
      allowEdit: props.functions?.allowEdit ?? true,
    },
  };
};

export type PaymentMethodProps = DesignProps;

export const PaymentMethod = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { data, settings, stripe, layout, setLayout } = useEmbed();

  const paymentMethod = useMemo(() => {
    const { cardLast4, cardExpMonth, cardExpYear } =
      data.subscription?.paymentMethod || {};

    let monthsToExpiration: number | undefined;
    if (typeof cardExpYear === "number" && typeof cardExpMonth === "number") {
      const timeToExpiration = Math.round(
        // TODO: is `cardExpMonth` a zero-based index?
        +new Date(cardExpYear, cardExpMonth) - +new Date(),
      );
      monthsToExpiration = Math.round(
        timeToExpiration / (1000 * 60 * 60 * 24 * 30),
      );
    }

    return {
      cardLast4,
      monthsToExpiration,
    };
  }, [data.subscription?.paymentMethod]);

  if (!stripe) {
    return null;
  }

  return (
    <div ref={ref} className={className}>
      {props.header.isVisible && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
        >
          <Text
            $font={settings.theme.typography[props.header.fontStyle].fontFamily}
            $size={settings.theme.typography[props.header.fontStyle].fontSize}
            $weight={
              settings.theme.typography[props.header.fontStyle].fontWeight
            }
            $color={settings.theme.typography[props.header.fontStyle].color}
          >
            Payment Method
          </Text>

          {typeof paymentMethod.monthsToExpiration === "number" &&
            Math.abs(paymentMethod.monthsToExpiration) < 4 && (
              <Text
                $font={settings.theme.typography.text.fontFamily}
                $size={14}
                $color="#DB6769"
              >
                {paymentMethod.monthsToExpiration > 0
                  ? `Expires in ${paymentMethod.monthsToExpiration} mo`
                  : "Expired"}
              </Text>
            )}
        </Flex>
      )}

      {paymentMethod.cardLast4 && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $margin="0 0 1rem"
          $background={`${hexToHSL(settings.theme.card.background).l > 50 ? darken(settings.theme.card.background, 10) : lighten(settings.theme.card.background, 20)}`}
          $padding="0.375rem 1rem"
          $borderRadius="9999px"
        >
          <Text $font={settings.theme.typography.text.fontFamily} $size={14}>
            💳 Card ending in {paymentMethod.cardLast4}
          </Text>

          {props.functions.allowEdit && (
            <Text
              tabIndex={0}
              onClick={() => {
                if (layout !== "payment") return;
                setLayout("payment");
              }}
              $font={settings.theme.typography.link.fontFamily}
              $size={settings.theme.typography.link.fontSize}
              $weight={settings.theme.typography.link.fontWeight}
              $color={settings.theme.typography.link.color}
            >
              Edit
            </Text>
          )}
        </Flex>
      )}

      {layout === "payment" &&
        createPortal(
          <Box
            $position="absolute"
            $top="50%"
            $left="50%"
            $zIndex="999999"
            $transform="translate(-50%, -50%)"
            $width="100%"
            $height="100%"
            $backgroundColor="#B5B5B580"
          >
            <Flex
              $position="relative"
              $top="50%"
              $left="50%"
              $transform="translate(-50%, -50%)"
              $width="956px"
              $height="700px"
              $backgroundColor="#FBFBFB"
              $borderRadius="8px"
              $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
              id="select-plan-dialog"
              role="dialog"
              aria-labelledby="select-plan-dialog-label"
              aria-modal="true"
            >
              <Box
                $position="absolute"
                $top="0.25rem"
                $right="0.75rem"
                $cursor="pointer"
                onClick={() => {
                  setLayout("portal");
                }}
              >
                <Icon name="close" style={{ fontSize: 36, color: "#B8B8B8" }} />
              </Box>

              <Flex $flexDirection="column" $gap="1rem">
                <Text
                  as="h1"
                  id="select-plan-dialog-label"
                  $size={24}
                  $weight={800}
                >
                  Add payment method
                </Text>
              </Flex>
            </Flex>
          </Box>,
          portal || document.body,
        )}
    </div>
  );
});
