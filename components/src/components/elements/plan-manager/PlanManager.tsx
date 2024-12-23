import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { type FeatureUsageResponseData } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import {
  formatCurrency,
  hexToHSL,
  lighten,
  darken,
  shortenPeriod,
} from "../../../utils";
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

  const { data, setLayout, setSelected } = useEmbed();

  const isLightBackground = useIsLightBackground();

  // Can change plan if there is a publishable key, a current plan with a billing association, and
  // some active plans
  const { addOns, canChangePlan, currentPlan, featureUsage } = {
    addOns: data.company?.addOns || [],
    currentPlan: data.company?.plan,
    canChangePlan: data.capabilities?.checkout ?? true,
    featureUsage: data.featureUsage,
  };

  const usageBasedEntitlements = (featureUsage?.features || []).reduce(
    (
      acc: (FeatureUsageResponseData & {
        price: number;
        quantity: number;
      })[],
      usage,
    ) => {
      const quantity = usage?.allocation ?? 0;

      let price: number | undefined;
      if (currentPlan?.planPeriod === "month") {
        price = usage.monthlyUsageBasedPrice?.price;
      } else if (currentPlan?.planPeriod === "year") {
        price = usage.yearlyUsageBasedPrice?.price;
      }

      if (usage.priceBehavior && typeof price === "number" && quantity > 0) {
        acc.push({ ...usage, price, quantity });
      }

      return acc;
    },
    [],
  );

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
                    theme.typography[props.header.price.fontStyle].fontSize
                  }
                  $weight={
                    theme.typography[props.header.price.fontStyle].fontWeight
                  }
                  $color={theme.typography[props.header.price.fontStyle].color}
                >
                  <sub>/{shortenPeriod(currentPlan.planPeriod)}</sub>
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
              {t("Add-ons")}
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
                  {formatCurrency(addOn.planPrice)}
                  <sub>/{shortenPeriod(addOn.planPeriod)}</sub>
                </Text>
              )}
            </Flex>
          ))}
        </Flex>
      )}

      {usageBasedEntitlements.length > 0 && (
        <Flex $flexDirection="column" $gap="1rem">
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
            {t("Usage-based")}
          </Text>

          {usageBasedEntitlements.reduce((acc: JSX.Element[], entitlement) => {
            if (entitlement.feature?.name) {
              acc.push(
                <Flex
                  key={entitlement.feature.id}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $flexWrap="wrap"
                  $gap="1rem"
                >
                  <Text
                    $font={theme.typography[props.addOns.fontStyle].fontFamily}
                    $size={theme.typography[props.addOns.fontStyle].fontSize}
                    $weight={
                      theme.typography[props.addOns.fontStyle].fontWeight
                    }
                    $color={theme.typography[props.addOns.fontStyle].color}
                  >
                    {entitlement.priceBehavior === "pay_in_advance" ? (
                      <>
                        {entitlement.quantity}{" "}
                        {pluralize(
                          entitlement.feature.name,
                          entitlement.quantity,
                        )}
                      </>
                    ) : (
                      entitlement.feature.name
                    )}
                  </Text>

                  <Flex $alignItems="center" $gap="1rem">
                    {entitlement.priceBehavior === "pay_in_advance" &&
                      currentPlan?.planPeriod && (
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={0.875 * theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={
                            hexToHSL(theme.typography.text.color).l > 50
                              ? darken(theme.typography.text.color, 0.46)
                              : lighten(theme.typography.text.color, 0.46)
                          }
                        >
                          {formatCurrency(entitlement.price)}
                          <sub>
                            /{shortenPeriod(currentPlan.planPeriod)}/
                            {pluralize(
                              entitlement.feature.name.toLowerCase(),
                              1,
                            )}
                          </sub>
                        </Text>
                      )}

                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(
                        entitlement.price *
                          (entitlement.priceBehavior === "pay_in_advance"
                            ? entitlement.quantity
                            : 1),
                      )}
                      <sub>
                        /
                        {currentPlan?.planPeriod &&
                        entitlement.priceBehavior === "pay_in_advance"
                          ? shortenPeriod(currentPlan.planPeriod)
                          : pluralize(
                              entitlement.feature.name.toLowerCase(),
                              1,
                            )}
                      </sub>
                    </Text>
                  </Flex>
                </Flex>,
              );
            }

            return acc;
          }, [])}
        </Flex>
      )}

      {canChangePlan && props.callToAction.isVisible && (
        <EmbedButton
          onClick={() => {
            setSelected({
              planId: currentPlan?.id,
              addOnId: undefined,
              usage: false,
            });
            setLayout("checkout");
          }}
          $size={props.callToAction.buttonSize}
          $color={props.callToAction.buttonStyle}
        >
          {t("Change plan")}
        </EmbedButton>
      )}
    </Element>
  );
});

PlanManager.displayName = "PlanManager";
