import { CheckFlagResponseDataFromJSON } from "./api/models/CheckFlagResponseData";
import { EventBodyFlagCheck } from "./api/models/EventBodyFlagCheck";

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
  /** If user keys were provided and matched a user, its ID */
  userId?: string;
  /** A boolean flag check result; for feature entitlements, this represents whether further consumption of the feature is permitted */
  value: boolean;
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

  /** Enable developer toolbar for testing flags (default: false) */
  developerToolbar?: boolean;
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

export const CheckFlagReturnFromJSON = (
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  json: any,
): CheckFlagReturn => {
  const {
    companyId,
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

  // OpenAPI types return undefined or null; simplify this so callers only have to deal with undefined, and also use enums
  return {
    featureUsageExceeded,
    companyId: companyId == null ? undefined : companyId,
    error: error == null ? undefined : error,
    featureAllocation:
      featureAllocation == null ? undefined : featureAllocation,
    featureUsage: featureUsage == null ? undefined : featureUsage,
    featureUsageEvent:
      featureUsageEvent === null ? undefined : featureUsageEvent,
    featureUsagePeriod:
      featureUsagePeriod == null
        ? undefined
        : (featureUsagePeriod as UsagePeriod),
    featureUsageResetAt:
      featureUsageResetAt == null ? undefined : featureUsageResetAt,
    flag,
    flagId: flagId == null ? undefined : flagId,
    reason,
    ruleId: ruleId == null ? undefined : ruleId,
    ruleType: ruleType == null ? undefined : (ruleType as RuleType),
    userId: userId == null ? undefined : userId,
    value,
  };
};

export type { EventBodyFlagCheck } from "./api/models/EventBodyFlagCheck";
export { EventBodyFlagCheckToJSON } from "./api/models/EventBodyFlagCheck";
export type { CheckFlagResponseData } from "./api/models/CheckFlagResponseData";
export { CheckFlagResponseFromJSON } from "./api/models/CheckFlagResponse";
export { CheckFlagsResponseFromJSON } from "./api/models/CheckFlagsResponse";
