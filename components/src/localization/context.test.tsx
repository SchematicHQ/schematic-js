import { act, render, screen } from "@testing-library/react";
import { createInstance, type i18n as I18n } from "i18next";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { formatCurrency } from "../utils";

import { LocalizationProvider, useTranslation } from "./context";
import { SCHEMATIC_NAMESPACE } from "./i18n";
import type { SchematicTranslations } from "./types";

const Probe = () => {
  const { t, locale } = useTranslation();

  return (
    <>
      <p data-testid="text">{t("Add new payment method")}</p>
      <p data-testid="plural">
        {t("Discount for months", { count: 3, discount: "10%" })}
      </p>
      <p data-testid="fallback">{t("Cancel subscription")}</p>
      <p data-testid="number">
        {t("X item bundle", { amount: 20000, item: "token", createdAt: "" })}
      </p>
      <p data-testid="count">{t("Show all X users", { count: 20000 })}</p>
      <p data-testid="interpolated">
        {t("Everything in", { plan: "Ryan's R&D <Pro>" })}
      </p>
      <p data-testid="price">
        {formatCurrency(123456, { locale, currency: "eur" })}
      </p>
    </>
  );
};

const it: SchematicTranslations = {
  "Add new payment method": "Aggiungi un nuovo metodo di pagamento",
  "Discount for months_one": "{{discount}} per il prossimo mese",
  "Discount for months_other": "{{discount}} per i prossimi {{count}} mesi",
};

/**
 * A host instance on i18next's defaults, which HTML-escape interpolation.
 * Typed as i18next's own `i18n`, so passing it as the prop also checks that
 * the real instance satisfies `SchematicI18nInstance`.
 */
function hostInstance(): I18n {
  const host = createInstance();
  void host.init({
    lng: "en",
    fallbackLng: "en",
    initAsync: false,
    resources: {
      en: {
        [SCHEMATIC_NAMESPACE]: {
          "Everything in": "Everything in {{plan}}, plus",
        },
      },
      it: { [SCHEMATIC_NAMESPACE]: it },
    },
  });
  return host;
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe("useTranslation", () => {
  test("renders English without a provider", () => {
    render(<Probe />);

    expect(text("text")).toBe("Add new payment method");
    expect(text("plural")).toBe("10% for next 3 months");
    expect(text("price")).toBe("€1,234.56");
  });

  test("formats numbers interpolated into copy", () => {
    render(
      <LocalizationProvider translations={{ it }} locale="it-IT">
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("number")).toMatch(/^20\.000 token bundle/);
  });

  test("formats a plural's count like any other number", () => {
    render(<Probe />);
    expect(text("count")).toBe("Show all 20,000 users");
  });

  test("uses the translations for the given locale", () => {
    render(
      <LocalizationProvider translations={{ it }} locale="it-IT">
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("text")).toBe("Aggiungi un nuovo metodo di pagamento");
    expect(text("plural")).toBe("10% per i prossimi 3 mesi");
    expect(text("price")).toBe("1234,56\u00a0€");
  });

  test("falls back to English for a key the translations lack", () => {
    render(
      <LocalizationProvider translations={{ it }} locale="it-IT">
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("fallback")).toBe("Cancel subscription");
  });

  test("reads the host's instance in its current language", async () => {
    const host = hostInstance();
    render(
      <LocalizationProvider i18n={host}>
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("text")).toBe("Add new payment method");
    expect(text("price")).toBe("€1,234.56");

    await act(() => host.changeLanguage("it"));

    expect(text("text")).toBe("Aggiungi un nuovo metodo di pagamento");
    expect(text("plural")).toBe("10% per i prossimi 3 mesi");
    expect(text("fallback")).toBe("Cancel subscription");
    expect(text("price")).toBe("1234,56\u00a0€");
  });

  test("prefers an explicit locale over the host's language", () => {
    const host = hostInstance();
    render(
      <LocalizationProvider i18n={host} locale="it">
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("text")).toBe("Aggiungi un nuovo metodo di pagamento");
  });

  test("does not HTML-escape values the host's instance interpolates", () => {
    render(
      <LocalizationProvider i18n={hostInstance()}>
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("interpolated")).toBe("Everything in Ryan's R&D <Pro>, plus");
  });

  test("does not load namespaces from the host's instance", () => {
    const host = hostInstance();
    const loadNamespaces = vi.spyOn(host, "loadNamespaces");
    render(
      <LocalizationProvider i18n={host}>
        <Probe />
      </LocalizationProvider>,
    );

    expect(loadNamespaces).not.toHaveBeenCalled();
  });

  test("keeps one instance for translations written inline", () => {
    const seen = new Set<unknown>();
    const Spy = () => {
      const { t } = useTranslation();
      seen.add(t);
      return null;
    };
    const Host = () => {
      const [, rerender] = useState(0);
      return (
        <LocalizationProvider translations={{ it: { ...it } }} locale="it-IT">
          <Spy />
          <button onClick={() => rerender((n) => n + 1)}>rerender</button>
        </LocalizationProvider>
      );
    };
    render(<Host />);

    act(() => screen.getByText("rerender").click());
    act(() => screen.getByText("rerender").click());

    expect(seen.size).toBe(1);
  });
});
