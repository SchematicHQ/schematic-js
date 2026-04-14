import { Injectable, Signal, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import * as SchematicJS from "@schematichq/schematic-js";
import { Observable, distinctUntilChanged, shareReplay } from "rxjs";

import { SCHEMATIC_CLIENT } from "./token";

@Injectable()
export class SchematicService {
  private client = inject(SCHEMATIC_CLIENT);

  private flagValueCache = new Map<string, Observable<boolean>>();
  private flagCheckCache = new Map<
    string,
    Observable<SchematicJS.CheckFlagReturn>
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
    }).pipe(distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: true }));

    this.flagValueCache.set(cacheKey, cached);
    return cached;
  }

  flagCheck$(
    key: string,
    fallback: boolean = false,
  ): Observable<SchematicJS.CheckFlagReturn> {
    const cacheKey = `${key}:${fallback}`;
    let cached = this.flagCheckCache.get(cacheKey);
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
      distinctUntilChanged(
        (a, b) =>
          a.flag === b.flag &&
          a.value === b.value &&
          a.reason === b.reason &&
          a.featureUsage === b.featureUsage &&
          a.featureAllocation === b.featureAllocation,
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.flagCheckCache.set(cacheKey, cached);
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
      distinctUntilChanged(
        (a, b) => a?.id === b?.id && a?.name === b?.name && a?.trialStatus === b?.trialStatus,
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.planCache;
  }

  isPending$(): Observable<boolean> {
    if (this.isPendingCache) return this.isPendingCache;

    this.isPendingCache = new Observable<boolean>((subscriber) => {
      subscriber.next(this.client.getIsPending());

      const unsubscribe = this.client.addIsPendingListener(() => {
        subscriber.next(this.client.getIsPending());
      });

      return () => unsubscribe();
    }).pipe(distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: true }));

    return this.isPendingCache;
  }

  flagValue(key: string, fallback: boolean = false): Signal<boolean> {
    return toSignal(this.flagValue$(key, fallback), { initialValue: fallback });
  }

  flagCheck(
    key: string,
    fallback: boolean = false,
  ): Signal<SchematicJS.CheckFlagReturn> {
    const fallbackCheck: SchematicJS.CheckFlagReturn = {
      flag: key,
      reason: "Fallback",
      value: fallback,
    };
    return toSignal(this.flagCheck$(key, fallback), {
      initialValue: fallbackCheck,
    });
  }

  plan(): Signal<SchematicJS.CheckPlanReturn | undefined> {
    return toSignal(this.plan$(), { initialValue: undefined });
  }

  isPending(): Signal<boolean> {
    return toSignal(this.isPending$(), { initialValue: true });
  }
}
