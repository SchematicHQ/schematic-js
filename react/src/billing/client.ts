import {
  INVOICE_MAX_PAGE_SIZE,
  INVOICE_PAGE_SIZE,
  SINGLETON,
  sessionKey,
  type InvoicesResult,
  type SessionInput,
  type SessionStatus,
} from "@schematichq/schematic-js";

import type {
  BillingData,
  BillingProviderClient,
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  Invoice,
  InvoicePage,
  InvoiceQuery,
  PaymentMethod,
  SetupIntent,
  UpcomingInvoice,
} from "./contract";
import { DEFAULT_INVOICE_QUERY, normalizeInvoiceQuery } from "./contract";
import { KeyedResource, type Readiness } from "./store";

/**
 * What a session says about itself, from whichever side knows: the client
 * once a session is installed on it, or the provider's own statement before
 * that. Only the pair is compared, never the token.
 */
interface SessionClaim {
  status: SessionStatus;
  key: string | undefined;
}

function claimOf(client: BillingProviderClient): SessionClaim {
  return { status: client.sessionStatus, key: client.sessionKey };
}

function claimFrom(session: SessionInput): SessionClaim | undefined {
  if (session === undefined) {
    return undefined;
  }
  return session === null
    ? { status: "ended", key: undefined }
    : { status: "active", key: sessionKey(session) };
}

/**
 * Whether a prefetch belongs to the session in hand.
 *
 * A stamp that names another session is the case worth catching: rows
 * outlive the render that fetched them — a cached page, a tab that switched
 * company — and `fetchBillingData` stamps them so this can tell. An
 * unstamped prefetch is taken at face value, because a host handing one over
 * beside a session is saying it belongs to that session, and refusing it
 * would make `initialData` useless to anyone who fetched their own rows.
 *
 * A stamp that cannot be checked yet is neither: while the session is
 * pending, the rows are held rather than shown, and judged again when it
 * starts. Adopting them on trust would paint one company's invoices for
 * whoever the auth turns out to name.
 */
function judgeSeed(
  seedKey: string | undefined,
  claim: SessionClaim,
): "adopt" | "hold" | "drop" {
  if (claim.status === "ended") {
    return "drop";
  }
  if (seedKey === undefined) {
    return "adopt";
  }
  if (claim.status === "pending") {
    return "hold";
  }

  return seedKey === claim.key ? "adopt" : "drop";
}

const READINESS: Record<SessionStatus, Readiness> = {
  pending: "waiting",
  active: "ready",
  ended: "never",
};

export type {
  AccessToken,
  AccessTokenProvider,
  Session,
  SessionEvent,
  SessionInput,
  SessionStatus,
} from "@schematichq/schematic-js";
/**
 * Rows requested per invoices page, re-exported from schematic-js: this
 * package already depends on that one at runtime, and a page size the two
 * could disagree on is a page size that eventually does.
 */
export { INVOICE_PAGE_SIZE };

export interface BillingStoreOptions {
  pageSize?: number;
  /**
   * What the provider is about to install on the client, where it already
   * knows: the constructor reads the client's session, and a provider that
   * installs from an effect has not written it yet. Stated, it judges the
   * prefetch so a page whose session was known at render paints its rows at
   * render. `undefined` states nothing, and the client's own session stands.
   */
  session?: SessionInput;
}

/** A prefetch not yet judged; a resource it did not carry is absent. */
interface HeldSeed {
  key: string | undefined;
  invoices?: { params: InvoiceQuery; data: InvoicePage };
  /** `null` is a company with no next bill, and worth seeding. */
  upcomingInvoice?: UpcomingInvoice | null;
  paymentMethods?: PaymentMethod[];
}

/**
 * The store for one session: a `KeyedResource` per billing resource, built
 * over a `BillingProviderClient`. The session is the client's credential — the store
 * never sees a company or user id — and a credential change drops every
 * resource. Invoices, the upcoming invoice and the payment methods so far;
 * the rest join with their elements.
 *
 * Nothing loads before `connect()`: a store that is not listening for the
 * session would fetch under whatever the client held when a subscriber
 * arrived, and serve it across a switch it never heard about. The provider
 * connects after it has installed the session, so the first request goes
 * out under the right one.
 */
export class BillingStore {
  readonly invoices: KeyedResource<InvoicePage, InvoiceQuery>;
  readonly upcomingInvoice: KeyedResource<
    UpcomingInvoice | null,
    Record<string, never>
  >;
  readonly paymentMethods: KeyedResource<
    PaymentMethod[],
    Record<string, never>
  >;
  private readonly _pageSize: number;
  private _unsubscribe: (() => void) | undefined;
  private _connected = false;
  private _seeded = false;
  /** The session that prefetch was for, where it said. */
  private _seedKey: string | undefined;
  /** A stamped prefetch waiting for a session to check it against. */
  private _held: HeldSeed | undefined;

