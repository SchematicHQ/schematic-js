/**
 * A persisted checkout's lifecycle on the client: the first write opens it,
 * every later one replaces the cart and re-prices it, and a finalize charges
 * it. The API has no notion of steps; a client sequences its own and hands
 * this the whole cart each time it changes.
 */

import type { BillingClient } from "./client";
import type {
  Checkout,
  CheckoutProblem,
  CheckoutResult,
  CheckoutSelections,
  CheckoutWrite,
} from "./contract";
import { CheckoutStatus, checkoutProblemsOf } from "./contract";
import type { SessionEvent } from "./session";
import { SchematicApiError } from "./session";

/** The calls a draft makes, so a test or a host's own client can stand in. */
export type CheckoutTransport = Pick<
  BillingClient,
  "createCheckout" | "getCheckout" | "updateCheckout" | "finalizeCheckout"
>;

export interface CheckoutDraftState {
  /** The checkout as the last write left it; `undefined` until the first. */
  checkout: Checkout | undefined;
  /**
   * What the server last found wrong: the priced checkout's problems, or the
   * list a refused finalize answered with.
   */
  problems: CheckoutProblem[];
  /** A write is in flight or waiting behind one. */
  isPricing: boolean;
  isFinalizing: boolean;
  /** The last write or finalize that failed other than on its problems. */
  error: Error | undefined;
  /** What the finalize charged, once it has. */
  result: CheckoutResult | undefined;
}

export interface CheckoutDraftOptions {
  /** Resume this checkout rather than opening one on the first write. */
  checkoutId?: string;
}

type Waiter = {
  resolve: (checkout: Checkout | undefined) => void;
  reject: (error: unknown) => void;
};

const INITIAL_STATE: CheckoutDraftState = {
  checkout: undefined,
  problems: [],
  isPricing: false,
  isFinalizing: false,
  error: undefined,
  result: undefined,
};

/**
 * One write at a time: each needs the version the last one answered with, so
 * two in flight would conflict with each other. A write asked for while one
 * is out waits, and a newer one replaces it — only the latest cart is worth
 * pricing, and everybody waiting on the replaced one is answered by it.
 */
export class CheckoutDraft {
  private readonly transport: CheckoutTransport;
  private readonly listeners = new Set<() => void>();

  private _state: CheckoutDraftState = INITIAL_STATE;
  private checkoutId: string | undefined;
  private version: number | undefined;
  private sessionId: string | undefined;
  /** Bumped by reset, so an answer for a discarded draft lands nowhere. */
  private generation = 0;
  private inFlight: Promise<void> | undefined;
  private queued:
    { selections: CheckoutSelections; waiters: Waiter[] } | undefined;

  constructor(
    transport: CheckoutTransport,
    options: CheckoutDraftOptions = {},
  ) {
    this.transport = transport;
    this.checkoutId = options.checkoutId;
  }

  /**
   * Starts over whenever the session changes to somebody else: another
   * reader's cart is not this one's to finalize. Returns the unsubscribe.
   */
  watchSession(onSessionChange: BillingClient["onSessionChange"]): () => void {
    return onSessionChange((event: SessionEvent) => {
      if (event.type !== "started") {
        this.reset();
      }
    });
  }

