import { version } from "../version";
import {
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
} from "./checkoutexternal";
import {
  AccountsApi,
  ComponentspublicApi,
  Configuration as PublicConfiguration,
  EventsApi,
  FeaturesApi,
} from "./componentspublic";
import { QueryStore } from "./queryStore";
import { TokenManager, type AccessTokenInput } from "./tokenManager";

export interface SchematicApiConfig {
  /** Override the API base URL (defaults to https://api.schematichq.com) */
  basePath?: string;
  /** Extra headers sent on every request */
  headers?: Record<string, string>;
  /** Override the fetch implementation */
  fetchApi?: typeof fetch;
}

export interface SchematicApiOptions {
  /**
   * Publishable key (api_...) authenticating the public surface. Optional;
   * public API calls reject with a setup error when omitted.
   */
  publishableKey?: string;
  /**
   * Temporary access token (token_...) or async resolver for one,
   * authenticating the checkout surface. Optional; checkout API calls reject
   * with a setup error when omitted.
   */
  accessToken?: AccessTokenInput;
  apiConfig?: SchematicApiConfig;
  /** X-Schematic-Client-Version header value (defaults to schematic-js@<version>) */
  clientVersion?: string;
  /** Reuse an existing QueryStore so cached data survives client rebuilds (e.g. token changes) */
  queryStore?: QueryStore;
}

/** APIs authenticated by the publishable key; usable without any user/company context */
export interface SchematicPublicApi {
  plans: ComponentspublicApi;
  accounts: AccountsApi;
  events: EventsApi;
  features: FeaturesApi;
}

export interface SchematicApi {
  /** Publishable-key surface: public plans, whoami, flag checks, events */
  public: SchematicPublicApi;
  /** Temporary-access-token surface: hydrate, checkout, payment methods, invoices */
  checkout: CheckoutexternalApi;
  /** Present when an accessToken was configured */
  tokenManager?: TokenManager;
  queryStore: QueryStore;
}

/**
 * Builds configured API clients grouped by the credential they require. The
 * checkout client is always present; without an accessToken its calls reject
 * with a descriptive error rather than reaching the network.
 */
export const createSchematicApi = (
  options: SchematicApiOptions,
): SchematicApi => {
  const headers = {
    "X-Schematic-Client-Version":
      options.clientVersion ?? `schematic-js@${version}`,
    ...options.apiConfig?.headers,
  };
  const shared = {
    basePath: options.apiConfig?.basePath,
    fetchApi: options.apiConfig?.fetchApi,
    headers,
  };

  const publicConfiguration = new PublicConfiguration({
    ...shared,
    apiKey:
      options.publishableKey !== undefined
        ? options.publishableKey
        : () => {
            throw new Error(
              "Schematic: no publishableKey was configured; provide `publishableKey` to enable the public APIs.",
            );
          },
  });

  const tokenManager =
    options.accessToken !== undefined
      ? new TokenManager(options.accessToken)
      : undefined;
  const checkoutConfiguration = new CheckoutConfiguration({
    ...shared,
    apiKey:
      tokenManager !== undefined
        ? () => tokenManager.getToken()
        : () => {
            throw new Error(
              "Schematic: no accessToken was configured. Checkout APIs require a temporary access token minted by your backend; provide `accessToken` (a token string or an async resolver) to enable them.",
            );
          },
  });

  let checkout = new CheckoutexternalApi(checkoutConfiguration);
  if (tokenManager !== undefined) {
    checkout = checkout.withMiddleware(tokenManager.middleware());
  }

  return {
    public: {
      plans: new ComponentspublicApi(publicConfiguration),
      accounts: new AccountsApi(publicConfiguration),
      events: new EventsApi(publicConfiguration),
      features: new FeaturesApi(publicConfiguration),
    },
    checkout,
    tokenManager,
    queryStore: options.queryStore ?? new QueryStore(),
  };
};
