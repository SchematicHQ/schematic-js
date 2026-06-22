import "@angular/compiler";
import { Injector } from "@angular/core";
import { vi } from "vitest";
import { firstValueFrom, take, toArray } from "rxjs";
import { SchematicService } from "./schematic.service";
import { SCHEMATIC_CLIENT } from "./token";
import type {
  CheckFlagReturn,
  CheckPlanReturn,
  CreditBalance,
} from "@schematichq/schematic-js";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createMockClient() {
  const listeners: Record<string, Set<(...args: unknown[]) => void>> = {
    flagValue: new Set(),
    flagCheck: new Set(),
    plan: new Set(),
    creditBalance: new Set(),
    isPending: new Set(),
  };

  return {
    getFlagValue: vi.fn().mockReturnValue(undefined),
    getFlagCheck: vi.fn().mockReturnValue(undefined),
    getPlan: vi.fn().mockReturnValue(undefined),
    getCreditBalance: vi
      .fn()
      .mockReturnValue(undefined as CreditBalance | undefined),
    getIsPending: vi.fn().mockReturnValue(true),
    setContext: vi.fn(),
    identify: vi.fn(),
    track: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
    addFlagValueListener: vi.fn(
      (key: string, callback: (...args: unknown[]) => void) => {
        listeners.flagValue.add(callback);
        return () => listeners.flagValue.delete(callback);
      },
    ),
    addFlagCheckListener: vi.fn(
      (key: string, callback: (...args: unknown[]) => void) => {
        listeners.flagCheck.add(callback);
        return () => listeners.flagCheck.delete(callback);
      },
    ),
    addPlanListener: vi.fn((callback: (...args: unknown[]) => void) => {
      listeners.plan.add(callback);
      return () => listeners.plan.delete(callback);
    }),
    addCreditBalanceListener: vi.fn(
      (callback: (...args: unknown[]) => void) => {
        listeners.creditBalance.add(callback);
        return () => listeners.creditBalance.delete(callback);
      },
    ),
    addIsPendingListener: vi.fn((callback: (...args: unknown[]) => void) => {
      listeners.isPending.add(callback);
      return () => listeners.isPending.delete(callback);
    }),
    _listeners: listeners,
    _notify(type: keyof typeof listeners) {
      listeners[type].forEach((cb) => cb());
    },
  };
}

type MockClient = ReturnType<typeof createMockClient>;

function createServiceWithInjector(mockClient: MockClient) {
  const injector = Injector.create({
    providers: [
      { provide: SCHEMATIC_CLIENT, useValue: mockClient },
      { provide: SchematicService, useClass: SchematicService },
    ],
  });
  return injector.get(SchematicService);
}

