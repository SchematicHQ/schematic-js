import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  BillingProductPriceInterval,
  type CompanyPlanDetailResponseData,
} from "../../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../../api/componentspublic";
import { DEFAULT_CURRENCY, TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useAvailableCurrenciesWithInvalid,
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  adjectify,
  getCurrencyFlag,
  getCurrencySymbol,
  getPlanPrice,
  getSubscriptionPeriod,
  planSupportsCurrency,
} from "../../../utils";
import { PricingTable as Headless } from "../../headless/pricing-table";
import { Container, FussyChild } from "../../layout";
import { InvalidCurrencyNotice } from "../../shared";
import { Box, Button, Flex, Loader, Text, Tooltip } from "../../ui";

import { AddOn } from "./AddOn";
import { Plan } from "./Plan";

const PERIOD_MONTH_COUNT: Record<string, number> = {
  year: 12,
  quarter: 3,
};

interface DesignProps {
  showPeriodToggle: boolean;
  showCurrencySelector: boolean;
  showDiscount: boolean;
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  plans: {
    isVisible: boolean;
    name: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    showInclusionText: boolean;
    showFeatureIcons: boolean;
    showFeatureDescriptions: boolean;
    showEntitlements: boolean;
  };
  addOns: {
    isVisible: boolean;
    showDescription: boolean;
    showFeatureIcons: boolean;
    showFeatureDescriptions: boolean;
    showEntitlements: boolean;
  };
  upgrade: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary";
  };
  downgrade: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary";
  };
}

const resolveDesignProps = (props: DeepPartial<DesignProps>): DesignProps => {
  return {
    showPeriodToggle: props.showPeriodToggle ?? true,
    showCurrencySelector: props.showCurrencySelector ?? true,
    showDiscount: props.showDiscount ?? true,
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading3",
    },
    plans: {
      isVisible: props.plans?.isVisible ?? true,
      name: {
        fontStyle: props.plans?.name?.fontStyle ?? "heading2",
      },
      description: {
        isVisible: props.plans?.description?.isVisible ?? true,
        fontStyle: props.plans?.description?.fontStyle ?? "text",
      },
      showInclusionText: props.plans?.showInclusionText ?? true,
      showFeatureIcons: props.plans?.showFeatureIcons ?? true,
      showFeatureDescriptions: props.plans?.showFeatureDescriptions ?? false,
      showEntitlements: props.plans?.showEntitlements ?? true,
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      showDescription: props.addOns?.showDescription ?? true,
      showFeatureIcons: props.addOns?.showFeatureIcons ?? true,
      showFeatureDescriptions: props.plans?.showFeatureDescriptions ?? false,
      showEntitlements: props.addOns?.showEntitlements ?? true,
    },
    upgrade: {
      isVisible: props.upgrade?.isVisible ?? true,
      buttonSize: props.upgrade?.buttonSize ?? "md",
      buttonStyle: props.upgrade?.buttonStyle ?? "primary",
    },
    downgrade: {
      isVisible: props.downgrade?.isVisible ?? true,
      buttonSize: props.downgrade?.buttonSize ?? "md",
      buttonStyle: props.downgrade?.buttonStyle ?? "primary",
    },
  };
};

export type PricingTableOptions = {
  callToActionUrl?: string;
  callToActionTarget?: React.HTMLAttributeAnchorTarget;
  onCallToAction?: (
    plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
  ) => unknown;
};

export type PricingTableProps = DesignProps;

