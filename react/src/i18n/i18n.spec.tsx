import { render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

import { BillingDataProvider } from "../billing/context";
import type { BillingData, Invoice } from "../billing/contract";
import { useInvoices } from "../billing/hooks";

import {
  SchematicI18nProvider,
  useSchematicI18n,
  useSchematicLocale,
  useSchematicStrings,
  useSchematicTranslate,
} from "./context";

const isDOMEnvironment = typeof document !== "undefined";
const it_ = isDOMEnvironment ? it : it.skip;

const invoice = (id: string) => ({ id }) as unknown as Invoice;
const data: BillingData = {
  invoices: { invoices: [invoice("in_1")], count: 1, hasMore: false },
};

describe("the i18n context", () => {
  it_("is empty, not undefined, outside any provider", () => {
    const { result } = renderHook(() => useSchematicI18n());
    expect(result.current).toEqual({});
    expect(result.current.locale).toBeUndefined();
  });

  it_("serves what the provider was configured with", () => {
    const translate = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicI18nProvider
        locale="fr-FR"
        strings={{ retry: "Réessayer" }}
        translate={translate}
      >
        {children}
      </SchematicI18nProvider>
    );
    const { result } = renderHook(
      () => ({
        locale: useSchematicLocale(),
        strings: useSchematicStrings(),
        translate: useSchematicTranslate(),
      }),
      { wrapper },
    );
    expect(result.current.locale).toBe("fr-FR");
    expect(result.current.strings).toEqual({ retry: "Réessayer" });
    expect(result.current.translate).toBe(translate);
  });

  it_("merges when nested, so a subtree can override one field", () => {
    const translate = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicI18nProvider
        locale="en-US"
        strings={{ retry: "Retry", invoicesHeader: "Invoices" }}
        translate={translate}
      >
        <SchematicI18nProvider
          locale="de-DE"
          strings={{ invoicesHeader: "Rechnungen" }}
        >
          {children}
        </SchematicI18nProvider>
      </SchematicI18nProvider>
    );
    const { result } = renderHook(() => useSchematicI18n(), { wrapper });
    // The inner locale and its one string win; the translator and the other
    // string are inherited rather than dropped.
    expect(result.current.locale).toBe("de-DE");
    expect(result.current.strings).toEqual({
      retry: "Retry",
      invoicesHeader: "Rechnungen",
    });
    expect(result.current.translate).toBe(translate);
  });

  it_("works with no data provider above it", () => {
    function Copy() {
      return <span>{useSchematicStrings()?.retry}</span>;
    }
    render(
      <SchematicI18nProvider strings={{ retry: "Opnieuw" }}>
        <Copy />
      </SchematicI18nProvider>,
    );
    expect(screen.getByText("Opnieuw")).toBeDefined();
  });
});

describe("i18n and the data seam", () => {
  /**
   * The reason the two are separate contexts. A host's `t` changes identity
   * whenever its language does, and an inline `translate={(k, v) => t(k, v)}`
   * changes it on every render. On the data source, each change would rebuild
   * the source and its snapshot cache, handing `useSyncExternalStore` a new
   * handle every render.
   */
  it_("keeps resource handles stable across an unstable translate", () => {
    const handles: unknown[] = [];
    function Reader() {
      handles.push(useInvoices());
      return null;
    }
    function Host({ language }: { language: string }) {
      return (
        <BillingDataProvider
          data={data}
          locale={language}
          // A fresh function identity on every render, as react-i18next's
          // `t` effectively is across a language change.
          translate={(key: string) => `${language}:${key}`}
        >
          <Reader />
        </BillingDataProvider>
      );
    }

    const view = render(<Host language="en" />);
    view.rerender(<Host language="en" />);
    view.rerender(<Host language="fr" />);

    expect(handles).toHaveLength(3);
    expect(handles[1]).toBe(handles[0]);
    expect(handles[2]).toBe(handles[0]);
  });

  it_("reaches the elements through BillingDataProvider's own props", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingDataProvider
        data={data}
        locale="ja-JP"
        strings={{ retry: "再試行" }}
      >
        {children}
      </BillingDataProvider>
    );
    const { result } = renderHook(() => useSchematicI18n(), { wrapper });
    expect(result.current.locale).toBe("ja-JP");
    expect(result.current.strings).toEqual({ retry: "再試行" });
  });
});
