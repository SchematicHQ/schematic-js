import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { SchematicEmbed } from "../components/embed";
import { useEmbed } from "../hooks";
import hydrate from "../test/mocks/handlers/response/hydrate.json";
import { server } from "../test/mocks/node";
import type { DeepPartial, HydrateDataWithCompanyContext } from "../types";

import { EmbedProvider } from "./EmbedProvider";
import type { EmbedSettings } from "./embedState";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EmbedProvider apiKey="api_0">{children}</EmbedProvider>
);

// The unsubscribe guard only reads `data.subscription.{status,cancelAt}`, so we
// seed a minimal `data` shape rather than a full hydrate payload.
const dataWithSubscription = (subscription: Record<string, unknown>) =>
  ({ subscription }) as unknown as HydrateDataWithCompanyContext;

describe("requestUnsubscribe", () => {
  test("opens the unsubscribe modal for an active subscription", () => {
    const { result } = renderHook(() => useEmbed(), { wrapper });

    act(() => {
      result.current.setData(
        dataWithSubscription({ status: "active", cancelAt: null }),
      );
    });
    act(() => {
      result.current.requestUnsubscribe();
    });

    expect(result.current.layout).toBe("unsubscribe");
  });

  test("warns and stays put when there is no subscription", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useEmbed(), { wrapper });

    act(() => {
      result.current.requestUnsubscribe();
    });

    expect(result.current.layout).toBe("portal");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no active subscription"),
    );

    warn.mockRestore();
  });

  test("warns and stays put when the subscription is already cancelling", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useEmbed(), { wrapper });

    act(() => {
      result.current.setData(
        dataWithSubscription({ status: "active", cancelAt: new Date() }),
      );
    });
    act(() => {
      result.current.requestUnsubscribe();
    });

    expect(result.current.layout).toBe("portal");
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe("rehydrateWithParams", () => {
  const accessToken = "token_abc12345678901234567890123456";
  const adHocAddOnId = "plan_adHocAddOn1";

  // Hydrates a component the way `SchematicEmbed` does, without rendering the
  // embed.
  const renderHydrated = async () => {
    const rendered = renderHook(() => useEmbed(), { wrapper });
    act(() => {
      rendered.result.current.setAccessToken(accessToken);
    });
    await act(async () => {
      await rendered.result.current.hydrateComponent("comp_test");
    });
    await waitFor(() => expect(rendered.result.current.data).toBeDefined());
    return rendered;
  };

  // Serves the fixture, adding the ad-hoc add-on when the request includes it.
  const serveIncludedAddOn = () => {
    const requested: string[][] = [];
    server.use(
      http.get(
        "https://api.schematichq.com/components/:id/hydrate",
        ({ request }) => {
          const included = new URL(request.url).searchParams.getAll(
            "include_add_on_ids",
          );
          requested.push(included);
          const [addOn] = hydrate.data.active_add_ons;
          const activeAddOns = included.includes(adHocAddOnId)
            ? [
                ...hydrate.data.active_add_ons,
                { ...addOn, id: adHocAddOnId, name: "Ad-hoc service" },
              ]
            : hydrate.data.active_add_ons;
          return HttpResponse.json({
            ...hydrate,
            data: { ...hydrate.data, active_add_ons: activeAddOns },
          });
        },
      ),
    );
    return requested;
  };

  test("re-fetches the component with the included add-ons", async () => {
    const requested = serveIncludedAddOn();
    const { result } = await renderHydrated();

    await act(async () => {
      await result.current.rehydrateWithParams({
        includeAddOnIds: [adHocAddOnId],
      });
    });

    expect(requested[requested.length - 1]).toEqual([adHocAddOnId]);
    expect(
      result.current.data?.activeAddOns.map((addOn) => addOn.id),
    ).toContain(adHocAddOnId);
    // Nothing opens or gets selected; that's `initializeWithPlan`'s job.
    expect(result.current.layout).toBe("portal");
  });

  test("warns about an included ID the response left out", async () => {
    serveIncludedAddOn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await renderHydrated();

    await act(async () => {
      await result.current.rehydrateWithParams({
        includeAddOnIds: ["plan_notAnAddOn"],
      });
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("plan_notAnAddOn"),
    );

    warn.mockRestore();
  });

  test("rejects without touching the embed when the fetch fails", async () => {
    const { result } = await renderHydrated();
    const before = result.current.data;
    server.use(
      http.get("https://api.schematichq.com/components/:id/hydrate", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );

    await act(async () => {
      await expect(
        result.current.rehydrateWithParams({
          includeAddOnIds: [adHocAddOnId],
        }),
      ).rejects.toBeDefined();
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.data).toBe(before);
  });

  test("rejects when no component has been hydrated", async () => {
    const { result } = renderHook(() => useEmbed(), { wrapper });

    await act(async () => {
      await expect(
        result.current.rehydrateWithParams({
          includeAddOnIds: [adHocAddOnId],
        }),
      ).rejects.toThrow("SchematicEmbed");
    });
  });
});

describe("consumer settings vs. the stored design", () => {
  // The hydrate fixture's component AST carries a complete theme (white card,
  // black text). Applying it used to overwrite everything the consuming app had
  // set, because it lands after hydration and the merge was last-writer-wins.
  const darkTheme = {
    theme: {
      card: { background: "#111111" },
      typography: { text: { color: "#FFFFFF" } },
    },
  };
  const accessToken = "token_abc12345678901234567890123456";

  const renderEmbedded = (settings?: DeepPartial<EmbedSettings>) =>
    renderHook(() => useEmbed(), {
      wrapper: ({ children }) => (
        <EmbedProvider apiKey="api_0" settings={settings}>
          <SchematicEmbed id="comp_test" accessToken={accessToken} />
          {children}
        </EmbedProvider>
      ),
    });

  const hydrated = async (result: { current: { data?: unknown } }) =>
    waitFor(() => expect(result.current.data).toBeDefined());

  test("the settings prop survives hydration", async () => {
    const { result } = renderEmbedded(darkTheme);

    await hydrated(result);

    expect(result.current.settings.theme.card.background).toBe("#111111");
    expect(result.current.settings.theme.typography.text.color).toBe("#FFFFFF");
  });

  test("the stored design still supplies values the consumer omitted", async () => {
    const { result } = renderEmbedded(darkTheme);

    await hydrated(result);

    // `numberOfColumns: 1` comes from the fixture's AST, not the defaults (2).
    expect(result.current.settings.theme.numberOfColumns).toBe(1);
  });

  test("updateSettings called before hydration survives it", async () => {
    const { result } = renderEmbedded();

    act(() => {
      result.current.updateSettings(darkTheme, { update: true });
    });
    await hydrated(result);

    expect(result.current.settings.theme.card.background).toBe("#111111");
  });

  test("the theme survives a re-hydration", async () => {
    const { result } = renderEmbedded(darkTheme);
    await hydrated(result);

    // A checkout or unsubscribe marks the state stale, which re-fetches the
    // component and re-applies the stored design. Refreshing the access token
    // takes the same path.
    act(() => {
      result.current.setAccessToken("token_new12345678901234567890123456");
    });
    await waitFor(() => expect(result.current.stale).toBe(false));

    expect(result.current.settings.theme.card.background).toBe("#111111");
  });
});
