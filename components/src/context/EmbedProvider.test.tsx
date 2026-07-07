import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";

import { useEmbed } from "../hooks";
import type { HydrateDataWithCompanyContext } from "../types";

import { EmbedProvider } from "./EmbedProvider";

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
