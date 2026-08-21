import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CompanyCatalogResponseDataFromJSON,
  CompanyContextResponseDataFromJSON,
  CompanyCreditBalancesResponseDataFromJSON,
  CompanyFeatureUsageListResponseDataFromJSON,
  CompanyInvoiceResponseDataFromJSON,
} from "../api/customer";
import { PublicCatalogResponseDataFromJSON } from "../api/public";

import { deriveCreditBalances } from "./credits";
import { deriveInvoiceList } from "./invoices";
import { derivePlanOfferings } from "./pricing";
import { derivePlanSummary } from "./summary";
import { deriveUsage } from "./usage";

/**
 * The goldens are real responses recorded by the schematic-api route tests
 * (scripts/sync-goldens.sh copies them in). Decoding them through the
 * generated clients and running the derivations over them is the contract
 * check: a required field added or removed on either side fails here
 * before it fails in a browser.
 */
const golden = (name: string): unknown =>
  (
    JSON.parse(
      readFileSync(join(__dirname, "..", "goldens", `${name}.json`), "utf8"),
    ) as { data: unknown }
  ).data;

describe("recorded API goldens", () => {
  it("public catalog decodes and derives plan offerings", () => {
    const catalog = PublicCatalogResponseDataFromJSON(golden("public_catalog"));
    expect(catalog.defaultCurrency).not.toBe("");
    expect(catalog.capabilities.checkout).toBe(false);
    const vm = derivePlanOfferings(catalog, { locale: "en-US" });
    expect(vm.plans.length).toBe(catalog.plans.length);
    expect(vm.defaultCurrency).toBe(catalog.defaultCurrency);
  });

  it("company catalog view decodes and derives plan offerings", () => {
    const catalog = CompanyCatalogResponseDataFromJSON(golden("catalog_view"));
    const vm = derivePlanOfferings(catalog, { locale: "en-US" });
    expect(vm.plans.length).toBe(catalog.plans.length);
    for (const plan of vm.plans) {
      expect(typeof plan.valid).toBe("boolean");
    }
  });

  it("company catalog view carries the company decoration", () => {
    const catalog = CompanyCatalogResponseDataFromJSON(golden("catalog_view"));
    const vm = derivePlanOfferings(catalog, { locale: "en-US" });
    // The recorded company holds one of the catalog's plans.
    expect(vm.plans.filter((plan) => plan.current)).toHaveLength(1);
    expect(vm.plans.every((plan) => plan.valid)).toBe(true);
    expect(vm.plans.every((plan) => !plan.canTrial)).toBe(true);
    // With a current plan, add-ons report compatibility against it.
    for (const addOn of vm.addOns) {
      expect(addOn.compatibleWithCurrentPlan).toBe(true);
    }
    expect(catalog.capabilities.checkout).toBe(true);
  });

  it("company context decodes and derives the plan summary", () => {
    const company = CompanyContextResponseDataFromJSON(golden("company"));
    const vm = derivePlanSummary({ company }, { locale: "en-US" });
    expect(vm.addOns).toEqual([]);
    expect(vm.currentPlan).toBeDefined();
    expect(vm.currentPlan?.isCustom).toBe(false);
    expect(vm.currentPlan?.period).toBe("month");
    expect(vm.currentPlan?.formattedPrice).toBe("$100.00");
    // The subscription interval is the raw provider string; the period is
    // derived here.
    expect(vm.subscription?.interval).toBe("month");
    expect(vm.subscription?.period).toBe("month");
    expect(vm.subscription?.status).toBe("active");
    expect(vm.paymentMethod?.type).toBe("card");
    expect(vm.paymentMethod?.last4).toBeDefined();
    expect(vm.notice).toBeUndefined();
  });

  it("usage rows, credit balances, and invoices decode and derive", () => {
    const usage = CompanyFeatureUsageListResponseDataFromJSON(
      golden("company_usage"),
    );
    const rows = usage.rows.map((row) => deriveUsage(row, { locale: "en-US" }));
    expect(rows).toHaveLength(2);
    const sources = rows.map((row) => row.source).sort();
    expect(sources).toEqual(["company", "plan"]);
    const planRow = rows.find((row) => row.source === "plan");
    expect(planRow?.limit).toBe(25);
    expect(planRow?.state).toBe("ok");
    // Not metered per unit: no cost.
    expect(planRow?.currentCost).toBeUndefined();

    const credits = CompanyCreditBalancesResponseDataFromJSON(
      golden("company_credits"),
    );
    const balances = deriveCreditBalances(credits.balances, {
      locale: "en-US",
    });
    expect(balances).toHaveLength(1);
    expect(balances[0]?.total).toBe(500);
    expect(balances[0]?.percentUsed).toBe(0);
    expect(balances[0]?.grants).toHaveLength(1);
    // A purchased grant names the bundle it came from, even though the
    // bundle has since been archived.
    expect(balances[0]?.grants[0]?.source.reason).toBe("purchased");
    expect(balances[0]?.grants[0]?.source.bundleName).toBeDefined();

    const invoices = (golden("company_invoices") as unknown[]).map((row) =>
      CompanyInvoiceResponseDataFromJSON(row),
    );
    const list = deriveInvoiceList(invoices, { locale: "en-US" });
    expect(list).toHaveLength(1);
    expect(list[0]?.formattedAmount).toBe("$100.00");
    expect(list[0]?.url).toBeDefined();
  });
});