export const PricingTableElement = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    PricingTableOptions &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const layout = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, isPending, hydratePublic, currencyFilter } =
    useEmbed();

  const isLightBackground = useIsLightBackground();

  const getCallToActionTarget = useCallback(
    (url?: string, target?: React.HTMLAttributeAnchorTarget) => {
      if (target) {
        return target;
      }

      if (url) {
        try {
          const ctaUrlOrigin = new URL(url).origin;
          if (ctaUrlOrigin === window.location.hostname) {
            return "_self";
          }
        } catch {
          // fallback to the default value if the provided target value is not a full URL
        }
      }

      return "_blank";
    },
    [],
  );

  const { currencies, invalidFilterEntries } =
    useAvailableCurrenciesWithInvalid();

  const showPeriodToggle =
    rest.showPeriodToggle ?? data?.displaySettings?.showPeriodToggle ?? true;
  const hasNoUsableCurrency = currencies.length === 0;

  const initialPeriod =
    getSubscriptionPeriod(data?.company?.billingSubscription) ||
    data?.company?.plan?.planPeriod ||
    "month";

  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencies[0] ?? DEFAULT_CURRENCY,
  );

  const {
    periods,
    plans: allPlans,
    addOns: allAddOns,
  } = useAvailablePlans(selectedPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  if (periods.length > 0 && !periods.includes(selectedPeriod)) {
    setSelectedPeriod(periods[0]);
  }
  if (currencies.length > 0 && !currencies.includes(selectedCurrency)) {
    setSelectedCurrency(currencies[0]);
  }

  const showCurrencyToggle = currencies.length > 1;
  const hasCurrencyFilter = !!currencyFilter && currencyFilter.length > 0;
  const hasCurrency = currencies.length > 1 || hasCurrencyFilter;

  // When a currency is in play (multi-currency data or an explicit
  // currencyFilter), hide plans/add-ons that lack pricing in the selected
  // currency rather than rendering them with a mismatched legacy fallback.
  const plans = useMemo(
    () =>
      hasCurrency
        ? allPlans.filter((plan) =>
            planSupportsCurrency(plan, selectedCurrency),
          )
        : allPlans,
    [allPlans, hasCurrency, selectedCurrency],
  );
  const addOns = useMemo(
    () =>
      hasCurrency
        ? allAddOns.filter((addOn) =>
            planSupportsCurrency(addOn, selectedCurrency),
          )
        : allAddOns,
    [allAddOns, hasCurrency, selectedCurrency],
  );

  const currentPlan = plans.find((plan) => plan.id === data?.company?.plan?.id);

  const savingsByPeriod = useMemo(() => {
    const result: Record<string, number> = {};
    if (!currentPlan) {
      return result;
    }

    const monthlyPrice = getPlanPrice(currentPlan, "month")?.price ?? 0;
    if (monthlyPrice <= 0) {
      return result;
    }

    for (const [period, months] of Object.entries(PERIOD_MONTH_COUNT)) {
      const periodPrice = getPlanPrice(currentPlan, period)?.price ?? 0;
      if (periodPrice > 0) {
        const baseline = monthlyPrice * months;
        result[period] =
          Math.round(((baseline - periodPrice) / baseline) * 10000) / 100;
      }
    }

    return result;
  }, [currentPlan]);

  useEffect(() => {
    if (typeof data?.component === "undefined") {
      hydratePublic();
    }
  }, [data?.component, hydratePublic]);

  if (isPending) {
    return (
      <Flex
        $width="100%"
        $height="100%"
        $alignItems="center"
        $justifyContent="center"
        $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
      >
        <Loader aria-label="loading" $size="2xl" />
      </Flex>
    );
  }

  if (hasNoUsableCurrency) {
    return (
      <Container>
        <Flex $justifyContent="center" $padding="2rem 0">
          <InvalidCurrencyNotice invalidEntries={invalidFilterEntries} />
        </Flex>
      </Container>
    );
  }

  const showCallToAction =
    typeof data?.component !== "undefined" ||
    typeof rest.callToActionUrl === "string" ||
    typeof rest.onCallToAction === "function";

  const callToActionTarget = getCallToActionTarget(
    rest.callToActionUrl,
    rest.callToActionTarget,
  );

  const sharedProps = {
    layout,
    showCallToAction,
    callToActionUrl: rest.callToActionUrl,
    callToActionTarget,
    onCallToAction: rest.onCallToAction,
  };

  const Wrapper = typeof data?.component === "undefined" ? Container : Fragment;

  return (
    <Wrapper>
      <Headless.Root
        ref={ref}
        asChild
        periods={periods}
        period={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        currencies={currencies}
        currency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        data-testid="sch-pricing-table"
      >
        <FussyChild as={Flex} $flexDirection="column" $gap="2rem">
          <Box>
            <Flex
              $flexDirection="column"
              $justifyContent="center"
              $alignItems="center"
              $gap="1rem"
              $marginBottom="1rem"
              $viewport={{
                md: {
                  $flexDirection: "row",
                  $justifyContent: "space-between",
                },
              }}
            >
              <Headless.Label asChild>
                <Text
                  as="h2"
                  display={layout.header.fontStyle}
                  style={{ margin: 0 }}
                >
                  {layout.header.isVisible &&
                    layout.plans.isVisible &&
                    plans.length > 0 &&
                    t("Plans")}
                </Text>
              </Headless.Label>

              <Flex $alignItems="center" $gap="0.75rem">
                {showCurrencyToggle && (
                  <Flex
                    data-testid="sch-currency-toggle"
                    $alignSelf="center"
                    $width="fit-content"
                    $margin={0}
                    $borderWidth="1px"
                    $borderStyle="solid"
                    $borderColor={
                      isLightBackground
                        ? "hsla(0, 0%, 0%, 0.125)"
                        : "hsla(0, 0%, 100%, 0.125)"
                    }
                    $borderRadius="2.5rem"
                    $cursor="pointer"
                  >
                    <Flex
                      $alignItems="center"
                      $padding="0.375rem 0.75rem"
                      style={{ position: "relative" }}
                    >
                      <Text
                        style={{
                          color: settings.theme.typography.text.color,
                        }}
                        $size={15}
                        $weight={600}
                      >
                        {getCurrencyFlag(selectedCurrency)}{" "}
                        {getCurrencySymbol(selectedCurrency)}{" "}
                        {selectedCurrency.toUpperCase()}
                      </Text>

                      <Headless.CurrencyToggle asChild>
                        <select
                          data-testid="sch-currency-select"
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            opacity: 0,
                            cursor: "pointer",
                            fontSize: "inherit",
                          }}
                        >
                          {currencies.map((currency) => (
                            <Headless.CurrencyOption
                              key={currency}
                              value={currency}
                            >
                              {getCurrencyFlag(currency)}{" "}
                              {getCurrencySymbol(currency)}{" "}
                              {currency.toUpperCase()}
                            </Headless.CurrencyOption>
                          ))}
                        </select>
                      </Headless.CurrencyToggle>

                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ marginLeft: "0.25rem", flexShrink: 0 }}
                      >
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke={settings.theme.typography.text.color}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Flex>
                  </Flex>
                )}

                {showPeriodToggle && periods.length > 1 && (
                  <Headless.PeriodToggle asChild>
                    <Flex
                      data-testid="sch-period-toggle"
                      $alignSelf="center"
                      $width="fit-content"
                      $margin={0}
                      $borderWidth="1px"
                      $borderStyle="solid"
                      $borderColor={
                        isLightBackground
                          ? "hsla(0, 0%, 0%, 0.125)"
                          : "hsla(0, 0%, 100%, 0.125)"
                      }
                      $borderRadius="2.5rem"
                      $cursor="pointer"
                    >
                      {periods.map((period) => {
                        const option = (
                          <Headless.PeriodOption
                            key={period}
                            value={period}
                            asChild
                          >
                            <Button
                              data-testid="sch-period-toggle-button"
                              $size="sm"
                              $variant="text"
                              style={{
                                flexGrow: 1,
                                flexBasis: "50%",
                                width: "100%",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                                borderRadius: "2.5rem",
                                ...(period === selectedPeriod && {
                                  backgroundColor: isLightBackground
                                    ? "hsla(0, 0%, 0%, 0.125)"
                                    : "hsla(0, 0%, 100%, 0.125)",
                                }),
                              }}
                            >
                              <Text
                                style={{
                                  flexShrink: 0,
                                  color: settings.theme.typography.text.color,
                                }}
                                $size={15}
                                $weight={period === selectedPeriod ? 600 : 400}
                              >
                                {t("Billed", { period: adjectify(period) })}
                              </Text>
                            </Button>
                          </Headless.PeriodOption>
                        );

                        const savingsPercentage = savingsByPeriod[period];
                        if (typeof savingsPercentage === "number") {
                          const isOptionYear = period === "year";
                          return (
                            <Tooltip
                              key={period}
                              trigger={option}
                              content={
                                <Text $size={11} $leading="none">
                                  {selectedPeriod === period
                                    ? t(
                                        isOptionYear
                                          ? "Saving with yearly billing"
                                          : "Saving with quarterly billing",
                                        { percent: savingsPercentage },
                                      )
                                    : t(
                                        isOptionYear
                                          ? "Save with yearly billing"
                                          : "Save with quarterly billing",
                                        { percent: savingsPercentage },
                                      )}
                                </Text>
                              }
                              $flexGrow={1}
                              $flexBasis="50%"
                            />
                          );
                        }

                        return option;
                      })}
                    </Flex>
                  </Headless.PeriodToggle>
                )}
              </Flex>
            </Flex>

            {layout.plans.isVisible && plans.length > 0 && (
              <Headless.Section asChild>
                <Box
                  as="ul"
                  data-testid="sch-plans"
                  $display="grid"
                  $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
                  $gap="1rem"
                  $padding={0}
                  $margin={0}
                  $listStyle="none"
                >
                  {plans.map((plan, index, self) => {
                    const planPeriod = showPeriodToggle
                      ? selectedPeriod
                      : plan.monthlyPrice
                        ? BillingProductPriceInterval.Month
                        : plan.quarterlyPrice
                          ? "quarter"
                          : plan.yearlyPrice
                            ? BillingProductPriceInterval.Year
                            : BillingProductPriceInterval.Month;

                    return (
                      <Plan
                        key={index}
                        plan={plan}
                        index={index}
                        sharedProps={sharedProps}
                        plans={self}
                        selectedPeriod={planPeriod}
                        currency={hasCurrency ? selectedCurrency : undefined}
                      />
                    );
                  })}
                </Box>
              </Headless.Section>
            )}
          </Box>

          <Box>
            {layout.addOns.isVisible && addOns.length > 0 && (
              <>
                {layout.header.isVisible && (
                  <Flex
                    $justifyContent="space-between"
                    $alignItems="center"
                    $marginBottom="1rem"
                  >
                    <Headless.Label asChild>
                      <Text
                        as="h2"
                        display={layout.header.fontStyle}
                        style={{ margin: 0 }}
                      >
                        {t("Add-ons")}
                      </Text>
                    </Headless.Label>
                  </Flex>
                )}

                <Headless.Section asChild>
                  <Box
                    as="ul"
                    $display="grid"
                    $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
                    $gap="1rem"
                    $padding={0}
                    $margin={0}
                    $listStyle="none"
                  >
                    {addOns.map((addOn, index) => {
                      const addOnPeriod = showPeriodToggle
                        ? selectedPeriod
                        : addOn.monthlyPrice
                          ? BillingProductPriceInterval.Month
                          : addOn.quarterlyPrice
                            ? "quarter"
                            : addOn.yearlyPrice
                              ? BillingProductPriceInterval.Year
                              : BillingProductPriceInterval.Month;

                      return (
                        <AddOn
                          key={index}
                          addOn={addOn}
                          sharedProps={sharedProps}
                          selectedPeriod={addOnPeriod}
                          currency={hasCurrency ? selectedCurrency : undefined}
                        />
                      );
                    })}
                  </Box>
                </Headless.Section>
              </>
            )}
          </Box>
        </FussyChild>
      </Headless.Root>
    </Wrapper>
  );
});

PricingTableElement.displayName = "PricingTable";
