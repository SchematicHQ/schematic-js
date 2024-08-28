import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Box, Flex, Text } from "../../ui";
import { darken, lighten, hexToHSL } from "../../../utils";
import { OverlayHeader, OverlayWrapper } from "../plan-manager";

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

  const { settings, layout, setLayout } = useEmbed();

  const paymentMethod = useMemo(() => {
    /**
     * @TODO: Replace this with payment details from data context
     */
    const cardNumber = "4512";
    const expirationDate = "2024-12-22";

    const timeToExpiration = Math.round(
      +new Date(expirationDate) - +new Date(),
    );
    const monthsToExpiration = Math.round(
      timeToExpiration / (1000 * 60 * 60 * 24 * 30),
    );

    return {
      cardNumber,
      monthsToExpiration,
    };
  }, []);

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

          {Math.abs(paymentMethod.monthsToExpiration) < 4 && (
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

      <Flex
        $justifyContent="space-between"
        $alignItems="center"
        $margin="0 0 1rem"
        $background={`${hexToHSL(settings.theme.card.background).l > 50 ? darken(settings.theme.card.background, 10) : lighten(settings.theme.card.background, 20)}`}
        $padding="0.375rem 1rem"
        $borderRadius="9999px"
      >
        <Text $font={settings.theme.typography.text.fontFamily} $size={14}>
          💳 Card ending in {paymentMethod.cardNumber}
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

      {layout === "payment" &&
        createPortal(
          <OverlayWrapper size="md">
            <OverlayHeader>
              <Box $fontWeight="600">Edit payment method</Box>
            </OverlayHeader>
            <Flex $flexDirection="row" $height="100%">
              <Flex
                $flexDirection="column"
                $gap="1rem"
                $padding="2.5rem"
                $backgroundColor="#FBFBFB"
                $borderRadius="0 0 0.5rem 0.5rem"
                $flex="1"
                $height="100%"
              >
                Stripe fields embed here...
              </Flex>
            </Flex>
          </OverlayWrapper>,
          portal || document.body,
        )}
    </div>
  );
});
