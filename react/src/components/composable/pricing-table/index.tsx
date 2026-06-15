// PricingTable composable namespace. The default export is `Root`, with every
// part attached as a static for Radix-style dot-notation:
//
//   <PricingTable.Root>
//     <PricingTable.Plans>{plan => (
//       <PricingTable.Plan plan={plan}>
//         <PricingTable.PlanName />
//         <PricingTable.PlanPrice>{({ price }) => …}</PricingTable.PlanPrice>
//         <PricingTable.PlanCta>Choose plan</PricingTable.PlanCta>
//       </PricingTable.Plan>
//     )}</PricingTable.Plans>
//   </PricingTable.Root>

import { Root } from "./Root";
import {
  AddOn,
  AddOns,
  Content,
  CurrencyToggle,
  Empty,
  Loading,
  PeriodToggle,
  Plan,
  PlanCta,
  PlanDescription,
  PlanEntitlements,
  PlanName,
  PlanPrice,
  Plans,
} from "./parts";

export const PricingTable = Object.assign(Root, {
  Root,
  Loading,
  Empty,
  Content,
  PeriodToggle,
  CurrencyToggle,
  Plans,
  Plan,
  PlanName,
  PlanDescription,
  PlanPrice,
  PlanEntitlements,
  PlanCta,
  AddOns,
  AddOn,
});

export {
  PlanScope,
  PricingTableContext,
  PricingTablePlanContext,
  usePricingTable,
  usePricingTablePlan,
  type PricingTableContextValue,
  type PricingTableOptions,
  type PricingTablePlanContextValue,
} from "./context";
export type { PricingTableRootProps } from "./Root";
export type {
  CurrencyToggleRenderProps,
  PeriodToggleRenderProps,
  PlanCtaProps,
  PlanEntitlementsRenderProps,
  PlanPriceRenderProps,
  PlanProps,
} from "./parts";
