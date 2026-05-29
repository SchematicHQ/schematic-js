import {
  CheckFlagResponseDataFromJSON,
  DatastreamCompanyPlanFromJSON,
} from "./api/models";
import { EventBodyFlagCheck } from "./api/models/EventBodyFlagCheck";
import { type TrialStatus } from "./api/models/TrialStatus";

export type EventType = "identify" | "track" | "flag_check";

/** A record of unique key-value pairs used for identifying a company or user */
export type Keys = Record<string, string>;

/**
 * A flexible key/value type that can store any type of value on a company or user.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Traits = Record<string, any>;

/** Context for checking flags and sending events */
export type SchematicContext = {
  company?: Keys;
  user?: Keys;
};

export type EventBodyIdentify = {
  company?: {
    keys?: Keys;
    name?: string;
    traits?: Traits;
  };
  keys?: Keys;
  name?: string;
  traits?: Traits;
};

export type EventBodyTrack = SchematicContext & {
  event: string;
  quantity?: number;
  traits?: Traits;
};

export type EventBody = EventBodyIdentify | EventBodyTrack | EventBodyFlagCheck;

export type Event = {
  api_key: string;
  body: EventBody;
  sent_at: string;
  tracker_event_id: string;
  tracker_user_id: string;
  type: EventType;
  // Retry metadata (optional for backwards compatibility)
  retry_count?: number;
  next_retry_at?: number;
};

export enum RuleType {
  /** A global rule that, if present, will override all other rules for a flag */
  GLOBAL_OVERRIDE = "global_override",
  /** Rule type indicating feature access provisioned to a company via an override */
  COMPANY_OVERRIDE = "company_override",
  /** Rule type indicating that feature access has been provisione to a company via an override, but the usage limit has been reached or exceeded */
  COMPANY_OVERRIDE_USAGE_EXCEEDED = "company_override_usage_exceeded",
  /** Rule type indicating feature access provisioned to a company via its base plan or add-ons */
  PLAN_ENTITLEMENT = "plan_entitlement",
  /** Rule type indicating that feature access has been provisione to a company via base plan or add-ons, but the usage limit has been reached or exceeded */
  PLAN_ENTITLEMENT_USAGE_EXCEEDED = "plan_entitlement_usage_exceeded",
  /** General-purpose targeting rule */
  STANDARD = "standard",
  /** Default rule type that will be used if no other rules are matched */
  DEFAULT = "default",
}

export enum UsagePeriod {
  ALL_TIME = "all_time",
  CURRENT_DAY = "current_day",
  CURRENT_MONTH = "current_month",
  CURRENT_WEEK = "current_week",
}

export type CheckFlagReturn = {
  /** The company has access to the feature, but has exceeded the usage limit */
  featureUsageExceeded?: boolean;
  /** If company keys were provided and matched a company, its ID */
  companyId?: string;
  /** If the company has a credit-based entitlement for this feature, the remaining credit amount */
  creditRemaining?: number;
  /** If an error occurred while checking the flag, the error message */
  error?: string;
  /** If a numeric feature entitlement rule was matched, its allocation */
  featureAllocation?: number;
  /** If a numeric feature entitlement rule was matched, the company's usage */
  featureUsage?: number;
  /** Event representing the feature usage */
  featureUsageEvent?: string;
  /** For event-based feature entitlement rules, the period over which usage is tracked (current_month, current_day, current_week, all_time) */
  featureUsagePeriod?: UsagePeriod;
  /** For event-based feature entitlement rules, when the usage period will reset */
  featureUsageResetAt?: Date;
  /** The key used to check the flag */
  flag: string;
  /** If a flag was found, its ID */
  flagId?: string;
  /** A human-readable explanation of the result */
  reason: string;
  /** If a rule was found, its ID */
  ruleId?: string;
  /** If a rule was found, its type  */
  ruleType?: RuleType;
  /** For usage-based pricing, the soft limit for overage charges or the next tier boundary */
  softLimit?: number;
  /** If user keys were provided and matched a user, its ID */
  userId?: string;
  /** A boolean flag check result; for feature entitlements, this represents whether further consumption of the feature is permitted */
  value: boolean;
};

