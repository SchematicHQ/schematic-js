/**
 * Scenario fixtures: complete `CatalogData` bags for the situations the
 * elements must handle. Each scenario is a function so IDs are deterministic
 * per build and fixtures never share mutable objects.
 */

import type {
  AnyCatalog,
  CatalogData,
  CompanyCatalog,
  CreditBundle,
  Entitlement,
} from "@schematichq/schematic-react";

import {
  booleanEntitlement,
  catalog,
  checkoutBehavior,
  company,
  companyCatalog,
  companyPlan,
  creditAutoTopup,
  creditBalance,
  creditBundle,
  creditGrant,
  creditGrantRow,
  creditRef,
  customBilling,
  daysFromNow,
  discount,
  entitlement,
  entitlementCredit,
  feature,
  freePlan,
  heldPlan,
  invoice,
  invoicePage,
  monthly,
  numericEntitlement,
  oneTime,
  plan,
  resetIds,
  scheduledDowngrade,
  subscription,
  tieredPrice,
  unlimitedEntitlement,
  upcomingInvoice,
  usageOf,
  withId,
  yearly,
} from "./builders";

/* ---------- shared building blocks ---------- */

const aiCredits = () =>
  creditRef({
    id: "credit_ai",
    name: "AI credits",
    singularName: "AI credit",
    pluralName: "AI credits",
    icon: "credit",
  });

export function starterEntitlements(): Entitlement[] {
  return [
    booleanEntitlement("Dashboard", {
      id: "ent_dashboard",
      feature: feature({
        id: "feat_dashboard",
        name: "Dashboard",
        type: "boolean",
        icon: "board",
      }),
    }),
    numericEntitlement("API calls", 1000, {
      id: "ent_api_calls",
      feature: feature({
        id: "feat_api_calls",
        name: "API call",
        singularName: "API call",
        pluralName: "API calls",
        type: "event",
        icon: "code",
        description: "Requests to the public API.",
      }),
      warningThreshold: 800,
    }),
    entitlement({
      id: "ent_seats",
      feature: feature({
        id: "feat_seats",
        name: "Seat",
        singularName: "seat",
        pluralName: "seats",
        type: "trait",
        icon: "key",
      }),
      valueType: "numeric",
      valueBool: null,
      valueNumeric: 3,
    }),
  ];
}

export function proEntitlements(): Entitlement[] {
  return [
    booleanEntitlement("Dashboard", {
      id: "ent_pro_dashboard",
      feature: feature({
        id: "feat_dashboard",
        name: "Dashboard",
        type: "boolean",
        icon: "board",
      }),
    }),
    entitlement({
      id: "ent_pro_api_calls",
      feature: feature({
        id: "feat_api_calls",
        name: "API call",
        singularName: "API call",
        pluralName: "API calls",
        type: "event",
        icon: "code",
      }),
      valueType: "numeric",
      valueBool: null,
      valueNumeric: 10000,
      priceBehavior: "overage",
      softLimit: 10000,
      metricPeriod: "current_month",
      metricPeriodMonthReset: "billing_cycle",
      meteredPrices: [
        tieredPrice(
          [
            [10000, 0],
            [null, 2],
          ],
          { id: "price_api_overage_m", interval: "month" },
        ),
        tieredPrice(
          [
            [120000, 0],
            [null, 2],
          ],
          { id: "price_api_overage_y", interval: "year" },
        ),
      ],
    }),
    entitlement({
      id: "ent_pro_seats",
      feature: feature({
        id: "feat_seats",
        name: "Seat",
        singularName: "seat",
        pluralName: "seats",
        type: "trait",
        icon: "key",
      }),
      valueType: "numeric",
      valueBool: null,
      valueNumeric: 5,
      priceBehavior: "pay_in_advance",
      meteredPrices: [
        withId(monthly(1500), "price_seat_m"),
        withId(yearly(15000), "price_seat_y"),
      ],
    }),
    entitlement({
      id: "ent_pro_images",
      feature: feature({
        id: "feat_images",
        name: "Image generation",
        singularName: "image generation",
        pluralName: "image generations",
        type: "event",
        icon: "image",
      }),
      valueType: "numeric",
      valueBool: null,
      valueNumeric: null,
      priceBehavior: "credit_burndown",
      credit: entitlementCredit({
        ...aiCredits(),
        consumptionRate: 2,
        equivalentLimit: 250,
      }),
    }),
    unlimitedEntitlement("Project", {
      id: "ent_pro_projects",
      feature: feature({
        id: "feat_projects",
        name: "Project",
        singularName: "project",
        pluralName: "projects",
        type: "event",
        icon: "folder",
      }),
    }),
  ];
}

