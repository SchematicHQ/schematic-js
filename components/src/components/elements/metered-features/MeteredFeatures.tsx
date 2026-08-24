import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  BillingCreditGrantReason,
  EntitlementPriceBehavior,
  EntitlementValueType,
  FeatureType,
  type FeatureUsageResponseData,
} from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE, VISIBLE_CREDIT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  aggregateActiveGrantsByCredit,
  entitlementHasHardLimit,
  findLicenseSource,
  formatConsumptionRate,
  formatCurrency,
  formatNumber,
  formatOrdinal,
  getFeatureName,
  getPurchasableCreditIds,
  getSubscriptionPeriod,
  getUsageDetails,
  groupPlanCreditGrants,
  modifyDate,
  resolvePlanCreditQuantity,
  shortenPeriod,
  toPrettyDate,
  type UsageDetails,
} from "../../../utils";
import { Element } from "../../layout";
import { ExpandListToggle, HardLimitTooltip } from "../../shared";
import {
  Box,
  Button,
  Flex,
  Icon,
  ProgressBar,
  Text,
  TransitionBox,
  progressColorMap,
} from "../../ui";

import { Meter } from "./Meter";
import { PriceDetails } from "./PriceDetails";
import { UsageByUser } from "./UsageByUser";
import * as styles from "./styles";

interface LimitProps {
  entitlement: FeatureUsageResponseData;
  usageDetails: UsageDetails;
  fontStyle?: FontStyle;
}

const Limit = ({ entitlement, usageDetails, fontStyle }: LimitProps) => {
  const { t } = useTranslation();

  const { data } = useEmbed();

  const { feature, planEntitlement, priceBehavior, usage, metricResetAt } =
    entitlement;
  const { billingPrice, limit, cost, currentTier } = usageDetails;

  const acc: React.ReactNode[] = [];

  acc.push(
    priceBehavior === EntitlementPriceBehavior.Tier &&
      typeof currentTier?.to === "number" &&
      typeof feature !== "undefined"
      ? currentTier?.to === Infinity
        ? t("Unlimited in this tier", {
            feature: getFeatureName(feature),
          })
        : t("Up to X units in this tier", {
            amount: currentTier.to,
            feature: getFeatureName(feature),
          })
      : priceBehavior === EntitlementPriceBehavior.Overage &&
          typeof limit === "number"
        ? t("X included", {
            amount: formatNumber(limit),
          })
        : priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
            typeof usage === "number"
          ? `${formatNumber(usage)} ${t("used")}`
          : priceBehavior === EntitlementPriceBehavior.PayAsYouGo &&
              typeof cost === "number"
            ? formatCurrency(cost, billingPrice?.currency)
            : data?.displaySettings?.showCredits &&
                priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
                typeof planEntitlement?.valueCredit !== "undefined" &&
                typeof planEntitlement?.consumptionRate === "number"
              ? t("X units per use", {
                  amount: formatConsumptionRate(
                    planEntitlement.consumptionRate,
                  ),
                  units: getFeatureName(
                    planEntitlement.valueCredit,
                    planEntitlement.consumptionRate,
                  ),
                })
              : priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
                  typeof feature !== "undefined" &&
                  typeof limit === "number"
                ? t("X units remaining", {
                    amount: formatNumber(limit),
                    units: getFeatureName(feature, limit),
                  })
                : typeof limit === "number"
                  ? t("Limit of", {
                      amount: formatNumber(limit),
                    })
                  : t("No limit"),
  );

  if (metricResetAt) {
    acc.push(
      t("Resets", {
        date: toPrettyDate(metricResetAt, {
          month: "numeric",
          day: "numeric",
          year: undefined,
        }),
      }),
    );
  }

  return (
    <Text display={fontStyle}>
      {acc.join(" • ")}
      {entitlementHasHardLimit(entitlement) &&
        entitlement.allocationType === EntitlementValueType.Numeric && (
          <HardLimitTooltip
            feature={entitlement.feature}
            limit={entitlement.allocation}
          />
        )}
    </Text>
  );
};

interface DesignProps {
  isVisible: boolean;
  header: {
    fontStyle: FontStyle;
  };
  description: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  icon: {
    isVisible: boolean;
  };
  allocation: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  usage: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  visibleFeatures?: string[];
}