  constructor(
    private readonly _client: BillingProviderClient,
    initialData: BillingData = {},
    options: BillingStoreOptions = {},
  ) {
    this._pageSize = options.pageSize ?? INVOICE_PAGE_SIZE;
    // Waiting until connected; then a session still pending stays pending,
    // and one that has ended settles empty rather than recording the
    // client's refusal as an error.
    const readiness = (): Readiness =>
      this._connected ? READINESS[this._client.sessionStatus] : "waiting";
    // A refetch re-requests the loaded window, so a user who has paged
    // three deep does not collapse back to one page on invalidation.
    this.invoices = new KeyedResource(
      (query, current) =>
        this._reloadWindow(
          query,
          Math.max(this._pageSize, current?.invoices.length ?? 0),
        ),
      { readiness },
    );
    this.upcomingInvoice = new KeyedResource(
      () => this._client.fetchUpcomingInvoice(),
      { readiness },
    );
    this.paymentMethods = new KeyedResource(
      () => this._client.fetchPaymentMethods(),
      { readiness },
    );

    const held: HeldSeed = { key: initialData.sessionKey };
    if (initialData.invoices !== undefined) {
      held.invoices = {
        // Normalized the way the hook normalizes, or the caller asking for
        // it fetches the same page again.
        params: normalizeInvoiceQuery(
          initialData.params?.invoices ?? DEFAULT_INVOICE_QUERY,
        ),
        data: initialData.invoices,
      };
    }
    // `!== undefined`, not a truthiness check: `null` is the server's
    // answer, and seeding it is what spares the page a request whose
    // answer the prefetch already has.
    if (initialData.upcomingInvoice !== undefined) {
      held.upcomingInvoice = initialData.upcomingInvoice;
    }
    if (initialData.paymentMethods !== undefined) {
      held.paymentMethods = initialData.paymentMethods;
    }
    if (
      held.invoices !== undefined ||
      held.upcomingInvoice !== undefined ||
      held.paymentMethods !== undefined
    ) {
      this._held = held;
      this._settleSeed(claimFrom(options.session) ?? claimOf(this._client));
    }
  }

  /**
   * Not done in the constructor: the provider arms it from an effect, and
   * React runs an effect, its cleanup, then the effect again under
   * StrictMode. A subscription made once at construction is torn down by
   * that cleanup and never comes back, leaving the store deaf to every
   * session change for the rest of the page.
   *
   * Also what opens the store: subscribers who arrived first have been
   * waiting, and this is the moment the session is known to be installed.
   */
  connect(): () => void {
    this._unsubscribe?.();
    const unsubscribe = this._client.onSessionChange?.((event) => {
      if (event.type === "ended") {
        this._held = undefined;
        this._seeded = false;
        this.clearAll();
      } else if (event.type === "changed") {
        this._held = undefined;
        this._seeded = false;
        this.resetAll();
      } else {
        this._onStarted();
      }
    });
    this._unsubscribe = unsubscribe;
    if (!this._connected) {
      this._connected = true;
      this._settleSeed(claimOf(this._client));
      this.resumeAll();
    }
    return () => {
      unsubscribe?.();
      if (this._unsubscribe === unsubscribe) {
        this._unsubscribe = undefined;
      }
    };
  }

  private _onStarted(): void {
    const claim = claimOf(this._client);
    // A prefetch held for want of a session to check it against.
    this._settleSeed(claim);
    if (this._seeded && judgeSeed(this._seedKey, claim) !== "adopt") {
      // The rows already loaded name another session — a cached page, or
      // a second tab that switched. They are not this one's to serve.
      this._seeded = false;
      this.resetAll();
      return;
    }
    this._seeded = false;
    this.resumeAll();
  }

  /** Adopts, keeps holding, or drops the prefetch, by what `claim` says. */
  private _settleSeed(claim: SessionClaim): void {
    const held = this._held;
    if (held === undefined) {
      return;
    }
    const verdict = judgeSeed(held.key, claim);
    if (verdict === "hold") {
      return;
    }
    this._held = undefined;
    if (verdict === "adopt") {
      if (held.invoices !== undefined) {
        this.invoices.seed(held.invoices.params, held.invoices.data);
      }
      if (held.upcomingInvoice !== undefined) {
        this.upcomingInvoice.seed(SINGLETON, held.upcomingInvoice);
      }
      if (held.paymentMethods !== undefined) {
        this.paymentMethods.seed(SINGLETON, held.paymentMethods);
      }
      this._seedKey = held.key;
      this._seeded = true;
    }
  }

  resource<K extends BillingResourceName>(
    name: K,
  ): KeyedResource<BillingResources[K], BillingResourceParams[K]> {
    return this[name] as unknown as KeyedResource<
      BillingResources[K],
      BillingResourceParams[K]
    >;
  }

