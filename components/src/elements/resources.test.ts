import { CreditUsage } from "./CreditUsage";
import { IncludedFeatures } from "./IncludedFeatures";
import { Invoices } from "./Invoices";
import { MeteredFeatures } from "./MeteredFeatures";
import { PaymentMethods } from "./PaymentMethods";
import { PlanManager } from "./PlanManager";
import { UnsubscribeButton } from "./UnsubscribeButton";
import { UpcomingBill } from "./UpcomingBill";
import { billingResources, type ReadsBillingResources } from "./common";

/**
 * What each element declares it reads is what its hook asks the store for.
 * A page prefetches by this list, so an element reading a resource it does
 * not declare would fetch after hydration, and one declaring a resource it
 * does not read would prefetch for nothing.
 */
describe("what the elements read", () => {
  test("each element names its resources", () => {
    expect(Invoices.resources).toEqual(["invoices"]);
    expect(UpcomingBill.resources).toEqual(["upcomingInvoice"]);
    expect(PaymentMethods.resources).toEqual(["paymentMethods"]);
    expect(IncludedFeatures.resources).toEqual(["featureUsage"]);
    expect(MeteredFeatures.resources).toEqual(["featureUsage"]);
    expect(CreditUsage.resources).toEqual(["creditBalances"]);
    expect(PlanManager.resources).toEqual([
      "company",
      "featureUsage",
      "creditBalances",
    ]);
    expect(UnsubscribeButton.resources).toEqual(["company", "featureUsage"]);
  });

  test("billingResources collects them once each, in the order given", () => {
    expect(
      billingResources(UpcomingBill, Invoices, PaymentMethods, UpcomingBill),
    ).toEqual(["upcomingInvoice", "invoices", "paymentMethods"]);
    expect(billingResources()).toEqual([]);
    const custom: ReadsBillingResources = {
      resources: ["invoices", "upcomingInvoice"],
    };
    expect(billingResources(custom, Invoices)).toEqual([
      "invoices",
      "upcomingInvoice",
    ]);
  });
});