function resolveDesignProps(props: DeepPartial<DesignProps>): DesignProps {
  return {
    isVisible: props.isVisible ?? true,
    header: {
      fontStyle: props.header?.fontStyle ?? "heading2",
    },
    description: {
      isVisible: props.description?.isVisible ?? true,
      fontStyle: props.description?.fontStyle ?? "text",
    },
    icon: {
      isVisible: props.icon?.isVisible ?? true,
    },
    allocation: {
      isVisible: props.allocation?.isVisible ?? true,
      fontStyle: props.allocation?.fontStyle ?? "heading4",
    },
    usage: {
      isVisible: props.usage?.isVisible ?? true,
      fontStyle: props.usage?.fontStyle ?? "heading5",
    },
    // there is a typescript bug with `DeepPartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
  };
}

export type MeteredFeaturesProps = DesignProps;

export const MeteredFeatures = forwardRef<
  HTMLDivElement | null,
  ElementProps & DeepPartial<DesignProps> & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const elementsRef = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elementsRef);

  const { t } = useTranslation();

  const { data, settings, setCheckoutState, warningThresholdConfig } =
    useEmbed();
  const showWarningThresholdAsLimit =
    warningThresholdConfig?.showAsLimit ?? false;

  const isLightBackground = useIsLightBackground();

  const meteredFeatures = useMemo(() => {
    const orderedFeatureUsage = props.visibleFeatures?.reduce(
      (acc: FeatureUsageResponseData[], id) => {
        const mappedFeatureUsage = data?.featureUsage?.features.find(
          (usage) => usage.feature?.id === id,
        );

        if (mappedFeatureUsage) {
          acc.push(mappedFeatureUsage);
        }

        return acc;
      },
      [],
    );

    return (orderedFeatureUsage || data?.featureUsage?.features || []).filter(
      ({ feature }) =>
        feature?.featureType === FeatureType.Event ||
        feature?.featureType === FeatureType.Trait,
    );
  }, [props.visibleFeatures, data?.featureUsage?.features]);

  const creditGroups = useMemo(
    () => aggregateActiveGrantsByCredit(data?.creditGrants || []),
    [data?.creditGrants],
  );

  // Per-license composition of the current plan's grants (credits per license
  // unit × license quantity), surfaced as helper text below the balance bar.
  const planCreditCompositions = useMemo(
    () =>
      groupPlanCreditGrants(data?.company?.plan?.includedCreditGrants ?? []),
    [data?.company?.plan?.includedCreditGrants],
  );

  const resolveLicenseQuantity = useCallback(
    (licenseId: string) => {
      const allocation = findLicenseSource(
        data?.featureUsage?.features ?? [],
        licenseId,
      )?.allocation;
      return typeof allocation === "number" ? allocation : undefined;
    },
    [data?.featureUsage?.features],
  );

  // Credits with at least one bundle purchasable on the company's current
  // plan; "Buy More" shows for exactly these, so the button never opens a
  // checkout the API would reject (and never shows when there is nothing
  // compatible to buy).
  const purchasableCreditIds = useMemo(
    () => getPurchasableCreditIds(data?.creditBundles, data?.company?.plan?.id),
    [data?.creditBundles, data?.company?.plan?.id],
  );

  // Track expanded credits by id rather than seeding an array from creditGroups:
  // the component can mount before credit data loads, and a seeded array would
  // never resync, leaving the expand chevron a no-op for late-arriving credits.
  const [expandedCreditIds, setExpandedCreditIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Within an open balance details panel, the grant ledger itself is truncated
  // until the user asks for the full list.
  const [fullLedgerCreditIds, setFullLedgerCreditIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleFullLedger = useCallback((id: string) => {
    setFullLedgerCreditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleBalanceDetails = useCallback((id: string) => {
    setExpandedCreditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    // Closing the panel resets its ledger, so reopening always starts
    // summarized rather than reinstating a full list the user expanded and
    // forgot about.
    setFullLedgerCreditIds((prev) => {
      if (!prev.has(id)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const shouldShowFeatures =
    meteredFeatures.length > 0 || creditGroups.length > 0;
  if (!shouldShowFeatures) {
    return null;
  }

  const period =
    getSubscriptionPeriod(data?.company?.billingSubscription) ??
    (typeof data?.company?.plan?.planPeriod === "string"
      ? data.company?.plan?.planPeriod
      : undefined);

  const canCheckout = data?.capabilities?.checkout ?? false;
  const showCredits = data?.displaySettings?.showCredits ?? true;

  return (
    <styles.Container ref={ref} className={className}>
      {meteredFeatures.reduce((acc: React.ReactNode[], entitlement, index) => {
        if (!entitlement.feature) {
          return acc;
        }

        const { feature, priceBehavior, usage } = entitlement;
        const usageDetails = getUsageDetails(entitlement, period, undefined, {
          showWarningThresholdAsLimit,
        });
        const { limit } = usageDetails;

        acc.push(
          <Element key={index} as={Flex} $flexDirection="column" $gap="1.5rem">
            <Flex $gap="1.5rem">
              {props.icon.isVisible && (
                <Icon
                  name={feature.icon}
                  color={settings.theme.primary}
                  background={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.0625)"
                      : "hsla(0, 0%, 100%, 0.25)"
                  }
                  rounded
                />
              )}

              <Flex $flexDirection="column" $gap="2rem" $flexGrow={1}>
                <Flex
                  ref={(el) => {
                    if (el) {
                      elementsRef.current.push(el);
                    }
                  }}
                  $flexWrap="wrap"
                  $gap="1rem"
                >
                  <Flex $flexDirection="column" $gap="0.5rem" $flexGrow={1}>
                    <Box>
                      <Text display={props.header.fontStyle}>
                        {feature.name}
                      </Text>
                    </Box>

                    {props.description.isVisible && feature.description && (
                      <Box>
                        <Text display={props.description.fontStyle}>
                          {feature.description}
                        </Text>
                      </Box>
                    )}
                  </Flex>

                  <Box
                    $flexBasis="min-content"
                    $flexGrow={1}
                    $textAlign={shouldWrapChildren ? "left" : "right"}
                  >
                    {props.usage.isVisible && (
                      <Box $whiteSpace="nowrap">
                        <Text display={props.usage.fontStyle}>
                          {priceBehavior ===
                          EntitlementPriceBehavior.PayInAdvance ? (
                            <>
                              {typeof limit === "number" && (
                                <>{formatNumber(limit)} </>
                              )}
                              {getFeatureName(feature, limit)}
                            </>
                          ) : (
                            typeof usage === "number" && (
                              <>
                                {formatNumber(usage)}{" "}
                                {getFeatureName(feature, usage)} {t("used")}
                              </>
                            )
                          )}
                        </Text>
                      </Box>
                    )}

                    {props.allocation.isVisible && (
                      <Limit
                        entitlement={entitlement}
                        usageDetails={usageDetails}
                        fontStyle={props.allocation.fontStyle}
                      />
                    )}
                  </Box>
                </Flex>

                {props.isVisible &&
                  priceBehavior !== EntitlementPriceBehavior.PayAsYouGo &&
                  priceBehavior !== EntitlementPriceBehavior.CreditBurndown && (
                    <Meter entitlement={entitlement} />
                  )}

                {canCheckout &&
                  priceBehavior === EntitlementPriceBehavior.PayInAdvance && (
                    <Button
                      type="button"
                      onClick={() => {
                        setCheckoutState({ usage: true });
                      }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {t("Add More")}
                    </Button>
                  )}
              </Flex>
            </Flex>

            {(priceBehavior === EntitlementPriceBehavior.Overage ||
              priceBehavior === EntitlementPriceBehavior.Tier) && (
              <PriceDetails
                entitlement={entitlement}
                usageDetails={usageDetails}
                period={period}
              />
            )}

            {feature.featureType === FeatureType.Event && (
              <UsageByUser
                source={{ kind: "feature", id: feature.id ?? "" }}
                // A credit-burndown feature's usage is denominated in the credit
                // it consumes (e.g. "tokens"), not the feature name — mirror how
                // the rest of the element labels it (see `Limit`).
                unit={getFeatureName(
                  priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
                    entitlement.planEntitlement?.valueCredit
                    ? entitlement.planEntitlement.valueCredit
                    : feature,
                  2,
                )}
              />
            )}
          </Element>,
        );

        return acc;
      }, [])}

      {showCredits &&
        creditGroups.map((credit, index) => {
          const isExpanded = expandedCreditIds.has(credit.id);

          const showAllGrants = fullLedgerCreditIds.has(credit.id);
          const canExpandLedger = credit.grants.length > VISIBLE_CREDIT_COUNT;
          const visibleGrants = showAllGrants
            ? credit.grants
            : credit.grants.slice(0, VISIBLE_CREDIT_COUNT);

          const paddingX = settings.theme.card.padding / TEXT_BASE_SIZE;
          // The first row carries the panel's top padding; every other row
          // carries its own bottom padding, so the last row is what gives the
          // panel its bottom padding.
          const getRowPadding = (rowIndex: number) =>
            rowIndex === 0 ? `1rem ${paddingX}rem` : `0 ${paddingX}rem 1rem`;

          return (
            <Element key={index} as={Flex} $flexDirection="column" $gap="1rem">
              <Flex $gap="1.5rem">
                {props.icon.isVisible && (
                  <Icon
                    // if `icon` is `undefined` this will render as a blank circle
                    name={credit.icon as string}
                    color={settings.theme.primary}
                    background={
                      isLightBackground
                        ? "hsla(0, 0%, 0%, 0.0625)"
                        : "hsla(0, 0%, 100%, 0.25)"
                    }
                    rounded
                  />
                )}

                <Flex $flexDirection="column" $gap="2rem" $flexGrow={1}>
                  <Flex $flexWrap="wrap" $gap="1rem">
                    <Flex $flexDirection="column" $gap="0.5rem" $flexGrow={1}>
                      <Box>
                        <Text display={props.header.fontStyle}>
                          {credit.name}
                        </Text>
                      </Box>

                      {props.description.isVisible && credit.description && (
                        <Box>
                          <Text display={props.description.fontStyle}>
                            {credit.description}
                          </Text>
                        </Box>
                      )}
                    </Flex>
                  </Flex>

                  <Flex $gap="1rem">
                    <ProgressBar
                      progress={(credit.total.used / credit.total.value) * 100}
                      value={credit.total.used}
                      total={credit.total.value}
                      color={
                        progressColorMap[
                          Math.floor(
                            (credit.total.used / credit.total.value) *
                              (progressColorMap.length - 1),
                          )
                        ]
                      }
                    />

                    {canCheckout && purchasableCreditIds.has(credit.id) && (
                      <Button
                        type="button"
                        onClick={() => {
                          setCheckoutState({ credits: true });
                        }}
                        style={{ whiteSpace: "nowrap" }}
                        $size="sm"
                      >
                        {t("Buy More")}
                      </Button>
                    )}
                  </Flex>

                  {(() => {
                    const composition = planCreditCompositions.find(
                      (planCredit) => planCredit.id === credit.id,
                    );
                    const perLicenseGrant =
                      composition?.perLicenseGrants.length === 1
                        ? composition.perLicenseGrants[0]
                        : undefined;
                    if (!composition || !perLicenseGrant) {
                      return null;
                    }

                    const licenseFeature = findLicenseSource(
                      data?.featureUsage?.features ?? [],
                      perLicenseGrant.licenseId,
                    )?.feature;
                    const licenseQuantity = resolveLicenseQuantity(
                      perLicenseGrant.licenseId,
                    );
                    const total = resolvePlanCreditQuantity(
                      composition,
                      resolveLicenseQuantity,
                    );
                    if (
                      !licenseFeature ||
                      typeof licenseQuantity !== "number" ||
                      typeof total !== "number" ||
                      !composition.period
                    ) {
                      return null;
                    }

                    const parts = [
                      t("credit composition per license", {
                        quantity: licenseQuantity,
                        licenseName: getFeatureName(
                          licenseFeature,
                          licenseQuantity,
                        ),
                        perUnit: perLicenseGrant.amount,
                      }),
                    ];
                    if (composition.fixedQuantity > 0) {
                      parts.push(
                        t("credit composition company grant", {
                          amount: composition.fixedQuantity,
                        }),
                      );
                    }

                    const renewalDate = data?.upcomingInvoice?.dueDate;

                    return (
                      // Pulled up against the balance bar despite the column's 2rem gap
                      <Box $marginTop="-1.5rem">
                        <Text
                          style={{ opacity: 0.54 }}
                          $size={
                            0.875 * settings.theme.typography.text.fontSize
                          }
                          $color={settings.theme.typography.text.color}
                        >
                          {t("Your plan includes credits", {
                            total,
                            creditName: getFeatureName(credit, total),
                            period: shortenPeriod(composition.period),
                            composition: ` — ${parts.join(" + ")}`,
                          })}
                          {renewalDate && (
                            <>
                              {" "}
                              {t("Renews on the day", {
                                day: formatOrdinal(renewalDate.getDate()),
                              })}
                            </>
                          )}
                        </Text>
                      </Box>
                    );
                  })()}
                </Flex>
              </Flex>

              <Box
                $width={`calc(100% + ${(2 * settings.theme.card.padding) / TEXT_BASE_SIZE}rem)`}
                $margin={`0 0 0 -${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
              >
                <TransitionBox
                  $backgroundColor={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.0375)"
                      : "hsla(0, 0%, 100%, 0.075)"
                  }
                  $isExpanded={isExpanded}
                >
                  {visibleGrants.map((grant, index) => {
                    const padding = getRowPadding(index);

                    return (
                      <Box key={grant.id} $display="table-row">
                        {grant.grantReason === BillingCreditGrantReason.Plan ? (
                          <>
                            <Box $display="table-cell" $padding={padding}>
                              <Text>
                                {t("X items included in plan", {
                                  amount: grant.quantity,
                                  item: getFeatureName(credit, grant.quantity),
                                })}
                              </Text>
                            </Box>

                            <Box
                              $display="table-cell"
                              $padding={padding}
                              $textAlign="right"
                              $whiteSpace="nowrap"
                            >
                              {grant.expiresAt && (
                                <Text>
                                  {t("Resets", {
                                    date: toPrettyDate(
                                      modifyDate(grant.expiresAt, 1),
                                      {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                      },
                                    ),
                                  })}
                                </Text>
                              )}
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box $display="table-cell" $padding={padding}>
                              <Text>
                                {grant.grantReason ===
                                BillingCreditGrantReason.Purchased ? (
                                  <>
                                    {t("X item bundle", {
                                      amount: grant.quantity,
                                      item: getFeatureName(credit, 1),
                                      createdAt: toPrettyDate(grant.createdAt, {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                      }),
                                    })}
                                  </>
                                ) : grant.grantReason ===
                                  BillingCreditGrantReason.BillingCreditAutoTopup ? (
                                  <>
                                    {t("X item auto-topup", {
                                      amount: grant.quantity,
                                      item: getFeatureName(
                                        credit,
                                        grant.quantity,
                                      ),
                                      createdAt: toPrettyDate(grant.createdAt, {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                      }),
                                    })}
                                  </>
                                ) : (
                                  <>
                                    {t("X item grant", {
                                      amount: grant.quantity,
                                      item: getFeatureName(
                                        credit,
                                        grant.quantity,
                                      ),
                                      createdAt: toPrettyDate(grant.createdAt, {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                      }),
                                    })}
                                  </>
                                )}
                              </Text>
                            </Box>

                            <Box
                              $display="table-cell"
                              $padding={padding}
                              $textAlign="right"
                              $whiteSpace="nowrap"
                            >
                              {grant.expiresAt && (
                                <Text>
                                  {t("Expires", {
                                    date: toPrettyDate(
                                      modifyDate(grant.expiresAt, 1),
                                      {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                      },
                                    ),
                                  })}
                                </Text>
                              )}
                            </Box>
                          </>
                        )}
                      </Box>
                    );
                  })}

                  {canExpandLedger && (
                    <Box $display="table-row">
                      <Box $display="table-cell" $padding={getRowPadding(1)}>
                        <ExpandListToggle
                          isExpanded={showAllGrants}
                          onToggle={() => toggleFullLedger(credit.id)}
                          total={credit.grants.length}
                          iconColor={
                            isLightBackground
                              ? "hsla(0, 0%, 0%, 0.8)"
                              : "hsla(0, 0%, 100%, 0.4)"
                          }
                        />
                      </Box>

                      {/* keeps the two-column anonymous table intact */}
                      <Box $display="table-cell" $padding={getRowPadding(1)} />
                    </Box>
                  )}
                </TransitionBox>
              </Box>

              <ExpandListToggle
                isExpanded={isExpanded}
                onToggle={() => toggleBalanceDetails(credit.id)}
                expandLabel={t("See balance details")}
                collapseLabel={t("Hide balance details")}
                iconColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.8)"
                    : "hsla(0, 0%, 100%, 0.4)"
                }
              />

              <UsageByUser
                source={{ kind: "credit", id: credit.id }}
                unit={getFeatureName(credit, 2)}
              />
            </Element>
          );
        })}
    </styles.Container>
  );
});

MeteredFeatures.displayName = "MeteredFeatures";
