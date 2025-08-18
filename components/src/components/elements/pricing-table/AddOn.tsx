import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { EntitlementValueType, TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  formatCurrency,
  formatNumber,
  getAddOnPrice,
  getFeatureName,
  getMetricPeriodName,
  hexToHSL,
  isCheckoutData,
  isHydratedPlan,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

interface AddOnProps {
  addOn: SelectedPlan;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
  };
  selectedPeriod: string;
}

export const AddOn = ({ addOn, sharedProps, selectedPeriod }: AddOnProps) => {
  const { layout } = sharedProps;

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { currentAddOns, canCheckout, isStandalone, showCallToAction } =
    useMemo(() => {
      if (isCheckoutData(data)) {
        return {
          currentAddOns: data.company?.addOns || [],
          canCheckout: data.capabilities?.checkout ?? true,
          isStandalone: false,
          showCallToAction: true,
        };
      }

      return {
        currentAddOns: [],
        canCheckout: true,
        isStandalone: true,
        showCallToAction: typeof layout.callToActionUrl === "string",
      };
    }, [data, layout.callToActionUrl]);

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const addOnPeriod = layout.showPeriodToggle
    ? selectedPeriod
    : addOn.yearlyPrice && !addOn.monthlyPrice
      ? "year"
      : "month";
  const isCurrentAddOn = isHydratedPlan(addOn) && addOn.current;
  const isActiveAddOn =
    isCurrentAddOn &&
    addOnPeriod ===
      currentAddOns.find((currentAddOn) => currentAddOn.id === addOn.id)
        ?.planPeriod;
  const { price: addOnPrice, currency: addOnCurrency } =
    getAddOnPrice(addOn, addOnPeriod) || {};

  return (
    <Flex
      $position="relative"
      $flexDirection="column"
      $gap="2rem"
      $padding={`${cardPadding}rem`}
      $backgroundColor={settings.theme.card.background}
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $outlineWidth="2px"
      $outlineStyle="solid"
      $outlineColor={isActiveAddOn ? settings.theme.primary : "transparent"}
      {...(settings.theme.card.hasShadow && {
        $boxShadow: cardBoxShadow,
      })}
    >
      <Flex $flexDirection="column" $gap="0.75rem">
        <Box>
          <Text display={layout.plans.name.fontStyle}>{addOn.name}</Text>
        </Box>

        {layout.addOns.showDescription && (
          <Box $marginBottom="0.5rem">
            <Text display={layout.plans.description.fontStyle}>
              {addOn.description}
            </Text>
          </Box>
        )}

        <Box>
          <Text display={layout.plans.name.fontStyle}>
            {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
            <sub>/{addOnPeriod}</sub>
          </Text>
        </Box>

        {isActiveAddOn && (
          <Flex
            $position="absolute"
            $right="1rem"
            $top="1rem"
            $backgroundColor={settings.theme.primary}
            $borderRadius="9999px"
            $padding="0.125rem 0.85rem"
          >
            <Text
              $size={0.75 * settings.theme.typography.text.fontSize}
              $color={
                hexToHSL(settings.theme.primary).l > 50 ? "#000000" : "#FFFFFF"
              }
            >
              {t("Active")}
            </Text>
          </Flex>
        )}
      </Flex>

      <Flex
        $flexDirection="column"
        $justifyContent="end"
        $gap={`${cardPadding}rem`}
        $flexGrow={1}
      >
        {layout.addOns.showEntitlements && (
          <Flex
            $flexDirection="column"
            $position="relative"
            $gap="1rem"
            $flexGrow={1}
          >
            {addOn.entitlements.map((entitlement, entitlementIndex) => {
              const metricPeriodName = getMetricPeriodName(entitlement);

              return (
                <Flex
                  key={entitlementIndex}
                  $flexWrap="wrap"
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Flex $gap="1rem">
                    {layout.addOns.showFeatureIcons &&
                      entitlement.feature?.icon && (
                        <Icon
                          name={entitlement.feature.icon}
                          color={settings.theme.primary}
                          background={
                            isLightBackground
                              ? "hsla(0, 0%, 0%, 0.0625)"
                              : "hsla(0, 0%, 100%, 0.25)"
                          }
                          rounded
                        />
                      )}

                    <Flex $flexDirection="column" $gap="0.5rem">
                      {entitlement.feature?.name && (
                        <Flex $alignItems="center" $flexGrow={1}>
                          <Text>
                            {entitlement.valueType ===
                              EntitlementValueType.Numeric ||
                            entitlement.valueType ===
                              EntitlementValueType.Unlimited ||
                            entitlement.valueType ===
                              EntitlementValueType.Trait ? (
                              <>
                                {entitlement.valueType ===
                                EntitlementValueType.Unlimited
                                  ? t("Unlimited", {
                                      item: getFeatureName(entitlement.feature),
                                    })
                                  : typeof entitlement.valueNumeric ===
                                      "number" && (
                                      <>
                                        {formatNumber(entitlement.valueNumeric)}{" "}
                                        {getFeatureName(
                                          entitlement.feature,
                                          entitlement.valueNumeric,
                                        )}
                                      </>
                                    )}

                                {metricPeriodName && (
                                  <>
                                    {" "}
                                    {t("per")} {t(metricPeriodName)}
                                  </>
                                )}
                              </>
                            ) : (
                              entitlement.feature.name
                            )}
                          </Text>
                        </Flex>
                      )}

                      {layout.plans.showFeatureDescriptions &&
                        entitlement.feature?.description && (
                          <Text
                            $size={
                              0.875 * settings.theme.typography.text.fontSize
                            }
                            $color={`color-mix(in oklch, ${settings.theme.typography.text.color}, ${settings.theme.card.background})`}
                          >
                            {entitlement.feature.description}
                          </Text>
                        )}
                    </Flex>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        )}

        {showCallToAction && layout.upgrade.isVisible && (
          <Button
            type="button"
            disabled={(isHydratedPlan(addOn) && !addOn.valid) || !canCheckout}
            $size={layout.upgrade.buttonSize}
            $color={isActiveAddOn ? "danger" : layout.upgrade.buttonStyle}
            $variant={
              isActiveAddOn ? "ghost" : isCurrentAddOn ? "outline" : "filled"
            }
            {...(layout.callToActionUrl
              ? {
                  as: "a",
                  href: layout.callToActionUrl,
                  rel: "noreferrer",
                  target: "_blank",
                }
              : {
                  onClick: () => {
                    layout.onCallToAction?.(addOn);

                    if (!isStandalone && !addOn.custom) {
                      setCheckoutState({
                        period: addOnPeriod,
                        addOnId: isActiveAddOn ? null : addOn.id,
                        usage: false,
                      });
                    }
                  },
                })}
            $fullWidth
          >
            {isActiveAddOn
              ? t("Remove add-on")
              : isCurrentAddOn
                ? t("Change add-on")
                : t("Choose add-on")}
          </Button>
        )}
      </Flex>
    </Flex>
  );
};
