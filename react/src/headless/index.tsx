// `@schematichq/schematic-react/headless` — headless primitive surface.
//
// Fully headless, Radix-style compound components: behavior + state + semantic
// `data-schematic-*` attributes + `asChild` polymorphism, with zero visual
// styling. Importing from this entry pulls in NONE of styled-components,
// Stripe, i18next, or icons — only React and the styled-free data hooks. The
// default-styled equivalents live in the root entry / `@schematichq/schematic-react`
// (e.g. `UsageMeter`) and are thin wrappers over the same controller hooks.
//
// Data/state is sourced from the same React hooks the styled components use
// (`useUsageMeter`, …), which resolve against the single `SchematicContext`
// instance provided by `SchematicProvider`. Mount this surface inside a
// `SchematicProvider` from the root entry.

// === Composition infrastructure ===
export {
  PART_ATTR,
  Slot,
  USAGE_METER_PERCENT_VAR,
  composeRefs,
  createPrimitiveContext,
  partAttrs,
  type AsChildProps,
  type PrimitiveProviderProps,
  type RenderProp,
  type SlotProps,
} from "./internal";

// === UsageMeter ===
export {
  UsageMeter,
  UsageMeterContext,
  useUsageMeterContext,
  type FillProps,
  type TrackProps,
  type UsageMeterData,
  type UsageMeterRootProps,
  type ValueRenderProps,
} from "./usage-meter";
