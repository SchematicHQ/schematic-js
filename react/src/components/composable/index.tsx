// `@schematichq/schematic-react/composable` — headless primitive surface.
//
// Fully headless, Radix-style compound components: behavior + state + semantic
// `data-schematic-*` attributes + `asChild` polymorphism, with zero visual
// styling. Importing from this entry pulls in NONE of styled-components,
// Stripe, i18next, or icons — only React and the styled-free data hooks. The
// default-styled equivalents live at `@schematichq/schematic-react/components`
// and are thin wrappers over these primitives.
//
// Data/state is sourced from the same React hooks the styled components use
// (`useEmbed`, `useAvailablePlans`, …), which resolve against the single
// `SchematicContext` instance provided by `SchematicProvider`. Mount this
// surface inside a `SchematicProvider` from the root entry.

// === Composition infrastructure ===
export {
  PART_ATTR,
  Slot,
  activeState,
  composeRefs,
  createPrimitiveContext,
  partAttrs,
  type AsChildProps,
  type PrimitiveProviderProps,
  type RenderProp,
  type SlotProps,
} from "./internal";

// === PricingTable ===
export {
  PlanScope,
  PricingTable,
  PricingTableContext,
  PricingTablePlanContext,
  usePricingTable,
  usePricingTablePlan,
  type CurrencyToggleRenderProps,
  type PeriodToggleRenderProps,
  type PlanCtaProps,
  type PlanEntitlementsRenderProps,
  type PlanPriceRenderProps,
  type PlanProps,
  type PricingTableContextValue,
  type PricingTableOptions,
  type PricingTablePlanContextValue,
  type PricingTableRootProps,
} from "./pricing-table";

// === PaymentMethod ===
export {
  PaymentMethod,
  PaymentMethodContext,
  getPaymentMethodData,
  usePaymentMethod,
  type EditTriggerProps,
  type PaymentMethodContextValue,
  type PaymentMethodDisplayData,
  type PaymentMethodOptions,
  type PaymentMethodRootProps,
} from "./payment-method";