export function enterpriseEntitlements(): Entitlement[] {
  return [
    unlimitedEntitlement("API call", {
      id: "ent_ent_api",
      feature: feature({
        id: "feat_api_calls",
        name: "API call",
        singularName: "API call",
        pluralName: "API calls",
        type: "event",
        icon: "code",
      }),
    }),
    entitlement({
      id: "ent_ent_support",
      feature: feature({
        id: "feat_support",
        name: "Priority support",
        type: "boolean",
        icon: "bell",
      }),
    }),
    entitlement({
      id: "ent_ent_sso",
      feature: feature({
        id: "feat_sso",
        name: "SSO",
        type: "boolean",
        icon: "verified",
      }),
    }),
  ];
}

export function publicPlans() {
  return [
    freePlan({
      id: "plan_free",
      name: "Free",
      description: "For trying things out.",
      icon: "plan",
      entitlements: starterEntitlements(),
    }),
    plan({
      id: "plan_pro",
      name: "Pro",
      description: "For growing teams.",
      icon: "diamond",
      prices: [
        withId(monthly(4900), "price_pro_m"),
        withId(yearly(49000), "price_pro_y"),
        withId(monthly(4500, "eur"), "price_pro_m_eur"),
        withId(yearly(45000, "eur"), "price_pro_y_eur"),
      ],
      entitlements: proEntitlements(),
      isTrialable: true,
      trialDays: 14,
      includedCreditGrants: [
        creditGrant({
          id: "grant_ai",
          credit: aiCredits(),
          amount: 500,
          companyAmount: 500,
          resetCadence: "monthly",
        }),
      ],
    }),
    plan({
      id: "plan_enterprise",
      name: "Enterprise",
      description: "For organizations with custom needs.",
      icon: "bank",
      prices: [
        withId(monthly(29900), "price_ent_m"),
        withId(yearly(299000), "price_ent_y"),
      ],
      entitlements: enterpriseEntitlements(),
    }),
  ];
}

export function publicAddOns() {
  return [
    plan({
      id: "addon_analytics",
      name: "Advanced analytics",
      description: "Funnels, cohorts, and exports.",
      icon: "arrow-analytics",
      prices: [
        withId(monthly(1900), "price_analytics_m"),
        withId(yearly(19000), "price_analytics_y"),
      ],
      entitlements: [
        unlimitedEntitlement("Export", {
          id: "ent_exports",
          feature: feature({
            id: "feat_exports",
            name: "Export",
            singularName: "export",
            pluralName: "exports",
            type: "event",
          }),
        }),
      ],
      compatiblePlanIds: ["plan_pro", "plan_enterprise"],
    }),
    plan({
      id: "addon_onboarding",
      name: "Onboarding session",
      description: "A one-time setup call with our team.",
      icon: "present",
      chargeType: "one_time",
      prices: [withId(oneTime(50000), "price_onboarding")],
      compatiblePlanIds: null,
    }),
  ];
}

export function publicBundles(): CreditBundle[] {
  return [
    creditBundle({
      id: "bundle_ai_500",
      name: "500 AI credits",
      credit: aiCredits(),
      quantity: 500,
      prices: [withId(oneTime(2500), "price_bundle_500")],
      compatiblePlanIds: ["plan_pro", "plan_enterprise"],
    }),
    creditBundle({
      id: "bundle_ai_2000",
      name: "2,000 AI credits",
      credit: aiCredits(),
      quantity: 2000,
      prices: [withId(oneTime(8000), "price_bundle_2000")],
      compatiblePlanIds: ["plan_pro", "plan_enterprise"],
      expiry: { type: "duration", unit: "days", unitCount: 90 },
    }),
  ];
}

/* ---------- public tier ---------- */

/** The anonymous pricing page: three plans, two add-ons, two bundles, a custom-plan CTA. */
export function publicCatalog(): AnyCatalog {
  resetIds();
  return catalog({
    id: "catalog_default",
    name: "Default catalog",
    pricingUrl: "https://example.com/pricing",
    customPlanCta: {
      text: "Talk to sales",
      url: "https://example.com/contact",
      priceText: "Custom pricing",
    },
    defaultCurrency: "usd",
    plans: publicPlans(),
    addOns: publicAddOns(),
    creditBundles: publicBundles(),
  });
}