export type CheckPlanReturn = {
  id: string;
  name: string;
  trialEndDate?: Date;
  trialStatus?: TrialStatus;
};

/** Optional type for implementing custom client-side storage */
export type StoragePersister = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setItem(key: string, value: any): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  getItem(key: string): any;
  removeItem(key: string): void;
};

export type SchematicOptions = {
  /** Optionally provide any additional headers to include in the request */
  additionalHeaders?: Record<string, string>;

  /** Optionally provide a custom API URL */
  apiUrl?: string;

  /** Enable debug mode to log flag check results and events to the console.
   * Can also be enabled at runtime via URL query parameter "schematic_debug=true" */
  debug?: boolean;

  /** Optionally provide a custom event URL */
  eventUrl?: string;

  /** Enable offline mode to prevent all network requests.
   * When enabled, events are only logged not sent, and flag checks return fallback values.
   * Can also be enabled at runtime via URL query parameter "schematic_offline=true" */
  offline?: boolean;

  /** Optionally provide a custom storage persister for client-side storage */
  storage?: StoragePersister;

  /** Persist flag check results (and plan) keyed by context to the storage persister so subsequent page loads can boot with last-known values rather than fallbacks. Defaults to true; set false to disable.
   *
   * When a cache hit is found on `setContext`, `isPending` flips to false synchronously even if the cache only contains a subset of the flags the app subscribes to — uncached flags will resolve via configured fallbacks (`flagCheckDefaults`/`flagValueDefaults`) until the WebSocket reconciles. */
  persistFlagState?: boolean;

  /** Maximum age (ms) of a persisted cache entry before it is treated as stale on hydration. Per-context; older entries are dropped at construction time and on the next persist. Defaults to 7 days. */
  flagStateCacheMaxAgeMs?: number;

  /** Use a WebSocket connection for real-time flag checks; if using this, run the cleanup function to close the connection */
  useWebSocket?: boolean;

  /** Optionally provide a custom WebSocket URL */
  webSocketUrl?: string;

  /** WebSocket connection timeout in milliseconds (default: 10000) */
  webSocketConnectionTimeout?: number;

  /** Enable automatic reconnection on WebSocket disconnect (default: true) */
  webSocketReconnect?: boolean;

  /** Maximum number of reconnection attempts (default: 7, set to Infinity for unlimited) */
  webSocketMaxReconnectAttempts?: number;

  /** Initial retry delay in milliseconds for exponential backoff (default: 1000) */
  webSocketInitialRetryDelay?: number;

  /** Maximum retry delay in milliseconds for exponential backoff (default: 30000) */
  webSocketMaxRetryDelay?: number;

  /** Maximum number of events to queue for retry when network is down (default: 100) */
  maxEventQueueSize?: number;

  /** Maximum number of retry attempts for failed events (default: 5) */
  maxEventRetries?: number;

  /** Initial retry delay in milliseconds for failed events (default: 1000) */
  eventRetryInitialDelay?: number;

  /** Maximum retry delay in milliseconds for failed events (default: 30000) */
  eventRetryMaxDelay?: number;

  /** Default boolean values for flags when Schematic API cannot be reached and no callsite fallback is provided */
  flagValueDefaults?: Record<string, boolean>;

  /** Default CheckFlagReturn objects for flags when Schematic API cannot be reached and no callsite fallback is provided */
  flagCheckDefaults?: Record<string, CheckFlagReturn>;
};

export type CheckOptions = {
  context?: SchematicContext;
  fallback?: boolean;
  key: string;
};

