// Headless PricingTable parts. None of these import styled-components — they
// emit semantic `data-schematic-part` attributes, support `asChild`
// polymorphism, and expose computed data through render props.

import * as React from "react";

import { type PlanEntitlementResponseData } from "../../api/checkoutexternal";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../const";
import type { SelectedPlan } from "../../types";
import { getPlanPrice } from "../../utils";
import { Slot, partAttrs, type AsChildProps, type RenderProp } from "../internal";

import { PlanScope, usePricingTable, usePricingTablePlan } from "./context";

// === Gating wrappers ===

/** Renders children only while the table data is loading. */
export function Loading({ children }: { children?: React.ReactNode }) {
  const { isPending } = usePricingTable();
  return isPending ? <>{children}</> : null;
}
Loading.displayName = "PricingTable.Loading";

/**
 * Renders children only when no usable currency is available (the
 * invalid-currency state). Exposes `invalidFilterEntries` via render prop.
 */
export function Empty({
  children,
}: {
  children?: React.ReactNode | RenderProp<{ invalidFilterEntries: string[] }>;
}) {
  const { isPending, hasNoUsableCurrency, invalidFilterEntries } =
    usePricingTable();
  if (isPending || !hasNoUsableCurrency) {
    return null;
  }
  return (
    <>
      {typeof children === "function"
        ? children({ invalidFilterEntries })
        : children}
    </>
  );
}
Empty.displayName = "PricingTable.Empty";

/** Renders children once data is ready and a usable currency exists. */
export function Content({ children }: { children?: React.ReactNode }) {
  const { isPending, hasNoUsableCurrency } = usePricingTable();
  return !isPending && !hasNoUsableCurrency ? <>{children}</> : null;
}
Content.displayName = "PricingTable.Content";

// === Toggles (render-prop) ===