/* ---------- company tier ---------- */

/** The public catalog decorated for a company on Pro (monthly). */
export function proCompanyCatalog(
  overrides: Partial<CompanyCatalog> = {},
): CompanyCatalog {
  resetIds();
  const base = publicCatalog();
  const [free, pro, enterprise] = base.plans;
  const [analytics, onboarding] = base.addOns;
  return companyCatalog({
    ...base,
    plans: [
      companyPlan({ ...free, current: false, valid: true }),
      companyPlan({
        ...pro,
        current: true,
        currentPriceId: "price_pro_m",
        valid: true,
      }),
      companyPlan({ ...enterprise, current: false, valid: true }),
    ],
    addOns: [
      companyPlan({ ...analytics, current: false, valid: true }),
      companyPlan({ ...onboarding, current: false, valid: true }),
    ],
    checkoutBehavior: checkoutBehavior({
      trialExpiryPlan: { id: "plan_free", name: "Free" },
    }),
    ...overrides,
  });
}

/** Pro company, everything healthy. */
export function proCompany(): CatalogData {
  const cat = proCompanyCatalog();
  const pro = cat.plans[1];
  const ents = pro.entitlements;
  return {
    catalog: cat,
    company: company({
      id: "comp_acme",
      name: "Acme",
      plan: heldPlan({
        id: "plan_pro",
        catalogId: cat.id,
        name: "Pro",
        description: "For growing teams.",
        icon: "diamond",
        price: withId(monthly(4900), "price_pro_m"),
      }),
      addOns: [
        heldPlan({
          id: "addon_analytics",
          catalogId: cat.id,
          name: "Advanced analytics",
          isAddOn: true,
          price: withId(monthly(1900), "price_analytics_m"),
        }),
      ],
      subscription: subscription({
        id: "sub_1",
        totalAmount: 6800,
      }),
      creditAutoTopups: [
        creditAutoTopup({
          creditId: "credit_ai",
          enabled: true,
          thresholdCredits: 50,
          amount: 500,
        }),
      ],
    }),
    usage: [
      usageOf(ents[0]),
      usageOf(ents[1], { usage: 8200, currentCost: null }),
      usageOf(ents[2], { usage: 4, effectiveLimit: 5 }),
      usageOf(ents[3], {
        usage: 60,
        effectiveLimit: 250,
        resetsAt: daysFromNow(11),
      }),
      usageOf(ents[4], { usage: 12 }),
    ],
    credits: [
      creditBalance({
        credit: { ...aiCredits(), description: "Spend on AI features." },
        grants: [
          creditGrantRow({
            id: "cg_plan",
            reason: "plan",
            plan: { id: "plan_pro", name: "Pro" },
            quantity: 500,
            quantityUsed: 120,
            quantityRemaining: 380,
            renewalPeriod: "monthly",
            createdAt: daysFromNow(-10),
            expiresAt: daysFromNow(20),
          }),
          creditGrantRow({
            id: "cg_bundle",
            reason: "purchased",
            plan: null,
            bundle: { id: "bundle_ai_500", name: "500 AI credits" },
            quantity: 500,
            quantityUsed: 0,
            quantityRemaining: 500,
            renewalPeriod: null,
            createdAt: daysFromNow(-3),
            expiresAt: null,
          }),
        ],
      }),
    ],
    invoices: invoicePage(
      [
        invoice({
          id: "inv_3",
          amountDue: 6800,
          dueDate: daysFromNow(-10),
          createdAt: daysFromNow(-11),
        }),
        invoice({
          id: "inv_2",
          amountDue: 6800,
          dueDate: daysFromNow(-40),
          createdAt: daysFromNow(-41),
        }),
        invoice({
          id: "inv_1",
          amountDue: -1500,
          dueDate: daysFromNow(-70),
          createdAt: daysFromNow(-71),
          status: "paid",
        }),
      ],
      true,
    ),
    upcomingInvoice: upcomingInvoice({
      amountDue: 6120,
      subtotal: 6800,
      dueDate: daysFromNow(20),
      discounts: [discount()],
    }),
  };
}

/** Pro company over its API-call limit, with overage cost accruing. */
export function overLimitCompany(): CatalogData {
  const data = proCompany();
  const usage = data.usage ?? [];
  usage[1] = {
    ...usage[1],
    usage: 12400,
    currentCost: 4800,
    currentCostCurrency: "usd",
  };
  const cat = data.catalog as CompanyCatalog;
  cat.plans[0] = {
    ...cat.plans[0],
    valid: false,
    invalidReason: "feature_usage_exceeded",
    usageViolations: [
      {
        featureId: "feat_api_calls",
        featureName: "API calls",
        usage: 12400,
        limit: 1000,
      },
    ],
  };
  return data;
}

