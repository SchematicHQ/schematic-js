import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Text } from "../../ui";
import { CheckoutDialog } from "./CheckoutDialog";
import { StyledButton } from "./styles";

interface DesignProps {
  header: {
    isVisible: boolean;
    title: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    price: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
  };
  addOns: {
    isVisible: boolean;
    fontStyle: FontStyle;
    showLabel: boolean;
  };
  callToAction: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary" | "tertiary";
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      title: {
        fontStyle: props.header?.title?.fontStyle ?? "heading1",
      },
      description: {
        isVisible: props.header?.description?.isVisible ?? true,
        fontStyle: props.header?.description?.fontStyle ?? "text",
      },
      price: {
        isVisible: props.header?.price?.isVisible ?? true,
        fontStyle: props.header?.price?.fontStyle ?? "text",
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      fontStyle: props.addOns?.fontStyle ?? "heading4",
      showLabel: props.addOns?.showLabel ?? true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible ?? true,
      buttonSize: props.callToAction?.buttonSize ?? "md",
      buttonStyle: props.callToAction?.buttonStyle ?? "primary",
    },
  };
};

export type PlanManagerProps = DesignProps;

export const PlanManager = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();
  const { data, layout, setLayout } = useEmbed();

  const { currentPlan, canChangePlan } = useMemo(() => {
    return {
      currentPlan: data.company?.plan,
      canChangePlan: data.activePlans.length > 0,
    };
  }, [data.company, data.activePlans]);

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="2rem"
    >
      {props.header.isVisible && currentPlan && (
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $flexWrap="wrap"
          $gap="1rem"
        >
          <Flex $flexDirection="column" $gap="1rem">
            <Text
              as={Box}
              $font={theme.typography[props.header.title.fontStyle].fontFamily}
              $size={theme.typography[props.header.title.fontStyle].fontSize}
              $weight={
                theme.typography[props.header.title.fontStyle].fontWeight
              }
              $color={theme.typography[props.header.title.fontStyle].color}
              $lineHeight={1}
            >
              {currentPlan.name}
            </Text>

            {props.header.description.isVisible && currentPlan.description && (
              <Text
                as={Box}
                $font={
                  theme.typography[props.header.description.fontStyle]
                    .fontFamily
                }
                $size={
                  theme.typography[props.header.description.fontStyle].fontSize
                }
                $weight={
                  theme.typography[props.header.description.fontStyle]
                    .fontWeight
                }
                $color={
                  theme.typography[props.header.description.fontStyle].color
                }
              >
                {currentPlan.description}
              </Text>
            )}
          </Flex>

          {props.header.price.isVisible &&
            typeof currentPlan.price === "number" &&
            currentPlan.interval && (
              <Text
                $font={
                  theme.typography[props.header.price.fontStyle].fontFamily
                }
                $size={theme.typography[props.header.price.fontStyle].fontSize}
                $weight={
                  theme.typography[props.header.price.fontStyle].fontWeight
                }
                $color={theme.typography[props.header.price.fontStyle].color}
              >
                {formatCurrency(currentPlan.price)}/{currentPlan.interval}
              </Text>
            )}
        </Flex>
      )}

      {canChangePlan && props.callToAction.isVisible && (
        <StyledButton
          onClick={() => {
            setLayout("checkout");
          }}
          $size={props.callToAction.buttonSize}
          $color={props.callToAction.buttonStyle}
        >
          Change Plan
        </StyledButton>
      )}

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(<CheckoutDialog />, portal || document.body)}
    </Element>
  );
});

PlanManager.displayName = "PlanManager";