describe("SchematicService", () => {
  let mockClient: MockClient;
  let service: SchematicService;

  beforeEach(() => {
    mockFetch.mockClear();
    mockClient = createMockClient();
    service = createServiceWithInjector(mockClient);
  });

  describe("DI wiring", () => {
    it("should resolve SchematicService via Angular injector", () => {
      expect(service).toBeInstanceOf(SchematicService);
    });

    it("should inject the SCHEMATIC_CLIENT token", () => {
      expect(service.getClient()).toBe(mockClient);
    });
  });

  describe("getClient", () => {
    it("should return the underlying client", () => {
      expect(service.getClient()).toBe(mockClient);
    });
  });

  describe("setContext", () => {
    it("should delegate to client.setContext", () => {
      const ctx = { company: { id: "co-1" }, user: { id: "u-1" } };
      service.setContext(ctx);
      expect(mockClient.setContext).toHaveBeenCalledWith(ctx);
    });
  });

  describe("identify", () => {
    it("should delegate to client.identify", () => {
      const body = { keys: { id: "u-1" }, traits: { plan: "pro" } };
      service.identify(body);
      expect(mockClient.identify).toHaveBeenCalledWith(body);
    });
  });

  describe("track", () => {
    it("should delegate to client.track", () => {
      const body = { event: "api-call", quantity: 1 };
      service.track(body);
      expect(mockClient.track).toHaveBeenCalledWith(body);
    });
  });

  describe("flagValue$", () => {
    it("should emit the fallback when no value is available", async () => {
      mockClient.getFlagValue.mockReturnValue(undefined);
      const value = await firstValueFrom(service.flagValue$("my-flag"));
      expect(value).toBe(false);
    });

    it("should emit the current value", async () => {
      mockClient.getFlagValue.mockReturnValue(true);
      const value = await firstValueFrom(service.flagValue$("my-flag"));
      expect(value).toBe(true);
    });

    it("should use provided fallback", async () => {
      mockClient.getFlagValue.mockReturnValue(undefined);
      const value = await firstValueFrom(service.flagValue$("my-flag", true));
      expect(value).toBe(true);
    });

    it("should emit updated values when listener fires", async () => {
      mockClient.getFlagValue.mockReturnValue(false);

      const valuesPromise = firstValueFrom(
        service.flagValue$("my-flag").pipe(take(2), toArray()),
      );

      mockClient.getFlagValue.mockReturnValue(true);
      mockClient._notify("flagValue");

      const values = await valuesPromise;
      expect(values).toEqual([false, true]);
    });

    it("should not emit duplicate values", async () => {
      mockClient.getFlagValue.mockReturnValue(false);

      const valuesPromise = firstValueFrom(
        service.flagValue$("my-flag").pipe(take(2), toArray()),
      );

      // Notify with same value, should be filtered by distinctUntilChanged
      mockClient._notify("flagValue");

      // Now change the value
      mockClient.getFlagValue.mockReturnValue(true);
      mockClient._notify("flagValue");

      const values = await valuesPromise;
      expect(values).toEqual([false, true]);
    });

    it("should return cached observable for same key and fallback", () => {
      const obs1 = service.flagValue$("my-flag");
      const obs2 = service.flagValue$("my-flag");
      expect(obs1).toBe(obs2);
    });

    it("should return different observables for different keys", () => {
      const obs1 = service.flagValue$("flag-a");
      const obs2 = service.flagValue$("flag-b");
      expect(obs1).not.toBe(obs2);
    });

    it("should clean up listener on unsubscribe", () => {
      const sub = service.flagValue$("my-flag").subscribe();
      expect(mockClient._listeners.flagValue.size).toBe(1);
      sub.unsubscribe();
      expect(mockClient._listeners.flagValue.size).toBe(0);
    });
  });

  describe("entitlement$", () => {
    it("should emit a fallback check when no value is available", async () => {
      mockClient.getFlagCheck.mockReturnValue(undefined);
      const check = await firstValueFrom(service.entitlement$("my-flag"));
      expect(check).toEqual({
        flag: "my-flag",
        reason: "Fallback",
        value: false,
      });
    });

    it("should emit the current check value", async () => {
      const expected: CheckFlagReturn = {
        flag: "my-flag",
        reason: "plan_entitlement",
        value: true,
        featureAllocation: 100,
        featureUsage: 42,
      };
      mockClient.getFlagCheck.mockReturnValue(expected);
      const check = await firstValueFrom(service.entitlement$("my-flag"));
      expect(check).toBe(expected);
    });

    it("should emit updated checks when listener fires", async () => {
      const initial: CheckFlagReturn = {
        flag: "my-flag",
        reason: "default",
        value: false,
      };
      const updated: CheckFlagReturn = {
        flag: "my-flag",
        reason: "plan_entitlement",
        value: true,
      };

      mockClient.getFlagCheck.mockReturnValue(initial);

      const valuesPromise = firstValueFrom(
        service.entitlement$("my-flag").pipe(take(2), toArray()),
      );

      mockClient.getFlagCheck.mockReturnValue(updated);
      mockClient._notify("flagCheck");

      const values = await valuesPromise;
      expect(values).toEqual([initial, updated]);
    });

    it("should cache observables by key", () => {
      const obs1 = service.entitlement$("my-flag");
      const obs2 = service.entitlement$("my-flag");
      expect(obs1).toBe(obs2);
    });
  });

  describe("plan$", () => {
    it("should emit undefined when no plan is available", async () => {
      mockClient.getPlan.mockReturnValue(undefined);
      const plan = await firstValueFrom(service.plan$());
      expect(plan).toBeUndefined();
    });

    it("should emit the current plan", async () => {
      const expected: CheckPlanReturn = {
        id: "plan-1",
        name: "Pro",
      };
      mockClient.getPlan.mockReturnValue(expected);
      const plan = await firstValueFrom(service.plan$());
      expect(plan).toBe(expected);
    });

    it("should emit updated plans when listener fires", async () => {
      mockClient.getPlan.mockReturnValue(undefined);

      const valuesPromise = firstValueFrom(
        service.plan$().pipe(take(2), toArray()),
      );

      const newPlan: CheckPlanReturn = { id: "plan-1", name: "Pro" };
      mockClient.getPlan.mockReturnValue(newPlan);
      mockClient._notify("plan");

      const values = await valuesPromise;
      expect(values).toEqual([undefined, newPlan]);
    });

    it("should return cached observable", () => {
      const obs1 = service.plan$();
      const obs2 = service.plan$();
      expect(obs1).toBe(obs2);
    });
  });

  describe("creditBalance$", () => {
    it("should report isLoading until a balance is available", async () => {
      mockClient.getCreditBalance.mockReturnValue(undefined);
      mockClient.getIsPending.mockReturnValue(true);
      const result = await firstValueFrom(service.creditBalance$("credit-abc"));
      expect(result).toEqual({ balance: 0, isLoading: true });
    });

    it("should surface settled as the default headline balance", async () => {
      // Repro from SCH-6526: the streamed `remaining` froze at 0 mid-lease;
      // `settled` (spendable) is 3442 — the default the service returns.
      mockClient.getCreditBalance.mockReturnValue({
        remaining: 0,
        reserved: 3442,
        settled: 3442,
      });
      mockClient.getIsPending.mockReturnValue(false);
      const result = await firstValueFrom(service.creditBalance$("credit-abc"));
      expect(result).toEqual({ balance: 3442, isLoading: false });
    });

    it("should surface remaining/reserved when requested via type", async () => {
      mockClient.getCreditBalance.mockReturnValue({
        remaining: 0,
        reserved: 3442,
        settled: 3442,
      });
      mockClient.getIsPending.mockReturnValue(false);

      const remaining = await firstValueFrom(
        service.creditBalance$("credit-abc", "remaining"),
      );
      const reserved = await firstValueFrom(
        service.creditBalance$("credit-abc", "reserved"),
      );

      expect(remaining.balance).toBe(0);
      expect(reserved.balance).toBe(3442);
    });

    it("should emit updated balances when listener fires", async () => {
      mockClient.getCreditBalance.mockReturnValue(undefined);
      mockClient.getIsPending.mockReturnValue(false);

      const valuesPromise = firstValueFrom(
        service.creditBalance$("credit-abc").pipe(take(2), toArray()),
      );

      mockClient.getCreditBalance.mockReturnValue({
        remaining: 3442,
        reserved: 0,
        settled: 3442,
      });
      mockClient._notify("creditBalance");

      const values = await valuesPromise;
      expect(values).toEqual([
        { balance: 0, isLoading: false },
        { balance: 3442, isLoading: false },
      ]);
    });

    it("should return 0 (not loading) for an unknown credit once loaded", async () => {
      mockClient.getCreditBalance.mockReturnValue(undefined);
      mockClient.getIsPending.mockReturnValue(false);
      const result = await firstValueFrom(
        service.creditBalance$("credit-missing"),
      );
      expect(result).toEqual({ balance: 0, isLoading: false });
    });

    it("should cache observables by credit id and type", () => {
      const obs1 = service.creditBalance$("credit-abc");
      const obs2 = service.creditBalance$("credit-abc");
      expect(obs1).toBe(obs2);
    });

    it("should return different observables for different types", () => {
      const obs1 = service.creditBalance$("credit-abc", "settled");
      const obs2 = service.creditBalance$("credit-abc", "remaining");
      expect(obs1).not.toBe(obs2);
    });
  });

  describe("isPending$", () => {
    it("should emit the current pending state", async () => {
      mockClient.getIsPending.mockReturnValue(true);
      const pending = await firstValueFrom(service.isPending$());
      expect(pending).toBe(true);
    });

    it("should emit updated pending state when listener fires", async () => {
      mockClient.getIsPending.mockReturnValue(true);

      const valuesPromise = firstValueFrom(
        service.isPending$().pipe(take(2), toArray()),
      );

      mockClient.getIsPending.mockReturnValue(false);
      mockClient._notify("isPending");

      const values = await valuesPromise;
      expect(values).toEqual([true, false]);
    });

    it("should return cached observable", () => {
      const obs1 = service.isPending$();
      const obs2 = service.isPending$();
      expect(obs1).toBe(obs2);
    });
  });
});