/** A company trialing Pro, landing on Free when the trial ends. */
export function trialingCompany(): CatalogData {
  const data = proCompany();
  const comp = data.company!;
  data.company = {
    ...comp,
    subscription: subscription({
      id: "sub_trial",
      status: "trialing",
      trialing: true,
      trialEnd: daysFromNow(5),
      totalAmount: 4900,
    }),
    addOns: [],
  };
  data.upcomingInvoice = upcomingInvoice({
    amountDue: 4900,
    subtotal: 4900,
    dueDate: daysFromNow(5),
  });
  data.invoices = invoicePage([]);
  return data;
}

/** A Pro company whose subscription ends at the period end. */
export function cancelingCompany(): CatalogData {
  const data = proCompany();
  const comp = data.company!;
  data.company = {
    ...comp,
    subscription: subscription({
      id: "sub_cancel",
      cancelAt: daysFromNow(20),
      cancelAtPeriodEnd: true,
      totalAmount: 6800,
    }),
  };
  data.upcomingInvoice = null;
  return data;
}

/** A Pro company with a downgrade to Free scheduled. */
export function downgradingCompany(): CatalogData {
  const data = proCompany();
  const comp = data.company!;
  data.company = {
    ...comp,
    scheduledDowngrade: scheduledDowngrade({
      plan: { id: "plan_free", name: "Free" },
      amount: 0,
    }),
  };
  return data;
}

/** A company on a custom-billed Enterprise plan with an unpaid invoice. */
export function customBilledCompany(): CatalogData {
  const data = proCompany();
  const cat = data.catalog as CompanyCatalog;
  cat.plans[1] = { ...cat.plans[1], current: false, currentPriceId: null };
  cat.plans[2] = { ...cat.plans[2], current: true, currentPriceId: null };
  data.company = company({
    id: "comp_acme",
    name: "Acme",
    plan: heldPlan({
      id: "plan_enterprise",
      catalogId: cat.id,
      name: "Enterprise",
      description: "For organizations with custom needs.",
      isCustom: true,
      price: null,
    }),
    subscription: null,
    customBilling: customBilling({
      planId: "plan_enterprise",
      activationStrategy: "payment",
    }),
  });
  data.usage = [];
  data.credits = [];
  data.invoices = invoicePage([]);
  data.upcomingInvoice = null;
  return data;
}

/** A company with no plan and no subscription. */
export function noPlanCompany(): CatalogData {
  const data = proCompany();
  const cat = data.catalog as CompanyCatalog;
  cat.plans = cat.plans.map((p) => ({
    ...p,
    current: false,
    currentPriceId: null,
  }));
  data.company = company({ id: "comp_new", name: "Newco" });
  data.usage = [];
  data.credits = [];
  data.invoices = invoicePage([]);
  data.upcomingInvoice = null;
  return data;
}

/** A company on the Free plan (no subscription) with usage. */
export function freeCompany(): CatalogData {
  const data = proCompany();
  const cat = data.catalog as CompanyCatalog;
  cat.plans = cat.plans.map((p, i) => ({
    ...p,
    current: i === 0,
    currentPriceId: null,
  }));
  const free = cat.plans[0];
  data.company = company({
    id: "comp_free",
    name: "Freeco",
    plan: heldPlan({
      id: "plan_free",
      catalogId: cat.id,
      name: "Free",
      price: null,
    }),
  });
  data.usage = [
    usageOf(free.entitlements[0]),
    usageOf(free.entitlements[1], { usage: 950, expiresAt: null }),
    usageOf(free.entitlements[2], { usage: 2, effectiveLimit: 3 }),
  ];
  data.credits = [];
  data.invoices = invoicePage([]);
  data.upcomingInvoice = null;
  return data;
}

export const SCENARIOS = {
  public: (): CatalogData => ({ catalog: publicCatalog() }),
  pro: proCompany,
  overLimit: overLimitCompany,
  trialing: trialingCompany,
  canceling: cancelingCompany,
  downgrading: downgradingCompany,
  customBilled: customBilledCompany,
  noPlan: noPlanCompany,
  free: freeCompany,
} satisfies Record<string, () => CatalogData>;

export type ScenarioName = keyof typeof SCENARIOS;
