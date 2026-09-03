import {
  CompanyDataProvider,
  SchematicI18nProvider,
  type CompanyData,
  type SchematicI18nConfig,
} from "@schematichq/schematic-react";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

import {
  daysFromNow,
  discount,
  invoice,
  invoicePage,
  upcomingInvoice,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";
import { formatDate } from "../model";
import { MISSING_STRING } from "../strings";

import { Invoices, type InvoicesProps } from "./Invoices";
import { UpcomingBill } from "./UpcomingBill";

/**
 * The resolution ladder every element shares, exercised through one of them:
 * an element's `strings`, then the provider's, then the host's `translate`,
 * then the element's English.
 */
function renderInvoices(
  i18n: SchematicI18nConfig = {},
  props: InvoicesProps = {},
  data: CompanyData = SCENARIOS.pro(),
) {
  return render(
    <CompanyDataProvider data={data} {...i18n}>
      <Invoices {...props} />
    </CompanyDataProvider>,
  );
}

const heading = () => screen.getByRole("heading").textContent;

describe("copy resolution", () => {
  test("falls back to English with nothing configured", () => {
    renderInvoices();
    expect(heading()).toBe("Invoices");
  });

  test("the host's translate answers for keys it has", () => {
    const nl: Record<string, string> = { invoicesHeader: "Facturen" };
    renderInvoices({ translate: (key) => nl[key] });
    expect(heading()).toBe("Facturen");
    // A key it has no entry for keeps the English default.
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
  });

  test("the provider's strings win over its translate", () => {
    renderInvoices({
      strings: { invoicesHeader: "Billing history" },
      translate: () => "Facturen",
    });
    expect(heading()).toBe("Billing history");
  });

  test("an element's strings win over the provider's", () => {
    renderInvoices(
      {
        strings: { invoicesHeader: "Billing history" },
        translate: () => "Facturen",
      },
      { strings: { invoicesHeader: "Receipts" } },
    );
    expect(heading()).toBe("Receipts");
  });

  test("strings alone localize an element, with no i18n stack at all", () => {
    renderInvoices({
      strings: { invoicesHeader: "Rechnungen", retry: "Erneut" },
    });
    expect(heading()).toBe("Rechnungen");
  });
});

describe("detecting a miss", () => {
  test("a stack that echoes the key is a miss, not a translation", () => {
    // Bare i18next, with nothing registered and no defaultValue honoured.
    renderInvoices({ translate: (key) => key });
    expect(heading()).toBe("Invoices");
  });

  test("a stack that answers with our defaultValue is a miss too", () => {
    // What i18next does once `defaultValue` is passed: it always answers, so
    // the echo check alone would read every fallback as a translation.
    const translate = vi.fn(
      (_key: string, vars?: Record<string, unknown>) =>
        vars?.defaultValue as string,
    );
    renderInvoices({ translate });
    expect(heading()).toBe("Invoices");
    expect(translate).toHaveBeenCalledWith(
      "invoicesHeader",
      expect.objectContaining({ defaultValue: MISSING_STRING }),
    );
  });

  test("undefined is a miss", () => {
    renderInvoices({ translate: () => undefined });
    expect(heading()).toBe("Invoices");
  });

  test("onMissingString names every key that fell back", () => {
    const onMissingString = vi.fn();
    renderInvoices({
      onMissingString,
      translate: (key) => (key === "invoicesHeader" ? "Facturen" : undefined),
    });
    const missed = new Set(onMissingString.mock.calls.map(([key]) => key));
    expect(missed.has("invoicesHeader")).toBe(false);
    expect(missed.has("invoicesDateColumn")).toBe(true);
    expect(missed.has("retry")).toBe(true);
  });

  test("nothing is asked of the host for a key an override already answered", () => {
    const translate = vi.fn(() => undefined);
    renderInvoices({ strings: { invoicesHeader: "Rechnungen" }, translate });
    expect(translate).not.toHaveBeenCalledWith(
      "invoicesHeader",
      expect.anything(),
    );
  });
});

describe("vars", () => {
  test("reach the host's stack as its options object", () => {
    // How a count-bearing string resolves its plural forms in the host's
    // catalogue rather than ours.
    const translate = vi.fn(() => undefined);
    renderInvoices({ translate });
    for (const [, vars] of translate.mock.calls as unknown as [
      string,
      Record<string, unknown>,
    ][]) {
      expect(vars).toHaveProperty("defaultValue");
    }
  });
});

describe("server rendering", () => {
  const asViewer = (language: string) => {
    const original = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      "language",
    );
    Object.defineProperty(navigator, "language", {
      configurable: true,
      get: () => language,
    });
    return () => {
      delete (navigator as unknown as Record<string, unknown>).language;
      if (original !== undefined) {
        Object.defineProperty(Navigator.prototype, "language", original);
      }
    };
  };

  test("the server's markup does not depend on the viewer's language", () => {
    // A server has no `navigator`. Reading it while rendering would format
    // the server's markup one way and the client's another, and hydration
    // would report a mismatch on every date and amount.
    const restore = asViewer("fr-FR");
    try {
      const data = SCENARIOS.pro();
      data.invoices = invoicePage([invoice({ dueDate: daysFromNow(-10) })]);
      const markup = renderToString(
        <CompanyDataProvider data={data}>
          <Invoices />
        </CompanyDataProvider>,
      );
      expect(markup).toContain(formatDate(daysFromNow(-10), "en-US"));
      expect(markup).not.toContain(formatDate(daysFromNow(-10), "fr-FR"));
    } finally {
      restore();
    }
  });

  test("the viewer's language takes over once mounted", () => {
    const restore = asViewer("fr-FR");
    try {
      const data = SCENARIOS.pro();
      data.invoices = invoicePage([invoice({ dueDate: daysFromNow(-10) })]);
      render(
        <CompanyDataProvider data={data}>
          <Invoices />
        </CompanyDataProvider>,
      );
      expect(
        screen.getByText(formatDate(daysFromNow(-10), "fr-FR")),
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

describe("locale", () => {
  const dated = () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage([invoice({ dueDate: daysFromNow(-10) })]);
    return data;
  };

  test("comes from the provider, and an element's prop wins", () => {
    const data = dated();
    const view = renderInvoices({ locale: "fr-FR" }, {}, data);
    expect(
      screen.getByText(formatDate(daysFromNow(-10), "fr-FR")),
    ).toBeInTheDocument();
    view.unmount();

    renderInvoices({ locale: "fr-FR" }, { locale: "en-US" }, data);
    expect(
      screen.getByText(formatDate(daysFromNow(-10), "en-US")),
    ).toBeInTheDocument();
  });

  test("a nested provider scopes a different locale to a subtree", () => {
    const data = dated();
    render(
      <CompanyDataProvider data={data} locale="en-US">
        <SchematicI18nProvider locale="fr-FR">
          <Invoices />
        </SchematicI18nProvider>
      </CompanyDataProvider>,
    );
    expect(
      screen.getByText(formatDate(daysFromNow(-10), "fr-FR")),
    ).toBeInTheDocument();
  });

  test("a nested provider keeps the translator configured above it", () => {
    render(
      <CompanyDataProvider
        data={SCENARIOS.pro()}
        translate={(key) => (key === "invoicesHeader" ? "Facturen" : undefined)}
      >
        <SchematicI18nProvider locale="fr-FR">
          <Invoices />
        </SchematicI18nProvider>
      </CompanyDataProvider>,
    );
    expect(heading()).toBe("Facturen");
  });
});

/**
 * Interpolation and plurals, which only a count-bearing element exercises:
 * the elements never assemble a sentence from fragments, so a translator
 * gets one string with placeholders and owns the word order.
 */
describe("interpolation and plurals", () => {
  const renderBill = (
    i18n: SchematicI18nConfig = {},
    months: number | null = 3,
  ) =>
    render(
      <CompanyDataProvider
        data={{
          upcomingInvoice: upcomingInvoice({
            dueDate: daysFromNow(14),
            discounts: [discount({ durationInMonths: months })],
          }),
        }}
        {...i18n}
      >
        <UpcomingBill locale="en-US" />
      </CompanyDataProvider>,
    );

  test("fills our own default with the value it names", () => {
    renderBill();
    expect(heading()).toBe(
      `Next bill due ${formatDate(daysFromNow(14), "en-US")}`,
    );
  });

  test("fills a host's override the same way", () => {
    renderBill({ strings: { upcomingBillHeader: "Fällig am {{date}}" } });
    expect(heading()).toBe(`Fällig am ${formatDate(daysFromNow(14), "en-US")}`);
  });

  test("hands the host's stack the count and the formatted value", () => {
    const translate = vi.fn(() => undefined);
    renderBill({ translate });
    expect(translate).toHaveBeenCalledWith(
      "upcomingBillDiscountRepeating",
      expect.objectContaining({ count: 3, value: "20%" }),
    );
  });

  test("the host's stack owns the plural form when it answers", () => {
    renderBill({
      translate: (key, vars) =>
        key === "upcomingBillDiscountRepeating"
          ? `${vars?.value as string} rabat gedurende ${vars?.count as number} maanden`
          : undefined,
    });
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% rabat gedurende 3 maanden",
    );
  });

  test("a host's own plural forms resolve under the viewer's locale", () => {
    // The suffixed keys are what a catalogue holds; the element asks for the
    // bare name, here and in the host's file.
    renderBill(
      {
        locale: "en-US",
        strings: {
          upcomingBillDiscountRepeating_one: "{{value}} off, one more month",
          upcomingBillDiscountRepeating_other:
            "{{value}} off, {{count}} more months",
        },
      },
      1,
    );
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off, one more month",
    );
  });

  test("English falls back through our own plural forms", () => {
    renderBill({}, 1);
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off for 1 month",
    );
  });
});
