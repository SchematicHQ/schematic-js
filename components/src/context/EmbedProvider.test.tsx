import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { SchematicEmbed } from "../components/embed";
import { useEmbed } from "../hooks";
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
