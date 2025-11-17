import type { ComponentProps, HydrateDataWithCompanyContext } from "../types";

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface ThemeSettings {
  numberOfColumns: 1 | 2 | 3;
  sectionLayout: "merged" | "separate";
  colorMode: "light" | "dark";
  primary: string;
  secondary: string;
  danger: string;
  card: {
    background: string;
    borderRadius: number;
    hasShadow: boolean;
    padding: number;
  };
  typography: {
    heading1: TypographySettings;
    heading2: TypographySettings;
    heading3: TypographySettings;
    heading4: TypographySettings;
    heading5: TypographySettings;
    heading6: TypographySettings;
    text: TypographySettings;
    link: TypographySettings;
  };
}

export type FontStyle = keyof ThemeSettings["typography"];

export const defaultTheme: ThemeSettings = {
  numberOfColumns: 2,
  sectionLayout: "merged",
  colorMode: "light",
  primary: "#000000",
  secondary: "#194BFB",
  danger: "#D75A5C",
  card: {
    background: "#FFFFFF",
    borderRadius: 10,
    hasShadow: true,
    padding: 45,
  },
  typography: {
    heading1: {
      fontFamily: "Manrope",
      fontSize: 37,
      fontWeight: 800,
      color: "#000000",
    },
    heading2: {
      fontFamily: "Manrope",
      fontSize: 29,
      fontWeight: 800,
      color: "#000000",
    },
    heading3: {
      fontFamily: "Manrope",
      fontSize: 20,
      fontWeight: 600,
      color: "#000000",
    },
    heading4: {
      fontFamily: "Manrope",
      fontSize: 18,
      fontWeight: 800,
      color: "#000000",
    },
    heading5: {
      fontFamily: "Public Sans",
      fontSize: 17,
      fontWeight: 500,
      color: "#000000",
    },
    heading6: {
      fontFamily: "Public Sans",
      fontSize: 14,
      fontWeight: 400,
      color: "#8A8A8A",
    },
    text: {
      fontFamily: "Public Sans",
      fontSize: 16,
      fontWeight: 400,
      color: "#000000",
    },
    link: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
      color: "#194BFB",
    },
  },
};

export type EmbedSettings = {
  mode: EmbedMode;
  theme: ThemeSettings;
  badge?: {
    alignment: ComponentProps["$justifyContent"];
    visibility?: ComponentProps["$visibility"];
  };
};

export const defaultSettings: EmbedSettings = {
  mode: "view",
  theme: { ...defaultTheme },
  badge: {
    alignment: "start",
    visibility: "visible",
  },
};

export type EmbedLayout =
  | "portal"
  | "checkout"
  | "payment"
  | "unsubscribe"
  | "disabled";

/**
 * Explicit configuration for skipping checkout stages.
 *
 * This configuration is independent of pre-selection (planId/addOnIds).
 * You have full control to:
 * - Skip stages without pre-selecting values
 * - Pre-select values without skipping stages
 * - Pre-select AND skip stages
 * - Any combination that suits your checkout flow
 *
 * @example
 * // Skip all stages (go directly to checkout/payment)
 * { planStage: true, addOnStage: true, creditsStage: true }
 *
 * @example
 * // Skip only plan stage (show add-ons and credits)
 * { planStage: true, addOnStage: false, creditsStage: false }
 *
 * @example
 * // Show plan stage, skip add-ons and credits
 * { planStage: false, addOnStage: true, creditsStage: true }
 *
 * @example
 * // Show all stages (same as not providing skipped config)
 * { planStage: false, addOnStage: false, creditsStage: false }
 */
export interface CheckoutStageSkipConfig {
  /**
   * Skip the plan selection stage.
   * - true: Skip directly to next stage
   * - false: Show plan stage (user can review/change selection)
   * - undefined: Defaults to false (show stage)
   */
  planStage?: boolean;

