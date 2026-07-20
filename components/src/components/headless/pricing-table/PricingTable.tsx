import { forwardRef, type ElementType } from "react";

import { Slot, createHeadlessContext, mergeProps } from "../utils";

import { usePricingTable, type PricingTableApi } from "./usePricingTable";

const [PricingTableProvider, usePricingTableContext] =
  createHeadlessContext<PricingTableApi>(
    "PricingTable parts must be used within <PricingTable.Root>",
  );

/** Props shared by every non-root part. */
export interface PricingTablePartProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as the single child element instead of the default DOM node. */
  asChild?: boolean;
}

export interface PricingTableRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Billing periods to choose from (e.g. `["month", "year"]`). */
  periods?: string[];
  /** Controlled selected period. Pair with `onPeriodChange`. */
  period?: string;
  /** Initial period when uncontrolled. Defaults to the first `periods` entry. */
  defaultPeriod?: string;
  /** Called whenever the selected period changes. */
  onPeriodChange?: (period: string) => void;
  /** Currency codes to choose from (e.g. `["usd", "eur"]`). */
  currencies?: string[];
  /** Controlled selected currency. Pair with `onCurrencyChange`. */
  currency?: string;
  /** Initial currency when uncontrolled. Defaults to the first `currencies` entry. */
  defaultCurrency?: string;
  /** Called whenever the selected currency changes. */
  onCurrencyChange?: (currency: string) => void;
  asChild?: boolean;
}

