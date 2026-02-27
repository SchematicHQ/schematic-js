import { describe, expect, test } from "vitest";

import {
  InvoiceStatus,
  type InvoiceResponseData,
} from "../../../api/checkoutexternal";

import { formatInvoices } from "./Invoices";

function makeInvoice(
  overrides: Partial<InvoiceResponseData> = {},
): InvoiceResponseData {
  return {
    amountDue: 500,
    amountPaid: 500,
    amountRemaining: 0,
    collectionMethod: "charge_automatically",
    createdAt: new Date("2025-12-16"),
    currency: "usd",
    customerExternalId: "cus_test",
    environmentId: "env_1",
    id: "1",
    providerType: "stripe",
    subtotal: 500,
    updatedAt: new Date("2025-12-16"),
    ...overrides,
  } as InvoiceResponseData;
}

describe("formatInvoices", () => {
  test("returns empty array for undefined input", () => {
    expect(formatInvoices(undefined)).toEqual([]);
  });

  test("returns empty array for empty input", () => {
    expect(formatInvoices([])).toEqual([]);
  });

  test("includes paid invoice with null due date", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: null,
        externalId: "in_abc",
      }),
    ];
    const result = formatInvoices(invoices);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBeDefined();
  });

  test("falls back to createdAt when dueDate is null", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: null,
        createdAt: new Date("2025-12-16"),
        externalId: "in_abc",
      }),
    ];
    const result = formatInvoices(invoices);
    expect(result[0].date).toContain("December");
  });

  test("excludes draft invoices", () => {
    const invoices = [
      makeInvoice({ status: InvoiceStatus.Draft, externalId: "in_abc" }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("excludes void invoices", () => {
    const invoices = [
      makeInvoice({ status: InvoiceStatus.Void, externalId: "in_abc" }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("excludes uncollectible invoices", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Uncollectible,
        externalId: "in_abc",
      }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("excludes invoices with upcoming_ prefix", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Open,
        externalId: "upcoming_in_abc",
        dueDate: new Date("2020-01-01"),
      }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("excludes zero amount invoices", () => {
    const invoices = [
      makeInvoice({
        amountDue: 0,
        status: InvoiceStatus.Paid,
        externalId: "in_abc",
      }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("excludes future due date invoices when hideUpcoming is true", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Open,
        dueDate: future,
        externalId: "in_abc",
      }),
    ];
    expect(formatInvoices(invoices)).toHaveLength(0);
  });

  test("includes future due date invoices when hideUpcoming is false", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Open,
        dueDate: future,
        externalId: "in_abc",
      }),
    ];
    const result = formatInvoices(invoices, { hideUpcoming: false });
    expect(result).toHaveLength(1);
  });

  test("sorts by date descending", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: new Date("2025-01-15T12:00:00"),
      }),
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: new Date("2025-06-15T12:00:00"),
      }),
    ];
    const result = formatInvoices(invoices);
    expect(result[0].date).toContain("June");
    expect(result[1].date).toContain("January");
  });

  test("sorts by createdAt when dueDate is null", () => {
    const invoices = [
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: null,
        createdAt: new Date("2025-01-15T12:00:00"),
      }),
      makeInvoice({
        status: InvoiceStatus.Paid,
        dueDate: null,
        createdAt: new Date("2025-06-15T12:00:00"),
      }),
    ];
    const result = formatInvoices(invoices);
    expect(result[0].date).toContain("June");
    expect(result[1].date).toContain("January");
  });

  test("includes invoice with null status", () => {
    const invoices = [
      makeInvoice({
        status: null,
        dueDate: new Date("2020-01-01"),
        externalId: "in_abc",
      }),
    ];
    const result = formatInvoices(invoices);
    expect(result).toHaveLength(1);
  });
});