export type BooleanListenerFn = (value: boolean) => void;
export type EmptyListenerFn = () => void;
export type FlagCheckListenerFn = CheckFlagReturnListenerFn | EmptyListenerFn;
export type FlagValueListenerFn = BooleanListenerFn | EmptyListenerFn;
export type PendingListenerFn = BooleanListenerFn | EmptyListenerFn;
export type CheckFlagReturnListenerFn = (value: CheckFlagReturn) => void;
export type CheckPlanReturnListenerFn = (value: CheckPlanReturn) => void;
export type PlanListenerFn = CheckPlanReturnListenerFn | EmptyListenerFn;

export const CheckFlagReturnFromJSON = (
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  json: any,
): CheckFlagReturn => {
  const {
    companyId,
    entitlement,
    error,
    featureAllocation,
    featureUsage,
    featureUsageEvent,
    featureUsagePeriod,
    featureUsageResetAt,
    flag,
    flagId,
    reason,
    ruleId,
    ruleType,
    userId,
    value,
  } = CheckFlagResponseDataFromJSON(json);

  const featureUsageExceeded =
    !value && // if flag is not false, then we haven't exceeded usage
    (ruleType == RuleType.COMPANY_OVERRIDE_USAGE_EXCEEDED || // if the rule type is one of these, then we have exceeded usage
      ruleType == RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED);

  // Prefer entitlement object fields over deprecated flat fields
  const resolvedAllocation = entitlement?.allocation ?? featureAllocation;
  const resolvedUsage = entitlement?.usage ?? featureUsage;
  const resolvedEvent = entitlement?.eventName ?? featureUsageEvent;
  const resolvedPeriod = entitlement?.metricPeriod ?? featureUsagePeriod;
  const resolvedResetAt = entitlement?.metricResetAt ?? featureUsageResetAt;

  // OpenAPI types return undefined or null; simplify this so callers only have to deal with undefined, and also use enums
  return {
    featureUsageExceeded,
    companyId: companyId == null ? undefined : companyId,
    creditRemaining:
      entitlement?.creditRemaining == null
        ? undefined
        : entitlement.creditRemaining,
    error: error == null ? undefined : error,
    featureAllocation:
      resolvedAllocation == null ? undefined : resolvedAllocation,
    featureUsage: resolvedUsage == null ? undefined : resolvedUsage,
    featureUsageEvent: resolvedEvent == null ? undefined : resolvedEvent,
    featureUsagePeriod:
      resolvedPeriod == null ? undefined : (resolvedPeriod as UsagePeriod),
    featureUsageResetAt:
      resolvedResetAt == null ? undefined : resolvedResetAt,
    flag,
    flagId: flagId == null ? undefined : flagId,
    reason,
    ruleId: ruleId == null ? undefined : ruleId,
    ruleType: ruleType == null ? undefined : (ruleType as RuleType),
    softLimit:
      entitlement?.softLimit == null ? undefined : entitlement.softLimit,
    userId: userId == null ? undefined : userId,
    value,
  };
};

export const CheckPlanReturnFromJSON = (
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  json: any,
): CheckPlanReturn => {
  const { id, name, trialEndDate, trialStatus } =
    DatastreamCompanyPlanFromJSON(json);

  // OpenAPI types return undefined or null; simplify this so callers only have to deal with undefined, and also use enums
  return {
    id,
    name,
    trialEndDate: trialEndDate == null ? undefined : trialEndDate,
    trialStatus: trialStatus == null ? undefined : trialStatus,
  };
};

export type { EventBodyFlagCheck } from "./api/models/EventBodyFlagCheck";
export { EventBodyFlagCheckToJSON } from "./api/models/EventBodyFlagCheck";
export type { CheckFlagResponseData } from "./api/models/CheckFlagResponseData";
export { CheckFlagResponseFromJSON } from "./api/models/CheckFlagResponse";
export { CheckFlagsResponseFromJSON } from "./api/models/CheckFlagsResponse";
export { DatastreamCompanyPlanFromJSON } from "./api/models/DatastreamCompanyPlan";
export { TrialStatus } from "./api/models/TrialStatus";