export interface PeriodToggleRenderProps {
  periods: string[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  /** Whether the toggle should be shown (period toggle enabled, >1 period). */
  show: boolean;
}

export function PeriodToggle({
  children,
}: {
  children: RenderProp<PeriodToggleRenderProps>;
}) {
  const { periods, selectedPeriod, setSelectedPeriod, showPeriodToggle } =
    usePricingTable();
  return (
    <>
      {children({
        periods,
        selectedPeriod,
        setSelectedPeriod,
        show: showPeriodToggle && periods.length > 1,
      })}
    </>
  );
}
PeriodToggle.displayName = "PricingTable.PeriodToggle";

export interface CurrencyToggleRenderProps {
  currencies: string[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  show: boolean;
}

export function CurrencyToggle({
  children,
}: {
  children: RenderProp<CurrencyToggleRenderProps>;
}) {
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    showCurrencySelector,
  } = usePricingTable();
  return (
    <>
      {children({
        currencies,
        selectedCurrency,
        setSelectedCurrency,
        show: showCurrencySelector,
      })}
    </>
  );
}
CurrencyToggle.displayName = "PricingTable.CurrencyToggle";

// === Plan list + plan row ===

export interface PlanListProps {
  children: (
    plan: SelectedPlan,
    index: number,
    plans: SelectedPlan[],
  ) => React.ReactNode;
}

/** Maps over the available plans, calling the render-prop for each. */
export function Plans({ children }: PlanListProps) {
  const { plans } = usePricingTable();
  return <>{plans.map((plan, index) => children(plan, index, plans))}</>;
}
Plans.displayName = "PricingTable.Plans";

/** Maps over the available add-ons, calling the render-prop for each. */
export function AddOns({ children }: PlanListProps) {
  const { addOns } = usePricingTable();
  return <>{addOns.map((addOn, index) => children(addOn, index, addOns))}</>;
}
AddOns.displayName = "PricingTable.AddOns";

export type PlanProps = AsChildProps<"li"> & {
  plan: SelectedPlan;
  index?: number;
  plans?: SelectedPlan[];
};

/** Renders the row element, reading derived state from the plan context. */
const PlanRow = React.forwardRef<
  HTMLLIElement,
  AsChildProps<"li"> & { partName: "plan" | "add-on" }
>(({ partName, asChild, children, ...rest }, ref) => {
  const { plan, isActive } = usePricingTablePlan();
  const Comp = asChild ? Slot : "li";
  return (
    <Comp
      ref={ref}
      {...partAttrs(partName)}
      data-plan-id={plan.id}
      data-active={isActive ? "" : undefined}
      {...rest}
    >
      {children}
    </Comp>
  );
});
PlanRow.displayName = "PricingTable.PlanRow";

/**
 * Establishes the per-plan context (`usePricingTablePlan`) and renders a list
 * item by default. Derives the plan's period, currency, and active state.
 */
export const Plan = React.forwardRef<HTMLLIElement, PlanProps>(
  ({ plan, index, plans, ...rest }, ref) => (
    <PlanScope plan={plan} index={index} plans={plans} kind="plan">
      <PlanRow ref={ref} partName="plan" {...rest} />
    </PlanScope>
  ),
);
Plan.displayName = "PricingTable.Plan";

/** Mirror of `Plan` for the add-on grid (distinct part name). */
export const AddOn = React.forwardRef<HTMLLIElement, PlanProps>(
  ({ plan, index, plans, ...rest }, ref) => (
    <PlanScope plan={plan} index={index} plans={plans} kind="addOn">
      <PlanRow ref={ref} partName="add-on" {...rest} />
    </PlanScope>
  ),
);
AddOn.displayName = "PricingTable.AddOn";

// === Plan leaves ===

export type PlanNameProps = Omit<React.ComponentPropsWithoutRef<"span">, "children">;

export const PlanName = React.forwardRef<HTMLSpanElement, PlanNameProps>(
  (props, ref) => {
    const { plan } = usePricingTablePlan();
    return (
      <span ref={ref} {...partAttrs("plan-name")} {...props}>
        {plan.name}
      </span>
    );
  },
);
PlanName.displayName = "PricingTable.PlanName";

export const PlanDescription = React.forwardRef<
  HTMLSpanElement,
  PlanNameProps
>((props, ref) => {
  const { plan } = usePricingTablePlan();
  return (
    <span ref={ref} {...partAttrs("plan-description")} {...props}>
      {plan.description}
    </span>
  );
});
PlanDescription.displayName = "PricingTable.PlanDescription";

export interface PlanPriceRenderProps {
  price?: number;
  currency?: string;
  period: string;
  isFree: boolean;
  isUsageBased: boolean;
  isCustom: boolean;
}

/** Computes the plan's price and exposes it through a render prop. */
export function PlanPrice({
  children,
}: {
  children: RenderProp<PlanPriceRenderProps>;
}) {
  const { plan, period, currency } = usePricingTablePlan();
  const { price, currency: planCurrency } =
    getPlanPrice(plan, period, { useSelectedPeriod: true }, currency) || {};

  const hasUsageBasedEntitlements = (plan.entitlements ?? []).some(
    (entitlement) => !!entitlement.priceBehavior,
  );
  const isFree = price === 0;

  return (
    <>
      {children({
        price,
        currency: planCurrency,
        period,
        isFree,
        isUsageBased: isFree && hasUsageBasedEntitlements,
        isCustom: !!plan.custom,
      })}
    </>
  );
}
PlanPrice.displayName = "PricingTable.PlanPrice";

export interface PlanEntitlementsRenderProps {
  entitlements: PlanEntitlementResponseData[];
  visibleEntitlements: PlanEntitlementResponseData[];
  expanded: boolean;
  toggle: () => void;
  hasMore: boolean;
  total: number;
}

/**
 * Manages the per-plan show-all/show-less state for entitlements and exposes
 * the visible slice via render prop.
 */
export function PlanEntitlements({
  children,
}: {
  children: RenderProp<PlanEntitlementsRenderProps>;
}) {
  const { plan } = usePricingTablePlan();
  const [expanded, setExpanded] = React.useState(false);

  const entitlements = plan.entitlements ?? [];
  const visibleEntitlements = expanded
    ? entitlements
    : entitlements.slice(0, VISIBLE_ENTITLEMENT_COUNT);

  return (
    <>
      {children({
        entitlements,
        visibleEntitlements,
        expanded,
        toggle: () => setExpanded((prev) => !prev),
        hasMore: entitlements.length > VISIBLE_ENTITLEMENT_COUNT,
        total: entitlements.length,
      })}
    </>
  );
}
PlanEntitlements.displayName = "PricingTable.PlanEntitlements";

export type PlanCtaProps = AsChildProps<"button"> & {
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
};

/**
 * The plan's call-to-action. Renders a `button` that invokes `selectPlan` by
 * default, or an anchor when the plan is custom or a `callToActionUrl` is set.
 * `asChild` lets a consumer supply their own element while inheriting the
 * wired behavior.
 */
export const PlanCta = React.forwardRef<HTMLButtonElement, PlanCtaProps>(
  ({ asChild, onClick, children, ...rest }, ref) => {
    const ctx = usePricingTable();
    const { plan } = usePricingTablePlan();

    const disabled = (!plan.valid || !ctx.canCheckout) && !plan.custom;

    let behaviorProps: Record<string, unknown>;
    if (plan.custom) {
      behaviorProps = {
        href: plan.customPlanConfig?.ctaWebSite ?? "#",
        target: "_blank",
        rel: "noreferrer",
      };
    } else if (ctx.callToActionUrl) {
      behaviorProps = {
        href: ctx.callToActionUrl,
        target: ctx.callToActionTarget,
        rel: "noreferrer",
      };
    } else {
      behaviorProps = {
        type: "button",
        disabled,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(event);
          ctx.selectPlan(plan);
        },
      };
    }

    const isAnchor = !!plan.custom || !!ctx.callToActionUrl;
    const Comp: React.ElementType = asChild ? Slot : isAnchor ? "a" : "button";

    return (
      <Comp
        ref={ref as React.Ref<never>}
        {...partAttrs("plan-cta")}
        data-disabled={disabled ? "" : undefined}
        {...behaviorProps}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </Comp>
    );
  },
);
PlanCta.displayName = "PricingTable.PlanCta";