  /** Forgets every resource; subscribed ones reload, idle ones are dropped. */
  resetAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].resetAll();
    }
  }

  /** Forgets every resource and leaves them empty; nothing reloads. */
  clearAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].clearAll();
    }
  }

  /** Loads every resource that is subscribed and has nothing yet. */
  resumeAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].resumeAll();
    }
  }

  /** Reloads every resource that has been loaded, keeping its current data. */
  invalidateAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].invalidateAll();
    }
  }

  /**
   * Appends the next page to the invoices list for `query`, when there is
   * one. A failure records the error on the resource and keeps the rows
   * already fetched; the returned promise never rejects.
   */
  loadMoreInvoices(query: InvoiceQuery = DEFAULT_INVOICE_QUERY): Promise<void> {
    // Normalized the way `useInvoices` normalizes: this is public API, and a
    // caller spelling out a default would otherwise address a second, never
    // loaded resource and page nothing.
    const resource = this.invoices.get(normalizeInvoiceQuery(query));
    if (resource.snapshot.data?.hasMore !== true) {
      return Promise.resolve();
    }
    return resource.extend(async (current) => {
      const page = await this._fetchInvoices(
        normalizeInvoiceQuery(query),
        current.invoices.length,
        this._pageSize,
      );
      const invoices = [...current.invoices, ...page.invoices];
      return {
        invoices,
        count: page.count,
        // From the count the page came back with, not the one the list was
        // built on: an invoice finalized between the two requests changes
        // what is left to load. An empty page ends the list whatever the
        // count says — the rows and the count are two queries, and a count
        // that outruns the rows would otherwise leave `hasMore` true for
        // good, with every further page fetching nothing.
        hasMore: page.invoices.length > 0 && invoices.length < page.count,
      };
    });
  }

  /**
   * Makes the payment method `externalId` the company's default, then
   * reloads the list so it says so. Rejects with the client's error when
   * the write fails; a reload that fails afterwards lands on the list's
   * `error`, since the write itself went through.
   */
  async setDefaultPaymentMethod(externalId: string): Promise<void> {
    await this._client.updatePaymentMethod(externalId);
    await this._reloadPaymentMethods();
  }

  /** Removes the payment method `id`, then reloads the list. Rejects as `setDefaultPaymentMethod` does. */
  async removePaymentMethod(id: string): Promise<void> {
    await this._client.deletePaymentMethod(id);
    await this._reloadPaymentMethods();
  }

  /**
   * Mints a setup intent for adding a payment method. Nothing in the store
   * changes until the provider confirms it and the host reloads the list,
   * so this is a pass-through to the client.
   */
  createSetupIntent(): Promise<SetupIntent> {
    return this._client.createSetupIntent();
  }

  dispose(): void {
    this._unsubscribe?.();
  }

  /**
   * After a write. A list nobody has read is left alone: it loads fresh
   * when someone does. One that is loaded, or subscribed and waiting on a
   * failed load, is fetched again; `refetch` never rejects.
   */
  private async _reloadPaymentMethods(): Promise<void> {
    if (!this.paymentMethods.has(SINGLETON)) {
      return;
    }
    const resource = this.paymentMethods.get(SINGLETON);
    if (resource.snapshot.data !== undefined || resource.subscriberCount > 0) {
      await resource.refetch();
    }
  }

  /**
   * Re-reads the window already loaded, in as many requests as the API's
   * page cap needs. A window paged past that cap still comes back whole:
   * asking for it in one request would be a 400, and asking for only the
   * first page would drop the rest.
   */
  private async _reloadWindow(
    query: InvoiceQuery,
    window: number,
  ): Promise<InvoicePage> {
    const invoices: Invoice[] = [];
    let count = 0;
    while (invoices.length < window) {
      const page = await this._fetchInvoices(
        query,
        invoices.length,
        Math.min(INVOICE_MAX_PAGE_SIZE, window - invoices.length),
      );
      count = page.count;
      invoices.push(...page.invoices);
      // A history that shrank mid-walk ends it; otherwise an empty page
      // would leave the loop asking for the same offset forever.
      if (page.invoices.length === 0 || invoices.length >= count) {
        break;
      }
    }

    return {
      invoices,
      count,
      hasMore: invoices.length > 0 && invoices.length < count,
    };
  }

  /**
   * Returns what the server said and nothing more: whether there is more to
   * load depends on the whole window, which only the caller assembling it
   * knows — `_reloadWindow` across its requests, and `loadMoreInvoices`
   * across the rows already loaded.
   */
  private _fetchInvoices(
    query: InvoiceQuery,
    offset: number,
    limit: number,
  ): Promise<InvoicesResult> {
    return this._client.fetchInvoices({ ...query, limit, offset });
  }
}

export const RESOURCE_NAMES: readonly BillingResourceName[] = [
  "invoices",
  "upcomingInvoice",
  "paymentMethods",
];