const Root = forwardRef<HTMLDivElement, PricingTableRootProps>(
  (
    {
      periods,
      period,
      defaultPeriod,
      onPeriodChange,
      currencies,
      currency,
      defaultCurrency,
      onCurrencyChange,
      asChild,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const api = usePricingTable({
      periods,
      period,
      defaultPeriod,
      onPeriodChange,
      currencies,
      currency,
      defaultCurrency,
      onCurrencyChange,
    });

    const props = mergeProps(
      { ...api.getRootProps(), className: "schematic-pricing-table" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;

    return (
      <PricingTableProvider value={api}>
        <Comp ref={ref} {...props}>
          {children}
        </Comp>
      </PricingTableProvider>
    );
  },
);

Root.displayName = "PricingTable.Root";

const Label = forwardRef<HTMLHeadingElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getLabelProps } = usePricingTableContext();
    const props = mergeProps(
      { ...getLabelProps(), className: "schematic-pricing-table__label" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "h2") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Label.displayName = "PricingTable.Label";

const Section = forwardRef<HTMLUListElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getSectionProps } = usePricingTableContext();
    const props = mergeProps(
      { ...getSectionProps(), className: "schematic-pricing-table__section" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "ul") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Section.displayName = "PricingTable.Section";

export interface PricingTableCardProps extends PricingTablePartProps {
  /** Mark this card as the company's current/active plan (adds state attributes). */
  active?: boolean;
}

const Card = forwardRef<HTMLLIElement, PricingTableCardProps>(
  ({ asChild, active, className, children, ...rest }, ref) => {
    const { getCardProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getCardProps({ active }),
        className: "schematic-pricing-table__card",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "li") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Card.displayName = "PricingTable.Card";

const Name = forwardRef<HTMLHeadingElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getNameProps } = usePricingTableContext();
    const props = mergeProps(
      { ...getNameProps(), className: "schematic-pricing-table__name" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "h3") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Name.displayName = "PricingTable.Name";

const Description = forwardRef<HTMLParagraphElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getDescriptionProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getDescriptionProps(),
        className: "schematic-pricing-table__description",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "p") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Description.displayName = "PricingTable.Description";

const Price = forwardRef<HTMLDivElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getPriceProps } = usePricingTableContext();
    const props = mergeProps(
      { ...getPriceProps(), className: "schematic-pricing-table__price" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Price.displayName = "PricingTable.Price";

const Entitlements = forwardRef<HTMLUListElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getEntitlementsProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getEntitlementsProps(),
        className: "schematic-pricing-table__entitlements",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "ul") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Entitlements.displayName = "PricingTable.Entitlements";

const Entitlement = forwardRef<HTMLLIElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getEntitlementProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getEntitlementProps(),
        className: "schematic-pricing-table__entitlement",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "li") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Entitlement.displayName = "PricingTable.Entitlement";

const Footer = forwardRef<HTMLDivElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getFooterProps } = usePricingTableContext();
    const props = mergeProps(
      { ...getFooterProps(), className: "schematic-pricing-table__footer" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Footer.displayName = "PricingTable.Footer";

export interface PricingTableCallToActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render as the single child element instead of the default `<button>`. */
  asChild?: boolean;
  /** Mark the CTA as belonging to the current/active plan. */
  active?: boolean;
}

const CallToAction = forwardRef<
  HTMLButtonElement,
  PricingTableCallToActionProps
>(({ asChild, active, className, children, disabled, ...rest }, ref) => {
  const { getCallToActionProps } = usePricingTableContext();
  const props = mergeProps(
    {
      ...getCallToActionProps({ active, disabled }),
      className: "schematic-pricing-table__call-to-action",
    },
    { className, ...rest },
  );
  const Comp = (asChild ? Slot : "button") as ElementType;
  return (
    <Comp ref={ref} {...props}>
      {children}
    </Comp>
  );
});

CallToAction.displayName = "PricingTable.CallToAction";

const PeriodToggle = forwardRef<HTMLDivElement, PricingTablePartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getPeriodToggleProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getPeriodToggleProps(),
        className: "schematic-pricing-table__period-toggle",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "div") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

PeriodToggle.displayName = "PricingTable.PeriodToggle";

export interface PricingTableOptionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The period/currency this option selects when clicked. */
  value: string;
  /** Render as the single child element instead of the default `<button>`. */
  asChild?: boolean;
}

const PeriodOption = forwardRef<HTMLButtonElement, PricingTableOptionProps>(
  ({ asChild, value, className, children, ...rest }, ref) => {
    const { getPeriodOptionProps } = usePricingTableContext();
    const props = mergeProps(
      {
        ...getPeriodOptionProps(value),
        className: "schematic-pricing-table__period-option",
      },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "button") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

PeriodOption.displayName = "PricingTable.PeriodOption";

export interface PricingTableCurrencySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Render as the single child element instead of the default `<select>`. */
  asChild?: boolean;
}

const CurrencyToggle = forwardRef<
  HTMLSelectElement,
  PricingTableCurrencySelectProps
>(({ asChild, className, children, ...rest }, ref) => {
  const { getCurrencyToggleProps } = usePricingTableContext();
  const props = mergeProps(
    {
      ...getCurrencyToggleProps(),
      className: "schematic-pricing-table__currency-toggle",
    },
    { className, ...rest },
  );
  const Comp = (asChild ? Slot : "select") as ElementType;
  return (
    <Comp ref={ref} {...props}>
      {children}
    </Comp>
  );
});

CurrencyToggle.displayName = "PricingTable.CurrencyToggle";

export interface PricingTableCurrencyOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  /** The currency this option selects. */
  value: string;
  /** Render as the single child element instead of the default `<option>`. */
  asChild?: boolean;
}

const CurrencyOption = forwardRef<
  HTMLOptionElement,
  PricingTableCurrencyOptionProps
>(({ asChild, value, className, children, ...rest }, ref) => {
  const { getCurrencyOptionProps } = usePricingTableContext();
  const props = mergeProps(
    {
      ...getCurrencyOptionProps(value),
      className: "schematic-pricing-table__currency-option",
    },
    { className, ...rest },
  );
  const Comp = (asChild ? Slot : "option") as ElementType;
  return (
    <Comp ref={ref} {...props}>
      {children}
    </Comp>
  );
});

CurrencyOption.displayName = "PricingTable.CurrencyOption";

/**
 * Headless, composable pricing table. Unstyled by default — theme it with the
 * `schematic-pricing-table*` classes or the `data-part` / `data-active` /
 * `data-selected` attributes. It is **controlled**: pass the plan/add-on data
 * you map over plus the available `periods`/`currencies`; it fetches nothing.
 * `Root` owns the interactive period/currency selection and exposes it to the
 * toggle parts and the `usePricingTable` hook.
 *
 * @example
 * ```tsx
 * const { plans, addOns, currencies, periods } = usePricingOptions();
 *
 * <PricingTable.Root periods={periods} currencies={currencies}>
 *   {(currencies.length > 1 || periods.length > 1) && (
 *     <>
 *       <PricingTable.CurrencyToggle>
 *         {currencies.map((c) => (
 *           <PricingTable.CurrencyOption key={c} value={c}>{c}</PricingTable.CurrencyOption>
 *         ))}
 *       </PricingTable.CurrencyToggle>
 *       <PricingTable.PeriodToggle>
 *         {periods.map((p) => (
 *           <PricingTable.PeriodOption key={p} value={p}>{p}</PricingTable.PeriodOption>
 *         ))}
 *       </PricingTable.PeriodToggle>
 *     </>
 *   )}
 *
 *   <PricingTable.Label>Plans</PricingTable.Label>
 *   <PricingTable.Section>
 *     {plans.map((plan) => (
 *       <PricingTable.Card key={plan.id} active={plan.current}>
 *         <PricingTable.Name>{plan.name}</PricingTable.Name>
 *         <PricingTable.Description>{plan.description}</PricingTable.Description>
 *         <PricingTable.Price>{formatPrice(plan)}</PricingTable.Price>
 *         <PricingTable.Entitlements>
 *           {plan.entitlements.map((e) => (
 *             <PricingTable.Entitlement key={e.id}>{e.feature?.name}</PricingTable.Entitlement>
 *           ))}
 *         </PricingTable.Entitlements>
 *         <PricingTable.Footer>
 *           <PricingTable.CallToAction active={plan.current}>Choose plan</PricingTable.CallToAction>
 *         </PricingTable.Footer>
 *       </PricingTable.Card>
 *     ))}
 *   </PricingTable.Section>
 * </PricingTable.Root>
 * ```
 */
export const PricingTable = {
  Root,
  Label,
  Section,
  Card,
  Name,
  Description,
  Price,
  Entitlements,
  Entitlement,
  Footer,
  CallToAction,
  PeriodToggle,
  PeriodOption,
  CurrencyToggle,
  CurrencyOption,
};

export { usePricingTableContext };
