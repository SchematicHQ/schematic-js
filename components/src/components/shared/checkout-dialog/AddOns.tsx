import { useTranslation } from "react-i18next";

import { PriceBehavior, TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  ChargeType,
  formatCurrency,
  getAddOnPrice,
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

export const AddOns = ({ addOns, toggle, isLoading, period }: AddOnsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

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
            $gap="2rem"
            $padding={`${cardPadding}rem`}
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
            <Flex $flexDirection="column" $gap="0.75rem">
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
                <Flex $flexDirection="column" $gap="0.25rem">
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

                  {displayableEntitlements.length > 0 && (
                    <Box>
                      {displayableEntitlements.map((entitlement, idx) => {
                        if (entitlement.isUnlimited) {
                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: idx > 0 ? "0.25rem" : undefined,
                                fontSize: "14px",
                                color: "#666",
                                opacity: 0.8,
                                fontFamily: "sans-serif",
                              }}
                            >
                              <span>
                                {entitlement.feature?.pluralName ||
                                  entitlement.feature?.name ||
                                  entitlement.featureName}
                              </span>
                              <span>Unlimited</span>
                            </div>
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
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: idx > 0 ? "0.25rem" : undefined,
                              fontSize: "14px",
                              color: "#666",
                              opacity: 0.8,
                              fontFamily: "sans-serif",
                            }}
                          >
                            {meteredEntitlement.priceBehavior ===
                              PriceBehavior.Overage &&
                            meteredEntitlement.softLimit ? (
                              <>
                                <span>
                                  {meteredEntitlement.softLimit}{" "}
                                  {meteredEntitlement.feature?.pluralName ||
                                    meteredEntitlement.feature?.name ||
                                    meteredEntitlement.featureName ||
                                    "units"}
                                </span>
                                <span>
                                  Additional:{" "}
                                  {formatCurrency(
                                    meteredEntitlement.price,
                                    meteredEntitlement.currency,
                                  )}
                                  /
                                  {meteredEntitlement.feature
                                    ? getFeatureName(
                                        meteredEntitlement.feature,
                                        meteredEntitlement.packageSize,
                                      )
                                    : meteredEntitlement.featureName || "unit"}
                                </span>
                              </>
                            ) : meteredEntitlement.priceBehavior ===
                                PriceBehavior.PayAsYouGo ||
                              meteredEntitlement.priceBehavior ===
                                PriceBehavior.PayInAdvance ? (
                              <>
                                <span>
                                  {meteredEntitlement.feature?.pluralName ||
                                    meteredEntitlement.feature?.name ||
                                    meteredEntitlement.featureName}
                                </span>
                                <span>
                                  {formatCurrency(
                                    meteredEntitlement.price,
                                    meteredEntitlement.currency,
                                  )}
                                  /
                                  {meteredEntitlement.packageSize > 1 && (
                                    <>{meteredEntitlement.packageSize} </>
                                  )}
                                  {meteredEntitlement.feature
                                    ? getFeatureName(
                                        meteredEntitlement.feature,
                                        meteredEntitlement.packageSize,
                                      )
                                    : meteredEntitlement.featureName || "unit"}
                                </span>
                              </>
                            ) : meteredEntitlement.isTiered ? (
                              <>
                                <span>{meteredEntitlement.featureName}</span>
                                <span>Tier-based pricing</span>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </Box>
                  )}
                </Flex>
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

            <Flex $flexDirection="column" $justifyContent="end" $flexGrow="1">
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
