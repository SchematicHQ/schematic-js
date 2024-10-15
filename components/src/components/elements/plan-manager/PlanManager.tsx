import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency, lighten, darken } from "../../../utils";
import { CheckoutDialog } from "../../elements";
import { Element } from "../../layout";
import { Box, EmbedButton, Flex, Text } from "../../ui";

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

  const { data, layout, mode, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  // Can change plan if there is a publishable key, a current plan with a billing association, and
  // some active plans
  const { currentPlan, canChangePlan, addOns } = {
    currentPlan: data.company?.plan,
    canChangePlan:
      (mode === "edit" ||
        (data.stripeEmbed?.publishableKey &&
          data.company?.plan?.billingProductId)) &&
      data.activePlans.length > 0,
    addOns: data.company?.addOns || [],
  };

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
            typeof currentPlan.planPrice === "number" &&
            currentPlan.planPrice && (
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
                {formatCurrency(currentPlan.planPrice)}/{currentPlan.planPeriod}
              </Text>
            )}
        </Flex>
      )}

      {props.addOns.isVisible && addOns.length > 0 && (
        <Flex $flexDirection="column" $gap="1rem">
          {props.addOns.showLabel && (
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={
                isLightBackground
                  ? darken(theme.card.background, 0.46)
                  : lighten(theme.card.background, 0.46)
              }
              $lineHeight={1}
            >
              Add-Ons
            </Text>
          )}

          {addOns.map((addOn) => (
            <Flex
              key={addOn.id}
              $justifyContent="space-between"
              $alignItems="center"
              $flexWrap="wrap"
              $gap="1rem"
            >
              <Text
                $font={theme.typography[props.addOns.fontStyle].fontFamily}
                $size={theme.typography[props.addOns.fontStyle].fontSize}
                $weight={theme.typography[props.addOns.fontStyle].fontWeight}
                $color={theme.typography[props.addOns.fontStyle].color}
              >
                {addOn.name}
              </Text>

              {addOn.planPrice && addOn.planPeriod && (
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  {formatCurrency(addOn.planPrice)}/{addOn.planPeriod}
                </Text>
              )}
            </Flex>
          ))}
        </Flex>
      )}

      {canChangePlan && props.callToAction.isVisible && (
        <EmbedButton
          onClick={() => {
            setLayout("checkout");
          }}
          $size={props.callToAction.buttonSize}
          $color={props.callToAction.buttonStyle}
        >
          Change Plan
        </EmbedButton>
      )}

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(<CheckoutDialog />, portal || document.body)}
    </Element>
  );
});

PlanManager.displayName = "PlanManager";
