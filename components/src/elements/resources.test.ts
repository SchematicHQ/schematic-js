import { Invoices } from "./Invoices";
import { PaymentMethods } from "./PaymentMethods";
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
