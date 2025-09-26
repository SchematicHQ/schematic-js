import {
  Fragment,
  HTMLAttributeAnchorTarget,
  forwardRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { type CompanyPlanDetailResponseData } from "../../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../../api/componentspublic";
import {
  PriceInterval,
  TEXT_BASE_SIZE,
  VISIBLE_ENTITLEMENT_COUNT,
} from "../../../const";
import { type FontStyle } from "../../../context";
import { useAvailablePlans, useEmbed } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { entitlementCountsReducer } from "../../../utils";
import { Container, FussyChild } from "../../layout";
import { PeriodToggle } from "../../shared";
import { Box, Flex, Loader, Text } from "../../ui";

import { AddOn } from "./AddOn";
import { Plan } from "./Plan";

interface DesignProps {
  showPeriodToggle: boolean;
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
  callToActionTarget?: HTMLAttributeAnchorTarget;
  onCallToAction?: (
    plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
  ) => unknown;
};

export type PricingTableProps = DesignProps;

export const PricingTable = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    PricingTableOptions &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, isPending, hydratePublic } = useEmbed();

  const showCallToAction = useMemo(() => {
    return (
      typeof rest.callToActionUrl === "string" ||
      typeof rest.onCallToAction === "function"
    );
  }, [rest.callToActionUrl, rest.onCallToAction]);

  const callToActionTarget = useMemo(() => {
    if (rest.callToActionTarget) {
      return rest.callToActionTarget;
    }

    if (rest.callToActionUrl) {
      try {
        const ctaUrlOrigin = new URL(rest.callToActionUrl).origin;
        if (ctaUrlOrigin === window.location.hostname) {
          return "_self";
        }
      } catch {
        // fallback to the default value if the provided target value is not a full URL
      }
    }

    return "_blank";
  }, [rest.callToActionUrl, rest.callToActionTarget]);

  const { currentPeriod, showPeriodToggle, isStandalone } = useMemo(() => {
    const isStandalone = typeof data?.component === "undefined";

    return {
      currentPeriod: data?.company?.plan?.planPeriod || "month",
      currentAddOns: data?.company?.addOns || [],
      canCheckout: isStandalone ?? data?.capabilities?.checkout ?? true,
      showPeriodToggle: data?.showPeriodToggle ?? props.showPeriodToggle,
      isTrialSubscription:
        data?.company?.billingSubscription?.status === "trialing",
      willSubscriptionCancel: data?.company?.billingSubscription?.cancelAt,
      isStandalone,
    };
  }, [
    props.showPeriodToggle,
    data?.capabilities?.checkout,
    data?.company?.addOns,
    data?.company?.billingSubscription?.cancelAt,
    data?.company?.billingSubscription?.status,
    data?.company?.plan?.planPeriod,
    data?.component,
    data?.showPeriodToggle,
  ]);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  const [entitlementCounts, setEntitlementCounts] = useState(() =>
    plans.reduce(entitlementCountsReducer, {}),
  );

  const handleToggleShowAll = (id: string) => {
    setEntitlementCounts((prev) => {
      const count = prev[id] ? { ...prev[id] } : undefined;

      if (count) {
        return {
          ...prev,
          [id]: {
            size: count.size,
            limit:
              count.limit > VISIBLE_ENTITLEMENT_COUNT
                ? VISIBLE_ENTITLEMENT_COUNT
                : count.size,
          },
        };
      }

      return prev;
    });
  };

  useEffect(() => {
    if (isStandalone) {
      hydratePublic();
    }
  }, [isStandalone, hydratePublic]);

  useEffect(() => {
    setEntitlementCounts(plans.reduce(entitlementCountsReducer, {}));
  }, [plans]);

  if (isPending) {
    return (
      <Flex
        $width="100%"
        $height="100%"
        $alignItems="center"
        $justifyContent="center"
        $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
      >
        <Loader $size="2xl" />
      </Flex>
    );
  }

  const Wrapper = isStandalone ? Container : Fragment;

  return (
    <Wrapper>
      <FussyChild
        ref={ref}
        className={`sch-PricingTable ${className}`}
        as={Flex}
        $flexDirection="column"
        $gap="2rem"
      >
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
            <Text display={props.header.fontStyle}>
              {props.header.isVisible &&
                props.plans.isVisible &&
                plans.length > 0 &&
                t("Plans")}
            </Text>

            {showPeriodToggle && periods.length > 1 && (
              <PeriodToggle
                options={periods}
                selectedOption={selectedPeriod}
                onSelect={(period) => {
                  if (period !== selectedPeriod) {
                    setSelectedPeriod(period);
                  }
                }}
              />
            )}
          </Flex>

          {props.plans.isVisible && plans.length > 0 && (
            <Box
              $display="grid"
              $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
              $gap="1rem"
            >
              {plans.map((plan, index, self) => {
                const planPeriod = showPeriodToggle
                  ? selectedPeriod
                  : plan.yearlyPrice && !plan.monthlyPrice
                    ? PriceInterval.Year
                    : PriceInterval.Month;

                return (
                  <Plan
                    key={index}
                    plan={plan}
                    index={index}
                    sharedProps={{
                      layout: props,
                      showCallToAction,
                      callToActionUrl: rest.callToActionUrl,
                      callToActionTarget,
                      onCallToAction: rest.onCallToAction,
                    }}
                    plans={self}
                    selectedPeriod={planPeriod}
                    entitlementCounts={entitlementCounts}
                    handleToggleShowAll={handleToggleShowAll}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        <Box>
          {props.addOns.isVisible && addOns.length > 0 && (
            <>
              {props.header.isVisible && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $marginBottom="1rem"
                >
                  <Text display={props.header.fontStyle}>{t("Add-ons")}</Text>
                </Flex>
              )}

              <Box
                $display="grid"
                $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
                $gap="1rem"
              >
                {addOns.map((addOn, index) => {
                  const addOnPeriod = showPeriodToggle
                    ? selectedPeriod
                    : addOn.yearlyPrice && !addOn.monthlyPrice
                      ? PriceInterval.Year
                      : PriceInterval.Month;

                  return (
                    <AddOn
                      key={index}
                      addOn={addOn}
                      sharedProps={{
                        layout: props,
                        showCallToAction,
                        callToActionUrl: rest.callToActionUrl,
                        callToActionTarget,
                        onCallToAction: rest.onCallToAction,
                      }}
                      selectedPeriod={addOnPeriod}
                    />
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      </FussyChild>
    </Wrapper>
  );
});

PricingTable.displayName = "PricingTable";
