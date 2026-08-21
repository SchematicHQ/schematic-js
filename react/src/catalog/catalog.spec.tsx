import { act, render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

import { SchematicProvider } from "../context";

import { CatalogStore, type CatalogClient } from "./client";
import { CatalogDataProvider, MISSING_CATALOG_SOURCE_MESSAGE } from "./context";
import type {
  AnyCatalog,
  CatalogData,
  CompanyContext,
  Invoice,
} from "./contract";
import { useCatalog, useCompany, useInvoices } from "./hooks";
import { CatalogProvider } from "./provider";

const isDOMEnvironment = typeof document !== "undefined";
const it_ = isDOMEnvironment ? it : it.skip;

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const catalog = { id: "cat_1", name: "Catalog" } as unknown as AnyCatalog;
const company = { id: "comp_1", name: "Acme" } as unknown as CompanyContext;
const invoice = (id: string) => ({ id }) as unknown as Invoice;

function fakeClient(overrides: Partial<CatalogClient> = {}): CatalogClient & {
  listeners: (() => void)[];
} {
  const listeners: (() => void)[] = [];
  return {
    listeners,
    fetchCatalog: vi.fn(async () => catalog),
    fetchCompany: vi.fn(async () => company),
    fetchFeatureUsage: vi.fn(async () => []),
    fetchCreditBalances: vi.fn(async () => []),
    fetchInvoices: vi.fn(async () => []),
    fetchUpcomingInvoice: vi.fn(async () => null),
    onCredentialsChange: (listener) => {
      listeners.push(listener);
      return () => {};
    },
    ...overrides,
  };
}

describe("catalog hooks", () => {
  it_("report the missing-source error outside any provider", () => {
    const { result } = renderHook(() => useCatalog());
    expect(result.current.error?.message).toBe(MISSING_CATALOG_SOURCE_MESSAGE);
    expect(result.current.isPending).toBe(false);
  });

  it_("load through the client and expose refetch", async () => {
    const client = fakeClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CatalogProvider catalogClient={client}>{children}</CatalogProvider>
    );
    const { result } = renderHook(() => useCatalog(), { wrapper });
    expect(result.current.isPending).toBe(true);
    await flush();
    expect(result.current.data).toBe(catalog);
    expect(client.fetchCatalog).toHaveBeenCalledTimes(1);
    act(() => result.current.refetch());
    await flush();
    expect(client.fetchCatalog).toHaveBeenCalledTimes(2);
  });

  it_("only fetch resources something subscribes to", async () => {
    const client = fakeClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CatalogProvider catalogClient={client}>{children}</CatalogProvider>
    );
    renderHook(() => useCompany(), { wrapper });
    await flush();
    expect(client.fetchCompany).toHaveBeenCalledTimes(1);
    expect(client.fetchCatalog).not.toHaveBeenCalled();
  });

  it_(
    "serve initialData without a request and keep live data on later props",
    async () => {
      const client = fakeClient();
      const initialData: CatalogData = { catalog };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CatalogProvider catalogClient={client} initialData={initialData}>
          {children}
        </CatalogProvider>
      );
      const { result } = renderHook(() => useCatalog(), { wrapper });
      expect(result.current).toMatchObject({ data: catalog, isPending: false });
      await flush();
      expect(client.fetchCatalog).not.toHaveBeenCalled();
    },
  );

  it_("serve initialData with no client at all (static page)", () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: ({ children }) => (
        <CatalogProvider initialData={{ company }}>{children}</CatalogProvider>
      ),
    });
    expect(result.current.data).toBe(company);
    const { result: other } = renderHook(() => useCatalog(), {
      wrapper: ({ children }) => (
        <CatalogProvider initialData={{ company }}>{children}</CatalogProvider>
      ),
    });
    expect(other.current.isPending).toBe(true);
  });

  it_("reset every resource when the client's credentials change", async () => {
    const client = fakeClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CatalogProvider catalogClient={client}>{children}</CatalogProvider>
    );
    const { result } = renderHook(() => useCatalog(), { wrapper });
    await flush();
    expect(result.current.data).toBe(catalog);
    act(() => client.listeners.forEach((l) => l()));
    expect(result.current).toMatchObject({ data: undefined, isPending: true });
    await flush();
    expect(client.fetchCatalog).toHaveBeenCalledTimes(2);
  });

  it_("forward the accessToken prop to the client", () => {
    const client = fakeClient({ setAccessToken: vi.fn() });
    const { rerender } = render(
      <CatalogProvider catalogClient={client} accessToken="t1">
        <span />
      </CatalogProvider>,
    );
    expect(client.setAccessToken).toHaveBeenCalledWith("t1");
    rerender(
      <CatalogProvider catalogClient={client} accessToken="t2">
        <span />
      </CatalogProvider>,
    );
    expect(client.setAccessToken).toHaveBeenLastCalledWith("t2");
  });

  it_("leave a client-owned token alone when no prop is given", () => {
    const client = fakeClient({ setAccessToken: vi.fn() });
    const { rerender } = render(
      <CatalogProvider catalogClient={client}>
        <span />
      </CatalogProvider>,
    );
    expect(client.setAccessToken).not.toHaveBeenCalled();
    rerender(
      <CatalogProvider catalogClient={client} accessToken="t1">
        <span />
      </CatalogProvider>,
    );
    rerender(
      <CatalogProvider catalogClient={client}>
        <span />
      </CatalogProvider>,
    );
    expect(client.setAccessToken).toHaveBeenNthCalledWith(1, "t1");
    expect(client.setAccessToken).toHaveBeenNthCalledWith(2, undefined);
  });

  it_("page invoices with limit + 1 and append on loadMore", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
    const client = fakeClient({
      fetchInvoices: vi.fn(async ({ limit, offset }) =>
        rows.slice(offset, offset + limit),
      ),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CatalogProvider catalogClient={client}>{children}</CatalogProvider>
    );
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledWith({ limit: 13, offset: 0 });
    expect(result.current.data).toMatchObject({ hasMore: true });
    expect(result.current.data?.invoices).toHaveLength(12);
    act(() => result.current.loadMore());
    await flush();
    expect(client.fetchInvoices).toHaveBeenLastCalledWith({
      limit: 13,
      offset: 12,
    });
    expect(result.current.data?.invoices).toHaveLength(24);
    act(() => result.current.loadMore());
    await flush();
    expect(result.current.data).toMatchObject({ hasMore: false });
    expect(result.current.data?.invoices).toHaveLength(30);
  });

  it_(
    "SchematicProvider provides the catalog hooks alongside flags",
    async () => {
      const client = fakeClient();
      function Probe() {
        const { data } = useCatalog();
        return <span>{data === undefined ? "pending" : data.name}</span>;
      }
      render(
        <SchematicProvider publishableKey="pk" catalogClient={client}>
          <Probe />
        </SchematicProvider>,
      );
      expect(screen.getByText("pending")).toBeTruthy();
      await flush();
      expect(screen.getByText("Catalog")).toBeTruthy();
    },
  );

  it_(
    "CatalogDataProvider feeds the hooks from plain data with status overrides",
    () => {
      const onRefetch = vi.fn();
      const { result } = renderHook(() => useCatalog(), {
        wrapper: ({ children }) => (
          <CatalogDataProvider
            data={{ catalog }}
            status={{ catalog: { error: new Error("x") } }}
            onRefetch={onRefetch}
          >
            {children}
          </CatalogDataProvider>
        ),
      });
      expect(result.current).toMatchObject({
        data: catalog,
        error: new Error("x"),
      });
      result.current.refetch();
      expect(onRefetch).toHaveBeenCalledWith("catalog");
    },
  );
});

describe("CatalogStore", () => {
  it("invalidateAll refetches only loaded resources", async () => {
    const client = fakeClient();
    const store = new CatalogStore(client);
    await store.catalog.load();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchCatalog).toHaveBeenCalledTimes(2);
    expect(client.fetchCompany).not.toHaveBeenCalled();
  });
});