  get state(): CheckoutDraftState {
    return this._state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reads the checkout this draft was opened on, for a resume. A draft with
   * no checkout yet has nothing to read.
   */
  load(): Promise<Checkout | undefined> {
    return this.refresh(this.generation);
  }

  /**
   * Replaces the cart and re-prices it. Resolves with the checkout the write
   * that carried this cart left — a later cart's, when a newer call replaced
   * it before it was sent — or `undefined` when the draft was reset first.
   */
  setSelections(selections: CheckoutSelections): Promise<Checkout | undefined> {
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };
      if (this.queued === undefined) {
        this.queued = { selections, waiters: [waiter] };
      } else {
        this.queued = {
          selections,
          waiters: [...this.queued.waiters, waiter],
        };
      }
      this.update({ isPricing: true });
      this.pump();
    });
  }

  /**
   * Charges the checkout at the version the last write left, once every
   * write asked for has landed. A refusal on the cart's problems puts them on
   * the state and rejects; so does anything else.
   */
  async finalize(): Promise<CheckoutResult> {
    const generation = this.generation;
    await this.settled();
    if (generation !== this.generation) {
      throw new Error("The checkout was reset before it was finalized.");
    }
    if (this.checkoutId === undefined || this.version === undefined) {
      throw new Error("There is no checkout to finalize yet.");
    }

    this.update({ isFinalizing: true, error: undefined });
    try {
      const result = await this.finalizeOnce(generation, true);
      if (generation === this.generation) {
        this.update({ isFinalizing: false, result });
      }
      return result;
    } catch (error) {
      if (generation === this.generation) {
        const problems = checkoutProblemsOf(error);
        if (problems !== undefined) {
          // The refused finalize claimed a version and wrote the problems
          // back; read it so the next write names the right one.
          await this.refresh(generation).catch(() => undefined);
          this.update({ isFinalizing: false, problems });
        } else {
          this.update({ isFinalizing: false, error: asError(error) });
        }
      }
      throw error;
    }
  }

  /** Drops the checkout; the next write opens a new one. */
  reset(): void {
    this.generation++;
    this.checkoutId = undefined;
    this.version = undefined;
    this.sessionId = undefined;
    const queued = this.queued;
    this.queued = undefined;
    this.inFlight = undefined;
    queued?.waiters.forEach((w) => w.resolve(undefined));
    this.update({ ...INITIAL_STATE });
  }

  /** Resolves once nothing is in flight or queued. */
  private async settled(): Promise<void> {
    while (this.inFlight !== undefined || this.queued !== undefined) {
      if (this.inFlight === undefined) {
        this.pump();
      }
      await this.inFlight?.catch(() => undefined);
    }
  }

  private pump(): void {
    if (this.inFlight !== undefined || this.queued === undefined) {
      return;
    }
    const { selections, waiters } = this.queued;
    this.queued = undefined;
    const generation = this.generation;
    const run = this.write(generation, selections).then(
      (checkout) => {
        if (generation !== this.generation) {
          waiters.forEach((w) => w.resolve(undefined));
          return;
        }
        waiters.forEach((w) => w.resolve(checkout));
      },
      (error: unknown) => {
        if (generation !== this.generation) {
          waiters.forEach((w) => w.resolve(undefined));
          return;
        }
        this.update({ error: asError(error) });
        waiters.forEach((w) => w.reject(error));
      },
    );
    this.inFlight = run.finally(() => {
      if (generation !== this.generation) {
        return;
      }
      this.inFlight = undefined;
      if (this.queued === undefined) {
        this.update({ isPricing: false });
      } else {
        this.pump();
      }
    });
  }

  private async write(
    generation: number,
    selections: CheckoutSelections,
  ): Promise<Checkout> {
    let written: CheckoutWrite;
    if (this.checkoutId === undefined || this.version === undefined) {
      written = await this.transport.createCheckout(selections);
    } else {
      written = await this.updateWithReplay(generation, selections);
    }
    if (generation === this.generation) {
      if (written.sessionId !== undefined) {
        this.sessionId = written.sessionId;
      }
      this.adopt(written.checkout);
      this.update({ error: undefined });
    }
    return written.checkout;
  }

  /**
   * A 409 is either another writer's version or a checkout that is no longer
   * open. Read it once to tell: a stale version is replayed on the current
   * one, and a checkout that expired or completed is replaced by a new one
   * with the same cart. A second conflict is somebody else's and surfaces.
   */
  private async updateWithReplay(
    generation: number,
    selections: CheckoutSelections,
  ): Promise<CheckoutWrite> {
    const id = this.checkoutId as string;
    try {
      return await this.transport.updateCheckout(
        id,
        this.version as number,
        selections,
      );
    } catch (error) {
      if (!isConflict(error) || generation !== this.generation) {
        throw error;
      }
      const current = await this.transport.getCheckout(id);
      if (generation !== this.generation) {
        throw error;
      }
      if (current.status !== CheckoutStatus.Open) {
        return this.transport.createCheckout(selections);
      }
      this.version = current.version;
      return this.transport.updateCheckout(id, current.version, selections);
    }
  }

  private async finalizeOnce(
    generation: number,
    replay: boolean,
  ): Promise<CheckoutResult> {
    try {
      return await this.transport.finalizeCheckout(
        this.checkoutId as string,
        this.version as number,
        this.sessionId === undefined ? {} : { sessionId: this.sessionId },
      );
    } catch (error) {
      if (!replay || !isConflict(error) || generation !== this.generation) {
        throw error;
      }
      // A stale version is replayed once. A checkout that is no longer open
      // — superseded by another purchase, expired, already completed — is
      // not this client's to finalize again, and the conflict stands.
      const current = await this.refresh(generation);
      if (current?.status !== CheckoutStatus.Open) {
        throw error;
      }
      return this.finalizeOnce(generation, false);
    }
  }

  private async refresh(generation: number): Promise<Checkout | undefined> {
    if (this.checkoutId === undefined) {
      return undefined;
    }
    const current = await this.transport.getCheckout(this.checkoutId);
    if (generation === this.generation) {
      this.adopt(current);
    }
    return current;
  }

  private adopt(checkout: Checkout): void {
    this.checkoutId = checkout.id;
    this.version = checkout.version;
    this.update({ checkout, problems: checkout.problems });
  }

  private update(patch: Partial<CheckoutDraftState>): void {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}

function isConflict(error: unknown): boolean {
  return error instanceof SchematicApiError && error.status === 409;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
