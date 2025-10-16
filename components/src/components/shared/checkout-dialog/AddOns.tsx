import { useTranslation } from "react-i18next";

import { PriceBehavior, TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  ChargeType,
  formatCurrency,
  getAddOnPrice,
  getEntitlementFeatureName,
  getEntitlementPrice,
  getFeatureName,
  hexToHSL,
  isHydratedPlan,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

interface AddOnsProps {
  addOns: SelectedPlan[];
  toggle: (id: string) => void;
  isLoading: boolean;
  period: string;
}

interface MeteredEntitlementPricingProps {
  priceBehavior?: string;
  softLimit?: number;
  price: number;
  currency: string;
  packageSize: number;
  feature?: { name?: string | null; pluralName?: string | null };
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
        Additional:{" "}
        {formatCurrency(price, currency)}
        /
        {feature
          ? getFeatureName(feature as any, packageSize)
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
        {formatCurrency(price, currency)}
        /
        {packageSize > 1 && <>{packageSize} </>}
        {feature ? getFeatureName(feature as any, packageSize) : featureName || "unit"}
      </>
    );
  }

  // Tiered pricing
  if (isTiered) {
    return <>Tier-based pricing</>;
  }

  return null;
}

export const AddOns = ({ addOns, toggle, isLoading, period }: AddOnsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const periodKey = period === "year" ? "yearlyPrice" : "monthlyPrice";

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  return (
    <Box
      $display="grid"
      $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
      $gap="1rem"
    >
      {addOns.map((addOn, index) => {
        const { price, currency } = getAddOnPrice(addOn, period) || {};
        const isAddOnValid = isHydratedPlan(addOn) && addOn.valid;
        const isAddOnCurrent = isHydratedPlan(addOn) && addOn.current;

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

              const priceData = getEntitlementPrice(entitlement, period);

              return {
                isUnlimited: false,
                priceBehavior: entitlement.priceBehavior,
                softLimit: entitlement.softLimit,
                price: priceData?.price ?? 0,
                currency: priceData?.currency || currency,
                featureName: entitlement.feature?.name,
                feature: entitlement.feature,
                packageSize: priceData?.packageSize ?? 1,
                isTiered: entitlement.priceBehavior === PriceBehavior.Tiered,
              };
            }) || [];

        return (
          <Flex
            key={index}
            $position="relative"
            $flexDirection="column"
            $padding={`${0.75 * cardPadding}rem 0`}
            $backgroundColor={settings.theme.card.background}
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
            $outlineWidth="2px"
            $outlineStyle="solid"
            $outlineColor={
              addOn.isSelected ? settings.theme.primary : "transparent"
            }
            {...(settings.theme.card.hasShadow && {
              $boxShadow: cardBoxShadow,
            })}
          >
            <Flex
              $flexDirection="column"
              $gap="0.75rem"
              $padding={`0 ${cardPadding}rem ${displayableEntitlements.length > 0 ? 0.75 * cardPadding : 0}rem`}
              $borderWidth="0"
              $borderBottomWidth={
                displayableEntitlements.length > 0 ? "1px" : "0"
              }
              $borderStyle="solid"
              $borderColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.175)"
                  : "hsla(0, 0%, 100%, 0.175)"
              }
            >
              <Box>
                <Text display="heading3">{addOn.name}</Text>
              </Box>

              {addOn.description && (
                <Box $marginBottom="0.5rem">
                  <Text>{addOn.description}</Text>
                </Box>
              )}

              {(addOn[periodKey] ||
                addOn.chargeType === ChargeType.oneTime) && (
                <Box>
                  <Text display="heading2">
                    {formatCurrency(price ?? 0, currency)}
                  </Text>

                  <Text
                    display="heading2"
                    $size={
                      (16 / 30) * settings.theme.typography.heading2.fontSize
                    }
                  >
                    {addOn.chargeType === ChargeType.oneTime ? (
                      <> {t("one time")}</>
                    ) : (
                      `/${period}`
                    )}
                  </Text>
                </Box>
              )}

              {isAddOnCurrent && (
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
                      hexToHSL(settings.theme.primary).l > 50
                        ? "#000000"
                        : "#FFFFFF"
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
              $flexGrow={1}
              $gap={`${cardPadding}rem`}
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
                            <Flex
                              $flexDirection="column"
                              $justifyContent="center"
                            >
                              <Text>
                                {entitlement.feature?.pluralName ||
                                  entitlement.feature?.name ||
                                  entitlement.featureName}
                              </Text>
                            </Flex>
                          </Flex>
                          <Text
                            style={{ opacity: 0.54 }}
                            $size={
                              0.875 * settings.theme.typography.text.fontSize
                            }
                            $color={settings.theme.typography.text.color}
                          >
                            Unlimited
                          </Text>
                        </Flex>
                      );
                    }

                    // Metered entitlement - TypeScript doesn't know isUnlimited is false here
                    const meteredEntitlement =
                      entitlement as typeof entitlement & {
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
                          <Flex
                            $flexDirection="column"
                            $justifyContent="center"
                          >
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
                          $size={
                            0.875 * settings.theme.typography.text.fontSize
                          }
                          $color={settings.theme.typography.text.color}
                        >
                          {renderMeteredEntitlementPricing(meteredEntitlement)}
                        </Text>
                      </Flex>
                    );
                  })}
                </Flex>
              )}

              {!addOn.isSelected ? (
                <Button
                  type="button"
                  disabled={isLoading || !isAddOnValid}
                  onClick={() => toggle(addOn.id)}
                  $size="sm"
                  $color="primary"
                  $variant="outline"
                  $fullWidth
                >
                  {t("Choose add-on")}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isLoading || !isAddOnValid}
                  onClick={() => toggle(addOn.id)}
                  $size="sm"
                  $color={isAddOnCurrent ? "danger" : "primary"}
                  $variant={isAddOnCurrent ? "ghost" : "text"}
                  $fullWidth
                >
                  {isAddOnCurrent ? (
                    t("Remove add-on")
                  ) : (
                    <>
                      <Icon name="check-rounded" size="sm" />
                      {t("Selected")}
                    </>
                  )}
                </Button>
              )}
            </Flex>
          </Flex>
        );
      })}
    </Box>
  );
};
