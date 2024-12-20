import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency, lighten, darken } from "../../../utils";
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
    buttonStyle: "primary" | "secondary";
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
        fontStyle: props.header?.price?.fontStyle ?? "heading3",
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

  const { t } = useTranslation();

  const { data, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  // Can change plan if there is a publishable key, a current plan with a billing association, and
  // some active plans
  const { currentPlan, canChangePlan, addOns } = {
    addOns: data.company?.addOns || [],
    canChangePlan: data.capabilities?.checkout ?? true,
    currentPlan: data.company?.plan,
  };

  const billingSubscription = data.company?.billingSubscription;
  const showTrialBox = billingSubscription && billingSubscription.trialEnd !== undefined && billingSubscription.trialEnd !== 0 ;

    const trialEnd = billingSubscription?.trialEnd && new Date(billingSubscription?.trialEnd * 1000) || new Date();
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return (
    <>
    {showTrialBox && (
     <Box $backgroundColor={isLightBackground ? "hsla(0, 0%, 0%, 0.04)" : "hsla(0, 0%, 100%, 0.04)"} $textAlign="center" $padding="1rem">
      <Text
        as="h3"
        $font={theme.typography.heading3.fontFamily}
        $size={theme.typography.heading3.fontSize}
        $weight={theme.typography.heading3.fontWeight}
        $color={theme.typography.heading3.color}
       >{t("Trial ends in", { days: days.toString()})}
      </Text>
      <Text
        as="p"
        $font={theme.typography.text.fontFamily}
        $size={theme.typography.text.fontSize * .8125}
        $weight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
      >After the trial, {data.trialPaymentMethodRequired ? t("Subscription starts") : t("Subscription ends")}
      </Text>
    </Box>
    )}
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
              $leading={1}
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
            currentPlan.planPeriod && (
              <Box>
                <Text
                  $font={
                    theme.typography[props.header.price.fontStyle].fontFamily
                  }
                  $size={
                    theme.typography[props.header.price.fontStyle].fontSize
                  }
                  $weight={
                    theme.typography[props.header.price.fontStyle].fontWeight
                  }
                  $color={theme.typography[props.header.price.fontStyle].color}
                >
                  {formatCurrency(currentPlan.planPrice)}
                </Text>

                <Text
                  $font={
                    theme.typography[props.header.price.fontStyle].fontFamily
                  }
                  $size={
                    (16 / 30) *
                    theme.typography[props.header.price.fontStyle].fontSize
                  }
                  $weight={
                    theme.typography[props.header.price.fontStyle].fontWeight
                  }
                  $color={theme.typography[props.header.price.fontStyle].color}
                >
                  /{currentPlan.planPeriod}
                </Text>
              </Box>
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
              $leading={1}
            >
              Addons
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
          {t("Change plan")}
        </EmbedButton>
      )}
    </Element>
    </>
  );
});

PlanManager.displayName = "PlanManager";
