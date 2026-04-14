import { Inject, Injectable } from "@angular/core";
import * as SchematicJS from "@schematichq/schematic-js";
import { Observable, shareReplay } from "rxjs";

import { SCHEMATIC_CLIENT } from "./provide";

@Injectable({ providedIn: "root" })
export class SchematicService {
  private flagValueCache = new Map<string, Observable<boolean>>();
  private flagCheckCache = new Map<
    string,
    Observable<SchematicJS.CheckFlagReturn>
  >();
  private planCache?: Observable<SchematicJS.CheckPlanReturn | undefined>;
  private isPendingCache?: Observable<boolean>;

  constructor(
    @Inject(SCHEMATIC_CLIENT) private client: SchematicJS.Schematic,
  ) {}

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
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

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
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

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
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

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
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    return this.isPendingCache;
  }
}
