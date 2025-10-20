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
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

export interface AddOnProps {
  addOn: SelectedPlan;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
    showCallToAction: boolean;
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

  const { currentAddOns, canCheckout, isStandalone } = useMemo(() => {
    const isStandalone = typeof data?.component === "undefined";

    return {
      currentAddOns: data?.company?.addOns || [],
      canCheckout: isStandalone || (data?.capabilities?.checkout ?? true),
      isStandalone,
    };
  }, [data?.capabilities?.checkout, data?.company?.addOns, data?.component]);

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const isActiveAddOn =
    addOn.current &&
    selectedPeriod ===
      currentAddOns.find((currentAddOn) => currentAddOn.id === addOn.id)
        ?.planPeriod;
  const { price: addOnPrice, currency: addOnCurrency } =
    getAddOnPrice(addOn, selectedPeriod) || {};

  const displayableEntitlements =
    addOn.entitlements
      ?.filter(
        (entitlement) =>
          entitlement.valueType === "unlimited" ||
          (entitlement.priceBehavior &&
            [
              PriceBehavior.PayAsYouGo,
              PriceBehavior.PayInAdvance,
              PriceBehavior.Overage,
              PriceBehavior.Tiered,
            ].includes(entitlement.priceBehavior as PriceBehavior)),
      )
      .map((entitlement) => {
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
          featureName: entitlement.feature?.name,
          feature: entitlement.feature,
          priceBehavior: entitlement.priceBehavior,
          softLimit: entitlement.softLimit,
          price: priceData?.price ?? 0,
          currency: priceData?.currency || addOnCurrency,
          packageSize: priceData?.packageSize ?? 1,
          isTiered: entitlement.priceBehavior === PriceBehavior.Tiered,
        };
      }) || [];

  return (
    <Flex
      className="sch-PricingTable_AddOn"
      data-testid="sch-addon"
      data-addon-id={addOn.id}
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
          <Text
            data-testid="sch-addon-price"
            display={layout.plans.name.fontStyle}
          >
            {shouldShowUsageBased(addOnPrice ?? 0, displayableEntitlements) ? (
              t("Usage-based")
            ) : (
              <>
                {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
                <sub>/{selectedPeriod}</sub>
              </>
            )}
          </Text>
        </Box>

        {isActiveAddOn && (
          <Flex
            data-testid="sch-addon-active"
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
        {layout.addOns.showEntitlements &&
          displayableEntitlements.length > 0 && (
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

                        {entitlement.feature && (
                          <Flex
                            $flexDirection="column"
                            $justifyContent="center"
                          >
                            <Text>{getFeatureName(entitlement.feature)}</Text>
                          </Flex>
                        )}
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
                          data-testid="sch-feature-icon"
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
                            PriceBehavior.Overage &&
                          meteredEntitlement.softLimit
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

        {sharedProps.showCallToAction &&
          (layout.upgrade.isVisible || layout.downgrade.isVisible) && (
            <Flex $flexDirection="column" $gap="0.5rem">
              <Button
                type="button"
                disabled={!addOn.valid || !canCheckout}
                data-testid="sch-addon-cta-button"
                $size={layout.upgrade.buttonSize}
                $color={isActiveAddOn ? "danger" : layout.upgrade.buttonStyle}
                $variant={
                  isActiveAddOn ? "ghost" : addOn.current ? "outline" : "filled"
                }
                {...(sharedProps.callToActionUrl
                  ? {
                      as: "a",
                      href: sharedProps.callToActionUrl,
                      rel: "noreferrer",
                      target: "_blank",
                    }
                  : {
                      onClick: () => {
                        sharedProps.onCallToAction?.(addOn);

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
                  : addOn.current
                    ? t("Change add-on")
                    : t("Choose add-on")}
              </Button>
            </Flex>
          )}
      </Flex>
    </Flex>
  );
};
