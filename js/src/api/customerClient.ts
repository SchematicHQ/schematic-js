import { version } from "../version";
import {
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
  type ComponentHydrateResponseData,
  type InvoiceResponseData,
} from "./checkoutexternal";
import {
  AccountsApi,
  ComponentspublicApi,
  Configuration as PublicConfiguration,
  EventsApi,
  FeaturesApi,
  type PublicPlansResponseData,
} from "./componentspublic";
import { Resource, type ResourceOptions } from "./resource";
import { TokenManager, type AccessTokenInput } from "./tokenManager";

const DEFAULT_API_URL = "https://api.schematichq.com";

/** Raw generated API clients, grouped by the credential they require. */
export interface SchematicCustomerApi {
  /** Publishable-key surface: public plans, whoami, flag checks, events */
  public: {
    plans: ComponentspublicApi;
    accounts: AccountsApi;
    events: EventsApi;
    features: FeaturesApi;
  };
  /** Temporary-access-token surface: hydrate, checkout, payment methods, invoices */
  checkout: CheckoutexternalApi;
}

export interface SchematicCustomerClientOptions {
  /** Base URL of the Schematic API. Defaults to the production API. */
  apiUrl?: string;
  /** Publishable key (api_...). Enables the public surface (e.g. GET /public/plans). */
  publishableKey?: string;
  /**
   * Temporary access token (token_...) or async provider for one, minted by
   * your backend via POST /temporary-access-tokens. Enables all
   * company-scoped data (hydrate, invoices, checkout). Provide
   * { token, expiresAt } from a provider for exact refresh timing.
   */
  getAccessToken?: AccessTokenInput;
  /** Optional catalog to hydrate (GET /components/hydrate?catalog_id=...). */
  catalogId?: string;
  /** Refresh the access token this long before expiry. Default 60s. */
  refreshBufferMs?: number;
  /**
   * How long a fetched result is served before a mounting hook revalidates
   * it. Default 30s; 0 revalidates on every mount.
   */
  staleTime?: number;
  /** Injectable fetch implementation (tests, SSR). Default globalThis.fetch. */
  fetchFn?: typeof fetch;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** X-Schematic-Client-Version header value (defaults to schematic-js@<version>) */
  clientVersion?: string;
}

/**
 * The customer-scoped Schematic client: owns auth and cached data fetching
 * for everything Schematic exposes to an end customer under the two
 * browser-safe credentials (publishable key; per-company temporary access
 * token). Create one instance per app; hooks subscribe to its resources, so
 * any number of mounted consumers share a single request per endpoint.
 * Construction is side-effect free: nothing is fetched until a resource's
 * ensure()/refetch() is called (e.g. a hook mounting).
 */
export class SchematicCustomerClient {
  readonly hasPublishableMode: boolean;
  /** Raw generated API clients for calls the resource layer doesn't cover. */
  readonly api: SchematicCustomerApi;

  private tokens?: TokenManager;
  /** Incremented per setAccessToken call, so a slow swap cannot undo a newer one */
  private accessTokenSwap = 0;
  private readonly refreshBufferMs?: number;
  private readonly catalogId?: string;
  private readonly resourceOptions: ResourceOptions;

  private hydrateResource?: Resource<ComponentHydrateResponseData>;
  private publicPlansResource?: Resource<PublicPlansResponseData>;
  private readonly invoiceResources = new Map<
    string,
    Resource<InvoiceResponseData[]>
  >();
  private readonly keyedResources = new Map<string, Resource<unknown>>();

