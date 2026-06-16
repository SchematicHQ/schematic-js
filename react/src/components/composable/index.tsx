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

// === IncludedFeatures ===
export {
  IncludedFeatures,
  IncludedFeaturesContext,
  useIncludedFeatures,
  type IncludedFeaturesContextValue,
  type IncludedFeaturesOptions,
  type IncludedFeaturesRootProps,
} from "./included-features";

// === CheckoutDialog (minimal open/close seam) ===
export {
  CheckoutDialog,
  CheckoutDialogContext,
  useCheckoutDialog,
  type CheckoutDialogContextValue,
  type CheckoutDialogRootProps,
} from "./checkout-dialog";

// === PlanManager ===
export {
  PlanManager,
  PlanManagerContext,
  usePlanManager,
  type ChangePlanTriggerProps,
  type PlanManagerContextValue,
  type PlanManagerCreditGroups,
  type PlanManagerRootProps,
} from "./plan-manager";

// === MeteredFeatures ===
export {
  MeteredFeatures,
  MeteredFeaturesContext,
  useMeteredFeatures,
  type MeteredCreditGroup,
  type MeteredFeaturesContextValue,
  type MeteredFeaturesOptions,
  type MeteredFeaturesRootProps,
} from "./metered-features";

// === Invoices ===
export {
  Invoices,
  InvoicesContext,
  formatInvoices,
  useInvoices,
  type FormattedInvoice,
  type InvoicesContextValue,
  type InvoicesOptions,
  type InvoicesRootProps,
} from "./invoices";

// === UnsubscribeButton ===
export {
  UnsubscribeButton,
  UnsubscribeButtonContext,
  useUnsubscribeButton,
  type UnsubscribeButtonContextValue,
  type UnsubscribeButtonRootProps,
} from "./unsubscribe-button";

// === UpcomingBill ===
export {
  UpcomingBill,
  UpcomingBillContext,
  useUpcomingBill,
  type UpcomingBillContentRenderProps,
  type UpcomingBillContextValue,
  type UpcomingBillDiscount,
  type UpcomingBillRootProps,
} from "./upcoming-bill";
