import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ProrationBehavior } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan, UsageBasedEntitlement } from "../../../types";
import {
  adjectify,
  calculateTieredCost,
  formatCurrency,
  formatOrdinal,
  getEntitlementPrice,
  getFeatureName,
  groupPlanCreditGrants,
  isTieredPrice,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Input, Text } from "../../ui";

interface QuantityProps {
  portal?: HTMLElement | null;
  isLoading: boolean;
  period: string;
  selectedPlan?: SelectedPlan;
  entitlements: UsageBasedEntitlement[];
  updateQuantity: (id: string, quantity: number) => void;
  currency?: string;
}

export const Quantity = ({
  portal,
  entitlements,
  updateQuantity,
  period,
  selectedPlan,
  currency: selectedCurrency,
}: QuantityProps) => {
  const { data, settings } = useEmbed();

  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const unitPriceFontSize = 0.875 * settings.theme.typography.text.fontSize;

  const planCredits = useMemo(
    () => groupPlanCreditGrants(selectedPlan?.includedCreditGrants ?? []),
    [selectedPlan?.includedCreditGrants],
  );

  const prorationBehavior = data?.checkoutSettings?.prorationBehavior;
  const renewalDate = data?.upcomingInvoice?.dueDate ?? undefined;

  return (
    <Flex $flexDirection="column" $gap="1rem">
      {entitlements.reduce((acc: React.ReactElement[], entitlement) => {
        if (entitlement.feature) {
          const entitlementBillingPrice = getEntitlementPrice(
            entitlement,
            period,
            selectedCurrency,
          );
          const {
            price,
            currency,
            packageSize = 1,
            priceTier: priceTiers,
            tiersMode,
          } = entitlementBillingPrice || {};

          const tiered = isTieredPrice(entitlementBillingPrice);

          // The credit whose grant scales with this license feature: its
          // per-unit amount drives the "N seats × M = total" math below.
          const licenseId = entitlement.feature.licenseId;
          const licenseCredit = licenseId
            ? planCredits.find((credit) =>
                credit.perLicenseGrants.some(
                  (grant) => grant.licenseId === licenseId,
                ),
              )
            : undefined;
          const perLicenseGrant = licenseCredit?.perLicenseGrants.find(
            (grant) => grant.licenseId === licenseId,
          );
          const includedCredits = perLicenseGrant
            ? perLicenseGrant.amount * entitlement.quantity
            : 0;
          const addedQuantity = entitlement.quantity - entitlement.allocation;
          const addedCredits = perLicenseGrant
            ? perLicenseGrant.amount * addedQuantity
            : 0;
          const showCreditDelta = !!selectedPlan?.current && addedCredits > 0;

          acc.push(
            <Flex
              key={entitlement.id}
              $flexDirection="column"
              $gap="1rem"
              $padding={`${cardPadding}rem`}
              $backgroundColor={settings.theme.card.background}
              $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              {...(settings.theme.card.hasShadow && {
                $boxShadow: cardBoxShadow,
              })}
            >
              <Flex
                $justifyContent="space-between"
                $alignItems="center"
                $gap="1rem"
              >
                <Flex
                  $flexDirection="column"
                  $gap="0.75rem"
                  $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                >
                  <Box>
                    <Text display="heading2">{entitlement.feature.name}</Text>
                  </Box>

                  {entitlement.feature.description && (
                    <Box $marginBottom="0.5rem">
                      <Text>{entitlement.feature.description}</Text>
                    </Box>
                  )}
                </Flex>

                <Flex
                  $flexDirection="column"
                  $gap="0.5rem"
                  $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                >
                  <Input
                    $size="lg"
                    type="number"
                    defaultValue={entitlement.quantity}
                    min={0}
                    autoFocus
                    onFocus={(event) => {
                      event.target.select();
                    }}
                    onChange={(event) => {
                      event.preventDefault();

                      const value = parseInt(event.target.value);
                      if (!isNaN(value)) {
                        updateQuantity(entitlement.id, value);
                      }
                    }}
                  />

                  <Text
                    style={{ opacity: 0.54 }}
                    $size={unitPriceFontSize}
                    $color={settings.theme.typography.text.color}
                  >
                    {t("Currently using", {
                      quantity: entitlement.usage,
                      unit: getFeatureName(entitlement.feature),
                    })}
                  </Text>

                  {entitlement.quantity < entitlement.usage && (
                    <Text $size={unitPriceFontSize} $color="#DB6669">
                      {t("Cannot downgrade entitlement")}
                    </Text>
                  )}
                </Flex>

                <Box
                  $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                  $textAlign="right"
                >
                  <Box $whiteSpace="nowrap">
                    <Text>
                      {formatCurrency(
                        tiered && priceTiers
                          ? calculateTieredCost(
                              entitlement.quantity,
                              priceTiers,
                              tiersMode,
                            )
                          : (price ?? 0) * entitlement.quantity,
                        currency,
                      )}
                      <sub>/{shortenPeriod(period)}</sub>
                    </Text>
                  </Box>

                  <Box $whiteSpace="nowrap">
                    {tiered ? (
                      <Flex $justifyContent="end">
                        <Text
                          style={{ opacity: 0.54 }}
                          $size={unitPriceFontSize}
                          $color={settings.theme.typography.text.color}
                        >
                          {t("Tier-based")}
                          <PricingTiersTooltip
                            portal={portal}
                            feature={entitlement.feature}
                            period={period}
                            currency={currency}
                            priceTiers={priceTiers}
                            tiersMode={tiersMode ?? undefined}
                          />
                        </Text>
                      </Flex>
                    ) : (
                      <Text
                        style={{ opacity: 0.54 }}
                        $size={unitPriceFontSize}
                        $color={settings.theme.typography.text.color}
                      >
                        {formatCurrency(price ?? 0, currency)}
                        <sub>
                          /{packageSize > 1 && <>{packageSize} </>}
                          {getFeatureName(entitlement.feature, packageSize)}/
                          {shortenPeriod(period)}
                        </sub>
                      </Text>
                    )}
                  </Box>
                </Box>
              </Flex>

              {licenseCredit && perLicenseGrant && licenseCredit.period && (
                <Flex
                  $flexDirection="column"
                  $gap="0.5rem"
                  $paddingTop="1rem"
                  $borderWidth={0}
                  $borderTopWidth="1px"
                  $borderStyle="solid"
                  $borderColor={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.175)"
                      : "hsla(0, 0%, 100%, 0.175)"
                  }
                >
                  <Flex
                    $justifyContent="space-between"
                    $alignItems="baseline"
                    $flexWrap="wrap"
                    $gap="0.5rem"
                  >
                    <Text>{t("Credits included")}</Text>

                    <Text display="heading4">
                      {t("X licenses times Y credits", {
                        quantity: entitlement.quantity,
                        licenseName: getFeatureName(
                          entitlement.feature,
                          entitlement.quantity,
                        ),
                        perUnit: perLicenseGrant.amount,
                        total: includedCredits,
                        creditName: getFeatureName(
                          licenseCredit,
                          includedCredits,
                        ),
                        period: shortenPeriod(licenseCredit.period),
                      })}
                    </Text>
                  </Flex>

                  {showCreditDelta && (
                    <Text
                      style={{ opacity: 0.54 }}
                      $size={unitPriceFontSize}
                      $color={settings.theme.typography.text.color}
                    >
                      {prorationBehavior ===
                      ProrationBehavior.CreateProrations ? (
                        renewalDate && (
                          <>
                            {t("Your credit grant increases on the day", {
                              total: includedCredits,
                              day: formatOrdinal(renewalDate.getDate()),
                            })}
                          </>
                        )
                      ) : (
                        <>
                          {t("Adding licenses grants more credits today", {
                            added: addedQuantity,
                            licenseName: getFeatureName(
                              entitlement.feature,
                              addedQuantity,
                            ),
                            credits: addedCredits,
                            creditName: getFeatureName(
                              licenseCredit,
                              addedCredits,
                            ),
                          })}
                          {renewalDate && (
                            <>
                              {" "}
                              {t("Your full credits renew on the day", {
                                total: includedCredits,
                                creditName: getFeatureName(
                                  licenseCredit,
                                  includedCredits,
                                ),
                                cadence: adjectify(licenseCredit.period),
                                day: formatOrdinal(renewalDate.getDate()),
                              })}
                            </>
                          )}
                        </>
                      )}
                    </Text>
                  )}
                </Flex>
              )}
            </Flex>,
          );
        }

        return acc;
      }, [])}
    </Flex>
  );
};