  constructor(options: SchematicCustomerClientOptions) {
    const { publishableKey, getAccessToken } = options;
    if (getAccessToken === "") {
      // Would otherwise create a static TokenManager that sends an empty
      // X-Schematic-Api-Key and 401s with no setup hint
      throw new Error(
        "SchematicCustomerClient: getAccessToken must not be an empty string; pass a token, a provider callback, or omit it.",
      );
    }
    if (
      (publishableKey === undefined || publishableKey === "") &&
      getAccessToken === undefined
    ) {
      throw new Error(
        "SchematicCustomerClient requires a publishableKey (public data), a getAccessToken callback (company data), or both.",
      );
    }

    const apiUrl = options.apiUrl ?? "";
    const basePath = (apiUrl === "" ? DEFAULT_API_URL : apiUrl).replace(
      /\/+$/,
      "",
    );
    const fetchFn =
      options.fetchFn ??
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    const headers = {
      "X-Schematic-Client-Version":
        options.clientVersion ?? `schematic-js@${version}`,
      ...options.headers,
    };
    this.catalogId = options.catalogId;
    this.refreshBufferMs = options.refreshBufferMs;
    this.resourceOptions = { staleTime: options.staleTime };
    this.hasPublishableMode =
      publishableKey !== undefined && publishableKey !== "";

    if (getAccessToken !== undefined) {
      this.tokens = new TokenManager(getAccessToken, {
        refreshBufferMs: options.refreshBufferMs,
      });
    }

    // Both configurations resolve credentials lazily through the client so
    // setAccessToken() swaps take effect without rebuilding the generated
    // clients; the middleware delegates to the current TokenManager the same
    // way.
    const checkoutConfiguration = new CheckoutConfiguration({
      basePath,
      fetchApi: fetchFn,
      headers,
      apiKey: () => {
        const tokens = this.tokens;
        if (tokens === undefined) {
          throw new Error(
            "Schematic: no getAccessToken was configured. Company-scoped APIs require a temporary access token minted by your backend; provide `getAccessToken` to SchematicCustomerClient.",
          );
        }
        return tokens.getToken();
      },
      middleware: [
        {
          post: async (context) => {
            const middleware = this.tokens?.middleware();
            return middleware?.post !== undefined
              ? middleware.post(context)
              : undefined;
          },
        },
      ],
    });
    const publicConfiguration = new PublicConfiguration({
      basePath,
      fetchApi: fetchFn,
      headers,
      apiKey:
        this.hasPublishableMode && publishableKey !== undefined
          ? publishableKey
          : () => {
              throw new Error(
                "Schematic: no publishableKey was configured; provide `publishableKey` to SchematicCustomerClient to enable the public APIs.",
              );
            },
    });

    this.api = {
      public: {
        plans: new ComponentspublicApi(publicConfiguration),
        accounts: new AccountsApi(publicConfiguration),
        events: new EventsApi(publicConfiguration),
        features: new FeaturesApi(publicConfiguration),
      },
      checkout: new CheckoutexternalApi(checkoutConfiguration),
    };
  }

  /** True when a getAccessToken input is configured (company data available). */
  get hasAccessTokenMode(): boolean {
    return this.tokens !== undefined;
  }

  /** Shared company-context resource (GET /components/hydrate). */
  get hydrate(): Resource<ComponentHydrateResponseData> {
    this.assertAccessTokenMode(
      "company data (useSubscription, company-mode useCatalog, useInvoices)",
    );
    this.hydrateResource ??= new Resource(async () => {
      const response = await this.api.checkout.hydrate(
        this.catalogId !== undefined ? { catalogId: this.catalogId } : {},
      );
      return response.data;
    }, this.resourceOptions);
    return this.hydrateResource;
  }

  /** Public catalog resource (GET /public/plans). */
  get publicPlans(): Resource<PublicPlansResponseData> {
    if (!this.hasPublishableMode) {
      throw new Error(
        "This SchematicCustomerClient has no publishableKey; the public catalog is unavailable.",
      );
    }
    this.publicPlansResource ??= new Resource(async () => {
      const response = await this.api.public.plans.getPublicPlans();
      return response.data;
    }, this.resourceOptions);
    return this.publicPlansResource;
  }

  /**
   * Invoice list resource (GET /components/invoices). One resource per
   * limit/offset combination, so hook subscriptions stay referentially
   * stable.
   */
  invoices(params?: {
    limit?: number;
    offset?: number;
  }): Resource<InvoiceResponseData[]> {
    this.assertAccessTokenMode("invoices");
    const key = `${params?.limit ?? ""}:${params?.offset ?? ""}`;
    let resource = this.invoiceResources.get(key);
    if (resource === undefined) {
      resource = new Resource(async () => {
        const response = await this.api.checkout.listInvoices({
          limit: params?.limit,
          offset: params?.offset,
        });
        return response.data;
      }, this.resourceOptions);
      this.invoiceResources.set(key, resource);
    }
    return resource;
  }

