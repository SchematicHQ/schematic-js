import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { FeatureResponseData } from "../../../api/checkoutexternal";
import { PriceBehavior, TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  formatCurrency,
  getAddOnPrice,
  getEntitlementFeatureName,
  getEntitlementPrice,
  getFeatureName,
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

interface MeteredEntitlementPricingProps {
  priceBehavior?: string;
  softLimit?: number;
  price: number;
  currency: string;
  packageSize: number;
  feature?: FeatureResponseData;
  featureName?: string | null;
  isTiered: boolean;
}

function renderMeteredEntitlementPricing({
  priceBehavior,
  softLimit,
  price,
  currency,
  packageSize,
  feature,
  featureName,
  isTiered,
}: MeteredEntitlementPricingProps): React.ReactNode {
  // Overage pricing
  if (priceBehavior === PriceBehavior.Overage && softLimit) {
    return (
      <>
        Additional: {formatCurrency(price, currency)}/
        {feature
          ? getFeatureName(
              feature as Pick<
                FeatureResponseData,
                "name" | "pluralName" | "singularName"
              >,
              packageSize,
            )
          : featureName || "unit"}
      </>
    );
  }

  // Pay-as-you-go or Pay-in-advance pricing
  if (
    priceBehavior === PriceBehavior.PayAsYouGo ||
    priceBehavior === PriceBehavior.PayInAdvance
  ) {
    return (
      <>
        {formatCurrency(price, currency)}/
        {packageSize > 1 && <>{packageSize} </>}
        {feature
          ? getFeatureName(
              feature as Pick<
                FeatureResponseData,
                "name" | "pluralName" | "singularName"
              >,
              packageSize,
            )
          : featureName || "unit"}
      </>
    );
  }

  // Tiered pricing
  if (isTiered) {
    return <>Tier-based pricing</>;
  }

  return null;
}

/**
 * Determines if an add-on should display "Usage-based" instead of the price.
 * Returns true when the price is effectively $0 and there are metered (non-unlimited) entitlements.
 */
function shouldShowUsageBased(
  price: number,
  displayableEntitlements: Array<{ isUnlimited: boolean }>,
): boolean {
  return (
    price < 0.01 && displayableEntitlements.some((ent) => !ent.isUnlimited)
  );
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

  const isCurrentAddOn = isHydratedPlan(addOn) && addOn.current;
  const isActiveAddOn =
    isCurrentAddOn &&
    selectedPeriod ===
      currentAddOns.find((currentAddOn) => currentAddOn.id === addOn.id)
        ?.planPeriod;
  const { price: addOnPrice, currency: addOnCurrency } =
    getAddOnPrice(addOn, selectedPeriod) || {};

  // Collect all usage-based and unlimited entitlements for display
  const displayableEntitlements =
    addOn.entitlements
      ?.filter(
        (entitlement) =>
          entitlement.valueType === "unlimited" ||
          (entitlement.priceBehavior &&
            [
              PriceBehavior.PayAsYouGo as string,
              PriceBehavior.PayInAdvance as string,
              PriceBehavior.Overage as string,
              PriceBehavior.Tiered as string,
            ].includes(entitlement.priceBehavior)),
      )
      .map((entitlement) => {
        // Only treat as unlimited if valueType is "unlimited" AND no priceBehavior
        // If priceBehavior exists, it has usage-based pricing that should be displayed
        if (
          entitlement.valueType === "unlimited" &&
          !entitlement.priceBehavior
        ) {
          return {
            isUnlimited: true,
            featureName: entitlement.feature?.name,
            feature: entitlement.feature,
          };
        }

        const priceData = getEntitlementPrice(entitlement, selectedPeriod);

        return {
          isUnlimited: false,
          priceBehavior: entitlement.priceBehavior,
          softLimit: entitlement.softLimit,
          price: priceData?.price ?? 0,
          currency: priceData?.currency || addOnCurrency,
          featureName: entitlement.feature?.name,
          feature: entitlement.feature,
          packageSize: priceData?.packageSize ?? 1,
          isTiered: entitlement.priceBehavior === PriceBehavior.Tiered,
        };
      }) || [];

  return (
    <Flex
      $position="relative"
      $flexDirection="column"
      $padding={`${0.75 * cardPadding}rem 0`}
      $backgroundColor={settings.theme.card.background}
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $outlineWidth="2px"
      $outlineStyle="solid"
      $outlineColor={isActiveAddOn ? settings.theme.primary : "transparent"}
      {...(settings.theme.card.hasShadow && {
        $boxShadow: cardBoxShadow,
      })}
    >
      <Flex
        $flexDirection="column"
        $gap="0.75rem"
        $padding={`0 ${cardPadding}rem ${displayableEntitlements.length > 0 ? 0.75 * cardPadding : 0}rem`}
        $borderWidth="0"
        $borderBottomWidth={displayableEntitlements.length > 0 ? "1px" : "0"}
        $borderStyle="solid"
        $borderColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.175)"
            : "hsla(0, 0%, 100%, 0.175)"
        }
      >
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
          {shouldShowUsageBased(addOnPrice ?? 0, displayableEntitlements) ? (
            <Text display={layout.plans.name.fontStyle}>
              {t("Usage-based")}
            </Text>
          ) : (
            <Text display={layout.plans.name.fontStyle}>
              {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
              <sub>/{selectedPeriod}</sub>
            </Text>
          )}
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
        $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
      >
        {displayableEntitlements.length > 0 && (
          <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
            {displayableEntitlements.map((entitlement, idx) => {
              if (entitlement.isUnlimited) {
                return (
                  <Flex
                    key={idx}
                    $flexWrap="wrap"
                    $justifyContent="space-between"
                    $alignItems="center"
                    $gap="1rem"
                  >
                    <Flex $gap="1rem">
                      {entitlement.feature?.icon && (
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
                      <Flex $flexDirection="column" $justifyContent="center">
                        <Text>
                          {entitlement.feature?.pluralName ||
                            entitlement.feature?.name ||
                            entitlement.featureName}
                        </Text>
                      </Flex>
                    </Flex>
                    <Text
                      style={{ opacity: 0.54 }}
                      $size={0.875 * settings.theme.typography.text.fontSize}
                      $color={settings.theme.typography.text.color}
                    >
                      Unlimited
                    </Text>
                  </Flex>
                );
              }

              // Metered entitlement - TypeScript doesn't know isUnlimited is false here
              const meteredEntitlement = entitlement as typeof entitlement & {
                isUnlimited: false;
                priceBehavior?: string;
                softLimit?: number;
                price: number;
                currency: string;
                packageSize: number;
                isTiered: boolean;
              };

              return (
                <Flex
                  key={idx}
                  $flexWrap="wrap"
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Flex $gap="1rem">
                    {meteredEntitlement.feature?.icon && (
                      <Icon
                        name={meteredEntitlement.feature.icon}
                        color={settings.theme.primary}
                        background={
                          isLightBackground
                            ? "hsla(0, 0%, 0%, 0.0625)"
                            : "hsla(0, 0%, 100%, 0.25)"
                        }
                        rounded
                      />
                    )}
                    <Flex $flexDirection="column" $justifyContent="center">
                      <Text>
                        {meteredEntitlement.priceBehavior ===
                          PriceBehavior.Overage && meteredEntitlement.softLimit
                          ? `${meteredEntitlement.softLimit} ${getEntitlementFeatureName(meteredEntitlement, "units")}`
                          : getEntitlementFeatureName(meteredEntitlement)}
                      </Text>
                    </Flex>
                  </Flex>
                  <Text
                    style={{ opacity: 0.54 }}
                    $size={0.875 * settings.theme.typography.text.fontSize}
                    $color={settings.theme.typography.text.color}
                  >
                    {renderMeteredEntitlementPricing(meteredEntitlement)}
                  </Text>
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
                        period: selectedPeriod,
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
