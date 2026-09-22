import { act, render, screen } from "@testing-library/react";
import { createInstance, type i18n as I18n } from "i18next";
import { describe, expect, test } from "vitest";

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

function hostInstance(): I18n {
  const host = createInstance();
  void host.init({
    lng: "en",
    fallbackLng: "en",
    initAsync: false,
    resources: {
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

  test("uses the translations for the given locale", () => {
    render(
      <LocalizationProvider translations={{ it }} locale="it-IT">
        <Probe />
      </LocalizationProvider>,
    );

    expect(text("text")).toBe("Aggiungi un nuovo metodo di pagamento");
    expect(text("plural")).toBe("10% per i prossimi 3 mesi");
    expect(text("price")).toBe("1234,56 €");
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
    expect(text("price")).toBe("1234,56 €");
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
});