  /**
   * Escape-hatch registry for endpoints without a dedicated resource: returns
   * a memoized Resource per key, so any number of consumers share one cached
   * fetch. The first registration's fetcher wins for a given key — later
   * calls with the same key return the existing resource and ignore their
   * fetcher argument.
   */
  resource<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Pick<ResourceOptions, "staleTime">,
  ): Resource<T> {
    let resource = this.keyedResources.get(key);
    if (resource === undefined) {
      resource = new Resource(fetcher, {
        ...this.resourceOptions,
        ...options,
      }) as Resource<unknown>;
      this.keyedResources.set(key, resource);
    }
    return resource as Resource<T>;
  }

  /**
   * Mark all company-scoped data stale (e.g. after a checkout or
   * payment-method change). Mounted hooks refetch immediately; in-flight
   * responses issued before the change are discarded.
   */
  invalidate(): void {
    this.hydrateResource?.invalidate();
    for (const resource of this.invoiceResources.values()) {
      resource.invalidate();
    }
  }

  /**
   * Invalidate escape-hatch resources registered via resource(). No argument
   * invalidates all of them; a string invalidates every key equal to it or
   * starting with it.
   */
  invalidateResources(keyOrPrefix?: string): void {
    for (const [key, resource] of this.keyedResources) {
      if (keyOrPrefix !== undefined && !key.startsWith(keyOrPrefix)) {
        continue;
      }
      resource.invalidate();
    }
  }

  /**
   * Swap (or clear) the access token, e.g. when the active company changes.
   * When the credential actually changes, all company-scoped and escape-hatch
   * resources are reset: their data is dropped, in-flight responses under the
   * old credential are discarded, and subscribed consumers refetch under the
   * new one. When clearing, no refetch is triggered (it could only fail) —
   * note that hooks still mounted against company-scoped resources will then
   * report an error, so unmount them alongside (or before) clearing the token.
   *
   * A provider callback carries no identity worth comparing — a caller that
   * rebuilds the closure on every render (an inline `accessToken` prop) is not
   * announcing a company switch — so the new provider is resolved and cached
   * data is dropped only if the token it yields differs from the outgoing
   * one. Resetting on the callback's identity instead would wipe and refetch
   * every company-scoped resource on each re-render.
   */
  setAccessToken(input: AccessTokenInput | undefined): void {
    if (input === "") {
      throw new Error(
        "SchematicCustomerClient: accessToken must not be an empty string; pass a token, a provider callback, or undefined to clear.",
      );
    }

    const previous = this.tokens;
    // Guards the async comparison below against a later swap landing first
    const swap = ++this.accessTokenSwap;

    if (input === undefined) {
      this.tokens = undefined;
      this.resetCompanyScopedResources(false);
      return;
    }

    const previousToken = previous?.resolvedToken;
    this.tokens = new TokenManager(input, {
      refreshBufferMs: this.refreshBufferMs,
    });

    if (previous === undefined || previousToken === undefined) {
      // No outgoing credential to compare against; anything cached may have
      // been fetched under different auth, so it cannot be trusted
      this.resetCompanyScopedResources(true);
      return;
    }

    if (typeof input === "string") {
      if (input !== previousToken) {
        this.resetCompanyScopedResources(true);
      }
      return;
    }

    void this.tokens.getToken().then(
      (token) => {
        if (swap === this.accessTokenSwap && token !== previousToken) {
          this.resetCompanyScopedResources(true);
        }
      },
      () => {
        // The new provider failed; the cached data cannot be shown to be
        // valid under it, so drop it and let subscribers surface the error
        if (swap === this.accessTokenSwap) {
          this.resetCompanyScopedResources(true);
        }
      },
    );
  }

  private resetCompanyScopedResources(refetch: boolean): void {
    this.hydrateResource?.reset({ refetch });
    for (const resource of this.invoiceResources.values()) {
      resource.reset({ refetch });
    }
    // Escape-hatch fetchers may capture the checkout client, so reset them
    // too rather than risk cross-company data surviving the swap
    for (const resource of this.keyedResources.values()) {
      resource.reset({ refetch });
    }
  }

  private assertAccessTokenMode(what: string): void {
    if (this.tokens === undefined) {
      throw new Error(
        `This SchematicCustomerClient has no getAccessToken callback; ${what} is unavailable.`,
      );
    }
  }
}