  /**
   * Skip the add-on selection stage.
   * - true: Skip directly to next stage
   * - false: Show add-on stage (user can review/change selection)
   * - undefined: Defaults to false (show stage)
   */
  addOnStage?: boolean;

  /**
   * Skip the credits stage.
   * - true: Skip directly to next stage
   * - false: Show credits stage (user can select credit bundles)
   * - undefined: Defaults to false (show stage)
   */
  creditsStage?: boolean;
}

/**
 * Configuration for controlling checkout stage flow and pre-selection.
 *
 * ## Three Behavior Modes
 *
 * ### 1. Pre-Selection Mode (object without `skipped`)
 * When you provide planId/addOnIds without explicit skip config, stages are
 * shown with values pre-selected for user review.
 *
 * @example
 * // Pre-select plan, show plan stage for review
 * initializeWithPlan({ planId: 'plan_xyz' })
 *
 * @example
 * // Pre-select plan and add-ons, show both stages for review
 * initializeWithPlan({
 *   planId: 'plan_xyz',
 *   addOnIds: ['addon_1', 'addon_2']
 * })
 *
 * ### 2. Explicit Skip Mode (object with `skipped`)
 * With explicit skip configuration, you control exactly which stages to skip.
 * You can skip stages without pre-selecting, or pre-select and skip together.
 *
 * @example
 * // Skip plan stage without pre-selecting (user chooses plan)
 * initializeWithPlan({
 *   skipped: { planStage: true }
 * })
 *
 * @example
 * // Pre-select plan AND skip plan stage (go directly to add-ons)
 * initializeWithPlan({
 *   planId: 'plan_xyz',
 *   skipped: { planStage: true }
 * })
 *
 * @example
 * // Pre-select plan but show it, skip add-ons stage
 * initializeWithPlan({
 *   planId: 'plan_xyz',
 *   skipped: { planStage: false, addOnStage: true }
 * })
 *
 * @example
 * // Skip both stages, go straight to checkout
 * initializeWithPlan({
 *   planId: 'plan_xyz',
 *   addOnIds: ['addon_1'],
 *   skipped: { planStage: true, addOnStage: true }
 * })
 *
 * ### 3. Legacy String Format
 * Backwards compatible mode: pre-selects plan and skips plan stage.
 *
 * @example
 * initializeWithPlan('plan_xyz')
 * // Equivalent to: { planId: 'plan_xyz', skipped: { planStage: true } }
 */
export interface BypassConfig {
  /**
   * Plan ID to pre-select.
   * Optional - you can skip stages without pre-selecting a plan.
   */
  planId?: string;
  /**
   * Add-on IDs to pre-select.
   * Optional - you can skip stages without pre-selecting add-ons.
   */
  addOnIds?: string[];
  /**
   * Explicit skip configuration for stages.
   * - If not provided: stages are shown with pre-selected values (review mode)
   * - If provided: you control exactly which stages to skip
   */
  skipped?: CheckoutStageSkipConfig;
  /**
   * Hide skipped stages from breadcrumb navigation.
   * Default: false (skipped stages still appear in breadcrumbs)
   */
  hideSkipped?: boolean;
}

export type CheckoutState = {
  period?: string;
  planId?: string | null;
  addOnId?: string | null;
  usage?: boolean;
  addOnUsage?: boolean;
  credits?: boolean;
  bypassPlanSelection?: boolean;
  bypassAddOnSelection?: boolean;
  bypassCreditsSelection?: boolean;
  addOnIds?: string[];
  hideSkippedStages?: boolean;
};

export type EmbedMode = "edit" | "view";

export interface EmbedState {
  isPending: boolean;
  stale: boolean;
  accessToken?: string;
  data?: HydrateDataWithCompanyContext;
  error?: Error;
  settings: EmbedSettings;
  layout: EmbedLayout;
  checkoutState?: CheckoutState;
}

export const initialState: EmbedState = {
  isPending: false,
  stale: true,
  settings: { ...defaultSettings },
  layout: "portal",
};
