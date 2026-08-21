import * as SchematicJS from "@schematichq/schematic-js";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SchematicProvider } from "../context";

import { useCatalog, useCompany, useSchematicCustomerClient } from "./customer";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const catalogEnvelope = {
  data: {
    id: "ctlg_1",
    name: "Default",
    plans: [],
    add_ons: [],
    credit_bundles: [],
  },
  params: {},
};

const companyEnvelope = {
  data: {
    add_ons: [],
    billing_subscriptions: [],
    custom_plan_billings: [],
    entitlements: [],
    entity_traits: [],
    keys: [],
    metrics: [],
    name: "Acme",
    payment_methods: [],
    plans: [],
    rules: [],
  },
  params: {},
};

const fakeFetch = (responder: (url: string) => Response) =>
  vi.fn(async (input: RequestInfo | URL) =>
    responder(String(input)),
  ) as unknown as typeof fetch;

const wrapperWith = (
  props: Partial<React.ComponentProps<typeof SchematicProvider>>,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SchematicProvider publishableKey="api_pub" {...props}>
      {children}
    </SchematicProvider>
  );
  return Wrapper;
};

describe("customer hooks", () => {
  it("useCatalog loads through a provider-supplied customer client", async () => {
    const client = new SchematicJS.SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi: fakeFetch(() => jsonResponse(catalogEnvelope)),
    });
    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperWith({ customerClient: client }),
    });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.mode).toBe("public");
    expect(result.current.data?.name).toBe("Default");
  });

  it("useCompany surfaces a missing access token as error state, not a throw", async () => {
    const client = new SchematicJS.SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi: fakeFetch(() => jsonResponse(catalogEnvelope)),
    });
    const { result } = renderHook(() => useCompany(), {
      wrapper: wrapperWith({ customerClient: client }),
    });
    expect(result.current.error?.message).toMatch(/accessToken/);
    expect(result.current.isPending).toBe(false);
  });

  it("errors without any provider credential", () => {
    const { result } = renderHook(() => useCatalog());
    expect(result.current.error?.message).toMatch(/SchematicProvider/);
  });

  it("accepts an explicit client without a provider", async () => {
    const client = new SchematicJS.SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi: fakeFetch(() => jsonResponse(catalogEnvelope)),
    });
    const { result } = renderHook(() => useCatalog({ client }));
    await waitFor(() => {
      expect(result.current.data?.mode).toBe("public");
    });
  });

  it("useCompany loads once the provider gets an access token", async () => {
    const fetchApi = fakeFetch((url) =>
      url.includes("/company")
        ? jsonResponse(companyEnvelope)
        : jsonResponse(catalogEnvelope),
    );
    const client = new SchematicJS.SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });

    const { result, rerender } = renderHook(() => useCompany(), {
      initialProps: {},
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <SchematicProvider customerClient={client} publishableKey="api_pub">
          {children}
        </SchematicProvider>
      ),
    });
    expect(result.current.error?.message).toMatch(/accessToken/);

    client.setAccessToken("token_abc");
    rerender({});
    await waitFor(() => {
      expect(result.current.data?.name).toBe("Acme");
    });
  });

  it("works under StrictMode double-mounting with a provider-built client", async () => {
    // The provider-built client uses the global fetch; stub it so the
    // lazy render-time creation path is exercised end to end.
    vi.stubGlobal(
      "fetch",
      fakeFetch(() => jsonResponse(catalogEnvelope)),
    );
    try {
      const { result } = renderHook(() => useCatalog(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <React.StrictMode>
            <SchematicProvider publishableKey="api_pub">
              {children}
            </SchematicProvider>
          </React.StrictMode>
        ),
      });
      await waitFor(() => {
        expect(result.current.data?.name).toBe("Default");
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("useSchematicCustomerClient exposes the provider-built client", () => {
    const { result } = renderHook(() => useSchematicCustomerClient(), {
      wrapper: wrapperWith({}),
    });
    expect(result.current).toBeInstanceOf(SchematicJS.SchematicCustomerClient);
  });
});
