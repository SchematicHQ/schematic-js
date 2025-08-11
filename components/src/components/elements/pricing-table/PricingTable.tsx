import { Fragment, forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type CompanyPlanDetailResponseData } from "../../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../../api/componentspublic";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import { useAvailablePlans, useEmbed } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { entitlementCountsReducer, isCheckoutData } from "../../../utils";
import { Container, FussyChild } from "../../layout";
import { PeriodToggle } from "../../shared";
import { Box, Flex, Text } from "../../ui";

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
      showFeatureDescriptions: props.plans?.showFeatureDescriptions ?? true,
      showEntitlements: props.plans?.showEntitlements ?? true,
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      showDescription: props.addOns?.showDescription ?? true,
      showFeatureIcons: props.addOns?.showFeatureIcons ?? true,
      showFeatureDescriptions: props.plans?.showFeatureDescriptions ?? true,
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
  onCallToAction?: (
    plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
  ) => unknown;
};

export type PricingTableProps = DesignProps & PricingTableOptions;

export const PricingTable = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    PricingTableOptions &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, callToActionUrl, onCallToAction, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, hydratePublic } = useEmbed();

  const { currentPeriod, isStandalone } = useMemo(() => {
    if (isCheckoutData(data)) {
      const billingSubscription = data.company?.billingSubscription;
      const isTrialSubscription = billingSubscription?.status === "trialing";
      const willSubscriptionCancel = billingSubscription?.cancelAt;

      return {
        currentPeriod: data.company?.plan?.planPeriod || "month",
        currentAddOns: data.company?.addOns || [],
        canCheckout: data.capabilities?.checkout ?? true,
        isTrialSubscription,
        willSubscriptionCancel,
        isStandalone: false,
        showCallToAction: true,
      };
    }

    return {
      currentPeriod: "month",
      currentAddOns: [],
      canCheckout: true,
      isTrialSubscription: false,
      willSubscriptionCancel: false,
      isStandalone: true,
      showCallToAction: typeof callToActionUrl === "string",
    };
  }, [data, callToActionUrl]);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod);

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
            <Text
              display={props.header.fontStyle}
              $color={settings.theme.card.background}
            >
              {props.header.isVisible &&
                props.plans.isVisible &&
                plans.length > 0 &&
                t("Plans")}
            </Text>

            {props.showPeriodToggle && periods.length > 1 && (
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
              {plans.map((plan, index, self) => (
                <Plan
                  key={index}
                  plan={plan}
                  index={index}
                  sharedProps={{
                    layout: props,
                    callToActionUrl,
                    onCallToAction,
                  }}
                  plans={self}
                  selectedPeriod={selectedPeriod}
                  entitlementCounts={entitlementCounts}
                  handleToggleShowAll={handleToggleShowAll}
                />
              ))}
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
                  <Text
                    display={props.header.fontStyle}
                    $color={settings.theme.card.background}
                  >
                    {t("Add-ons")}
                  </Text>
                </Flex>
              )}

              <Box
                $display="grid"
                $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
                $gap="1rem"
              >
                {addOns.map((addOn, index) => (
                  <AddOn
                    key={index}
                    addOn={addOn}
                    sharedProps={{
                      layout: props,
                      callToActionUrl,
                      onCallToAction,
                    }}
                    selectedPeriod={selectedPeriod}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      </FussyChild>
    </Wrapper>
  );
});

PricingTable.displayName = "PricingTable";
