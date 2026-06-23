import { Injectable, inject } from "@angular/core";
import * as SchematicJS from "@schematichq/schematic-js";
import { Observable, distinctUntilChanged, finalize, shareReplay } from "rxjs";
import { SCHEMATIC_CLIENT } from "./token";

/** A company's credit balance for a single credit type, plus a loading flag */
export type SchematicCreditBalance = {
  /** The spendable balance; 0 while loading or when the company holds no balance in this credit */
  balance: number;
  /** True while the balance is still loading and no value has arrived yet */
  isLoading: boolean;
};

function shallowEqual<T extends Record<string, unknown>>(
  a: T | undefined,
  b: T | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    const valA = a[key];
    const valB = b[key];
    if (valA instanceof Date && valB instanceof Date) {
      return valA.getTime() === valB.getTime();
    }
    return valA === valB;
  });
}

@Injectable()
export class SchematicService {
  private client = inject(SCHEMATIC_CLIENT);

  private flagValueCache = new Map<string, Observable<boolean>>();
  private entitlementCache = new Map<
    string,
    Observable<SchematicJS.CheckFlagReturn>
  >();
  private creditBalanceCache = new Map<
    string,
    Observable<SchematicCreditBalance>
  >();
  private planCache?: Observable<SchematicJS.CheckPlanReturn | undefined>;
  private isPendingCache?: Observable<boolean>;

  getClient(): SchematicJS.Schematic {
    return this.client;
  }

  setContext(context: SchematicJS.SchematicContext): void {
    this.client.setContext(context);
  }

  identify(body: SchematicJS.EventBodyIdentify): void {
    this.client.identify(body);
  }

  track(body: SchematicJS.EventBodyTrack): void {
    this.client.track(body);
  }

  flagValue$(key: string, fallback: boolean = false): Observable<boolean> {
    const cacheKey = `${key}:${fallback}`;
    let cached = this.flagValueCache.get(cacheKey);
    if (cached) return cached;

    cached = new Observable<boolean>((subscriber) => {
      const current = this.client.getFlagValue(key);
      subscriber.next(current ?? fallback);

      const unsubscribe = this.client.addFlagValueListener(key, () => {
        const value = this.client.getFlagValue(key);
        subscriber.next(value ?? fallback);
      });

      return () => unsubscribe();
    }).pipe(
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.flagValueCache.delete(cacheKey)),
    );

    this.flagValueCache.set(cacheKey, cached);
    return cached;
  }

  entitlement$(
    key: string,
    fallback: boolean = false,
  ): Observable<SchematicJS.CheckFlagReturn> {
    const cacheKey = `${key}:${fallback}`;
    let cached = this.entitlementCache.get(cacheKey);
    if (cached) return cached;

    const fallbackCheck: SchematicJS.CheckFlagReturn = {
      flag: key,
      reason: "Fallback",
      value: fallback,
    };

    cached = new Observable<SchematicJS.CheckFlagReturn>((subscriber) => {
      const current = this.client.getFlagCheck(key);
      subscriber.next(current ?? fallbackCheck);

      const unsubscribe = this.client.addFlagCheckListener(key, () => {
        const check = this.client.getFlagCheck(key);
        subscriber.next(check ?? fallbackCheck);
      });

      return () => unsubscribe();
    }).pipe(
      distinctUntilChanged(shallowEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.entitlementCache.delete(cacheKey)),
    );

    this.entitlementCache.set(cacheKey, cached);
    return cached;
  }

  plan$(): Observable<SchematicJS.CheckPlanReturn | undefined> {
    if (this.planCache) return this.planCache;

    this.planCache = new Observable<SchematicJS.CheckPlanReturn | undefined>(
      (subscriber) => {
        subscriber.next(this.client.getPlan());

        const unsubscribe = this.client.addPlanListener(() => {
          subscriber.next(this.client.getPlan());
        });

        return () => unsubscribe();
      },
    ).pipe(
      distinctUntilChanged(shallowEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.planCache = undefined;
      }),
    );

    return this.planCache;
  }

  /**
   * Observe a company's live, lease-aware credit balance for a single credit type.
   *
   * Surfaces the spendable `settled` balance, sourced from the streamed credit
   * balances map (keyed by credit ID). It emits as partials arrive over the
   * DataStream, so it stays accurate during an open lease — when the raw
   * `remaining` would otherwise read stale / falsely "exhausted".
   *
   * The credit ID is available on a feature's entitlement: `entitlement$(key)`
   * emits `creditId` for credit-based features.
   */
  creditBalance$(creditId: string): Observable<SchematicCreditBalance> {
    let cached = this.creditBalanceCache.get(creditId);
    if (cached) return cached;

    cached = new Observable<SchematicCreditBalance>((subscriber) => {
      const emit = () => {
        const balance = this.client.getCreditBalance(creditId);
        subscriber.next({
          balance: balance?.settled ?? 0,
          isLoading: balance === undefined && this.client.getIsPending(),
        });
      };

      emit();

      const unsubscribeBalance = this.client.addCreditBalanceListener(() =>
        emit(),
      );
      const unsubscribePending = this.client.addIsPendingListener(() => emit());

      return () => {
        unsubscribeBalance();
        unsubscribePending();
      };
    }).pipe(
      distinctUntilChanged(shallowEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.creditBalanceCache.delete(creditId)),
    );

    this.creditBalanceCache.set(creditId, cached);
    return cached;
  }

  isPending$(): Observable<boolean> {
    if (this.isPendingCache) return this.isPendingCache;

    this.isPendingCache = new Observable<boolean>((subscriber) => {
      subscriber.next(this.client.getIsPending());

      const unsubscribe = this.client.addIsPendingListener(() => {
        subscriber.next(this.client.getIsPending());
      });

      return () => unsubscribe();
    }).pipe(
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.isPendingCache = undefined;
      }),
    );

    return this.isPendingCache;
  }
}
