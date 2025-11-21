import { v4 as uuidv4 } from "uuid";

import "cross-fetch/polyfill";
import {
  BooleanListenerFn,
  CheckFlagResponseData,
  CheckFlagResponseFromJSON,
  CheckFlagReturn,
  CheckFlagReturnFromJSON,
  CheckFlagReturnListenerFn,
  CheckFlagsResponseFromJSON,
  CheckOptions,
  EmptyListenerFn,
  Event,
  EventBody,
  EventBodyFlagCheck,
  EventBodyFlagCheckToJSON,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  FlagCheckListenerFn,
  FlagValueListenerFn,
  PendingListenerFn,
  SchematicContext,
  SchematicOptions,
  StoragePersister,
} from "./types";
import { contextString } from "./utils";
import { version } from "./version";

const anonymousIdKey = "schematicId";

/* @preserve */
export class Schematic {
  private additionalHeaders: Record<string, string> = {};
  private apiKey: string;
  private apiUrl = "https://api.schematichq.com";
  private conn: Promise<WebSocket> | null = null;
  private context: SchematicContext = {};
  private debugEnabled: boolean = false;
  private offlineEnabled: boolean = false;
  private offlineFlagChecksEnabled: boolean = false;
  private eventQueue: Event[];
  private contextDependentEventQueue: Event[];
  private eventUrl = "https://c.schematichq.com";
  private flagCheckListeners: Record<string, Set<FlagCheckListenerFn>> = {};
  private flagValueListeners: Record<string, Set<FlagValueListenerFn>> = {};
  private isPending: boolean = true;
  private isPendingListeners: Set<PendingListenerFn> = new Set();
  private storage: StoragePersister | undefined;
  private useWebSocket: boolean = false;
  private checks: Record<
    string,
    Record<string, CheckFlagReturn | undefined> | undefined
  > = {};
  private featureUsageEventMap: Record<
    string,
    Record<string, CheckFlagReturn | undefined> | undefined
  > = {};
  private webSocketUrl = "wss://api.schematichq.com";
  private webSocketConnectionTimeout = 10000;
  private webSocketReconnect = true;
  private webSocketMaxReconnectAttempts = 7;
  private webSocketInitialRetryDelay = 1000;
  private webSocketMaxRetryDelay = 30000;
  private wsReconnectAttempts = 0;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsIntentionalDisconnect = false;
  private maxEventQueueSize = 100; // Prevent memory issues with very long network outages
  private maxEventRetries = 5; // Maximum retry attempts for failed events
  private eventRetryInitialDelay = 1000; // Initial retry delay in ms
  private eventRetryMaxDelay = 30000; // Maximum retry delay in ms
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private flagValueDefaults: Record<string, boolean> = {};
  private flagCheckDefaults: Record<string, CheckFlagReturn> = {};

  constructor(apiKey: string, options?: SchematicOptions) {
    this.apiKey = apiKey;
    this.eventQueue = [];
    this.contextDependentEventQueue = [];
    this.useWebSocket = options?.useWebSocket ?? false;
    this.debugEnabled = options?.debug ?? false;
    this.offlineEnabled = options?.offline ?? false;
    this.offlineFlagChecksEnabled = options?.offlineFlagChecks ?? false;

    // Check for debug mode in URL query parameter
    if (
      typeof window !== "undefined" &&
      typeof window.location !== "undefined"
    ) {
      const params = new URLSearchParams(window.location.search);

      // Debug mode
      const debugParam = params.get("schematic_debug");
      if (
        debugParam !== null &&
        (debugParam === "" || debugParam === "true" || debugParam === "1")
      ) {
        this.debugEnabled = true;
      }

      // Offline mode
      const offlineParam = params.get("schematic_offline");
      if (
        offlineParam !== null &&
        (offlineParam === "" || offlineParam === "true" || offlineParam === "1")
      ) {
        this.offlineEnabled = true;
        // When offline mode is enabled via URL, also enable debug mode to log events
        this.debugEnabled = true;
      }
    }

    // When offline mode is enabled via options, also enable debug logging if not explicitly disabled
    if (this.offlineEnabled && options?.debug !== false) {
      this.debugEnabled = true;
    }

    // When offline mode is enabled, immediately set isPending to false since we won't be making any network requests
    if (this.offlineEnabled) {
      this.setIsPending(false);
    }

    this.additionalHeaders = {
      "X-Schematic-Client-Version": `schematic-js@${version}`,
      ...(options?.additionalHeaders ?? {}),
    };

    if (options?.storage) {
      this.storage = options.storage;
    } else if (typeof localStorage !== "undefined") {
      this.storage = localStorage;
    }

    if (options?.apiUrl !== undefined) {
      this.apiUrl = options.apiUrl;
    }

    if (options?.eventUrl !== undefined) {
      this.eventUrl = options.eventUrl;
    }

    if (options?.webSocketUrl !== undefined) {
      this.webSocketUrl = options.webSocketUrl;
    }

    if (options?.webSocketConnectionTimeout !== undefined) {
      this.webSocketConnectionTimeout = options.webSocketConnectionTimeout;
    }

    if (options?.webSocketReconnect !== undefined) {
      this.webSocketReconnect = options.webSocketReconnect;
    }

    if (options?.webSocketMaxReconnectAttempts !== undefined) {
      this.webSocketMaxReconnectAttempts =
        options.webSocketMaxReconnectAttempts;
    }

    if (options?.webSocketInitialRetryDelay !== undefined) {
      this.webSocketInitialRetryDelay = options.webSocketInitialRetryDelay;
    }

    if (options?.webSocketMaxRetryDelay !== undefined) {
      this.webSocketMaxRetryDelay = options.webSocketMaxRetryDelay;
    }

    if (options?.maxEventQueueSize !== undefined) {
      this.maxEventQueueSize = options.maxEventQueueSize;
    }

    if (options?.maxEventRetries !== undefined) {
      this.maxEventRetries = options.maxEventRetries;
    }

    if (options?.eventRetryInitialDelay !== undefined) {
      this.eventRetryInitialDelay = options.eventRetryInitialDelay;
    }

    if (options?.eventRetryMaxDelay !== undefined) {
      this.eventRetryMaxDelay = options.eventRetryMaxDelay;
    }

    if (options?.flagValueDefaults !== undefined) {
      this.flagValueDefaults = options.flagValueDefaults;
    }

    if (options?.flagCheckDefaults !== undefined) {
      this.flagCheckDefaults = options.flagCheckDefaults;
    }

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
    if (typeof window !== "undefined" && window?.addEventListener) {
      window.addEventListener("beforeunload", () => {
        this.flushEventQueue();
        this.flushContextDependentEventQueue();
      });

      // Listen for browser online/offline events to handle network changes
      if (this.useWebSocket) {
        window.addEventListener("offline", () => {
          this.debug("Browser went offline, closing WebSocket connection");
          this.handleNetworkOffline();
        });

        window.addEventListener("online", () => {
          this.debug("Browser came online, attempting to reconnect WebSocket");
          this.handleNetworkOnline();
        });
      }
    }

    if (this.offlineEnabled) {
      this.debug(
        "Initialized with offline mode enabled - no network requests will be made",
      );
    } else if (this.offlineFlagChecksEnabled) {
      this.debug(
        "Initialized with offline flag checks enabled - flag checks will use defaults, events will still be sent",
      );
    } else if (this.debugEnabled) {
      this.debug("Initialized with debug mode enabled");
    }
  }

  /**
   * Resolve fallback value according to priority order:
   * 1. Callsite fallback value (if provided)
   * 2. Initialization fallback value (flagValueDefaults)
   * 3. Default to false
   */
  private resolveFallbackValue(key: string, callsiteFallback?: boolean): boolean {
    // Priority 1: Callsite fallback value
    if (callsiteFallback !== undefined) {
      return callsiteFallback;
    }

    // Priority 2: Initialization fallback value from flagValueDefaults
    if (key in this.flagValueDefaults) {
      return this.flagValueDefaults[key];
    }

    // Priority 3: Default to false
    return false;
  }

  /**
   * Resolve complete CheckFlagReturn object according to priority order:
   * 1. Use callsite fallback for boolean value, construct CheckFlagReturn
   * 2. Use flagCheckDefaults if available for this flag
   * 3. Use flagValueDefaults if available for this flag, construct CheckFlagReturn
   * 4. Default CheckFlagReturn with value: false
   */
  private resolveFallbackCheckFlagReturn(
    key: string,
    callsiteFallback?: boolean,
    reason: string = "Fallback value used",
    error?: string,
  ): CheckFlagReturn {
    // Priority 1: If callsite fallback is provided, use it and construct CheckFlagReturn
    if (callsiteFallback !== undefined) {
      return {
        flag: key,
        value: callsiteFallback,
        reason: reason,
        error: error,
      };
    }

    // Priority 2: If flagCheckDefaults has an entry for this flag, use it
    if (key in this.flagCheckDefaults) {
      const defaultReturn = this.flagCheckDefaults[key];
      // Create a copy to avoid modifying the original default
      return {
        ...defaultReturn,
        flag: key, // Ensure flag matches the requested key
        reason: error !== undefined ? reason : defaultReturn.reason,
        error: error,
      };
    }

    // Priority 3: If flagValueDefaults has an entry for this flag, construct CheckFlagReturn
    if (key in this.flagValueDefaults) {
      return {
        flag: key,
        value: this.flagValueDefaults[key],
        reason: reason,
        error: error,
      };
    }

    // Priority 4: Default CheckFlagReturn with value: false
    return {
      flag: key,
      value: false,
      reason: reason,
      error: error,
    };
  }

  /**
   * Get value for a single flag.
   * In WebSocket mode, returns cached values if connection is active, otherwise establishes
   * new connection and then returns the requestedvalue. Falls back to REST API if WebSocket
   * connection fails.
   * In REST mode, makes an API call for each check.
   */
  async checkFlag(options: CheckOptions): Promise<boolean> {
    const { fallback, key } = options;
    const context = options.context || this.context;
    const contextStr = contextString(context);

    this.debug(`checkFlag: ${key}`, { context, fallback });

    // If flag checks are offline, return fallback immediately without making any network request
    if (this.areFlagChecksOffline()) {
      // Use the full fallback resolution including flagCheckDefaults
      const reasonText = this.offlineEnabled
        ? "Offline mode - using initialization defaults"
        : "Flag checks disabled - using initialization defaults";
      const resolvedFallbackResult = this.resolveFallbackCheckFlagReturn(
        key,
        fallback,
        reasonText,
      );
      this.debug(`checkFlag offline result: ${key}`, {
        value: resolvedFallbackResult.value,
        offlineMode: this.offlineEnabled,
        offlineFlagChecks: this.offlineFlagChecksEnabled,
      });

      return resolvedFallbackResult.value;
    }

    if (!this.useWebSocket) {
      const requestUrl = `${this.apiUrl}/flags/${key}/check`;
      return fetch(requestUrl, {
        method: "POST",
        headers: {
          ...(this.additionalHeaders ?? {}),
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Api-Key": this.apiKey,
        },
        body: JSON.stringify(context),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((response) => {
          const parsedResponse = CheckFlagResponseFromJSON(response);
          this.debug(`checkFlag result: ${key}`, parsedResponse);

          // Create a flag check result object
          const result = CheckFlagReturnFromJSON(parsedResponse.data);

          // Store in feature usage event map if appropriate
          if (typeof result.featureUsageEvent === "string") {
            this.updateFeatureUsageEventMap(result);
          }

          // Submit a flag check event
          this.submitFlagCheckEvent(key, result, context);

          return result.value;
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);

          // Create a result for the error case using fallback priority and submit event
          const errorResult = this.resolveFallbackCheckFlagReturn(
            key,
            fallback,
            "API request failed",
            error instanceof Error ? error.message : String(error),
          );
          this.submitFlagCheckEvent(key, errorResult, context);

          return errorResult.value;
        });
    }

    try {
      // If we have an active connection, return a cached value if available
      const existingVals = this.checks[contextStr];
      if (
        this.conn !== null &&
        typeof existingVals !== "undefined" &&
        typeof existingVals[key] !== "undefined"
      ) {
        this.debug(`checkFlag cached result: ${key}`, existingVals[key]);
        return existingVals[key].value;
      }

      // If flag checks are offline, return fallback immediately
      if (this.areFlagChecksOffline()) {
        return this.resolveFallbackValue(key, fallback);
      }

      // If we don't have values or connection is closed, we need to fetch them
      try {
        await this.setContext(context);
      } catch (error) {
        console.error(
          "WebSocket connection failed, falling back to REST:",
          error,
        );
        return this.fallbackToRest(key, context, fallback);
      }

      // After setting context and getting a response, return the value
      const contextVals = this.checks[contextStr] ?? {};
      const flagCheck = contextVals[key];
      const result = flagCheck?.value ?? this.resolveFallbackValue(key, fallback);

      this.debug(
        `checkFlag WebSocket result: ${key}`,
        typeof flagCheck !== "undefined"
          ? flagCheck
          : { value: result, fallbackUsed: true },
      );

      // If we have flag check results, submit an event
      if (typeof flagCheck !== "undefined") {
        this.submitFlagCheckEvent(key, flagCheck, context);
      }

      return result;
    } catch (error) {
      console.error("Unexpected error in checkFlag:", error);

      // Create a result for the error case using fallback priority and submit event
      const errorResult = this.resolveFallbackCheckFlagReturn(
        key,
        fallback,
        "Unexpected error in flag check",
        error instanceof Error ? error.message : String(error),
      );
      this.submitFlagCheckEvent(key, errorResult, context);

      return errorResult.value;
    }
  }

  /**
   * Helper function to log debug messages
   * Only logs if debug mode is enabled
   */
  private debug(message: string, ...args: unknown[]): void {
    if (this.debugEnabled) {
      console.log(`[Schematic] ${message}`, ...args);
    }
  }

  /**
   * Helper function to check if client is in offline mode
   */
  private isOffline(): boolean {
    return this.offlineEnabled;
  }

  /**
   * Helper function to check if flag checks should be offline
   * (either full offline mode or just flag checks disabled)
   */
  private areFlagChecksOffline(): boolean {
    return this.offlineEnabled || this.offlineFlagChecksEnabled;
  }

  /**
   * Submit a flag check event
   * Records data about a flag check for analytics
   */
  private submitFlagCheckEvent(
    flagKey: string,
    result: CheckFlagReturn,
    context: SchematicContext,
  ): Promise<void> {
    const eventBody: EventBodyFlagCheck = {
      flagKey: flagKey,
      value: result.value,
      reason: result.reason,
      flagId: result.flagId,
      ruleId: result.ruleId,
      companyId: result.companyId,
      userId: result.userId,
      error: result.error,
      reqCompany: context.company,
      reqUser: context.user,
    };

    this.debug(`submitting flag check event:`, eventBody);

    return this.handleEvent("flag_check", EventBodyFlagCheckToJSON(eventBody));
  }

  /**
   * Helper method for falling back to REST API when WebSocket connection fails
   */
  private async fallbackToRest(
    key: string,
    context: SchematicContext,
    fallback?: boolean,
  ): Promise<boolean> {
    // If flag checks are offline, immediately return fallback value
    if (this.areFlagChecksOffline()) {
      const resolvedFallback = this.resolveFallbackValue(key, fallback);
      this.debug(`fallbackToRest offline result: ${key}`, {
        value: resolvedFallback,
        offlineMode: this.offlineEnabled,
        offlineFlagChecks: this.offlineFlagChecksEnabled,
      });

      return resolvedFallback;
    }

    try {
      const requestUrl = `${this.apiUrl}/flags/${key}/check`;
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          ...(this.additionalHeaders ?? {}),
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Api-Key": this.apiKey,
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const responseJson = await response.json();
      const data = CheckFlagResponseFromJSON(responseJson);

      this.debug(`fallbackToRest result: ${key}`, data);

      // Create a flag check result object
      const result = CheckFlagReturnFromJSON(data.data);

      // Store in feature usage event map if appropriate
      if (typeof result.featureUsageEvent === "string") {
        this.updateFeatureUsageEventMap(result);
      }

      // Submit a flag check event
      this.submitFlagCheckEvent(key, result, context);

      return result.value;
    } catch (error) {
      console.error("REST API call failed, using fallback value:", error);

      // Create a result for the error case using fallback priority and submit event
      const errorResult = this.resolveFallbackCheckFlagReturn(
        key,
        fallback,
        "API request failed (fallback)",
        error instanceof Error ? error.message : String(error),
      );
      this.submitFlagCheckEvent(key, errorResult, context);

      return errorResult.value;
    }
  }

  /**
   * Make an API call to fetch all flag values for a given context.
   * Recommended for use in REST mode only.
   * In offline mode, returns an empty object.
   */
  checkFlags = async (
    context?: SchematicContext,
  ): Promise<Record<string, boolean>> => {
    context = context || this.context;

    this.debug(`checkFlags`, { context });

    // If flag checks are offline, return empty object without making network request
    if (this.areFlagChecksOffline()) {
      this.debug(`checkFlags offline result: returning empty object`, {
        offlineMode: this.offlineEnabled,
        offlineFlagChecks: this.offlineFlagChecksEnabled,
      });
      return {};
    }

    const requestUrl = `${this.apiUrl}/flags/check`;
    const requestBody = JSON.stringify(context);
    return fetch(requestUrl, {
      method: "POST",
      headers: {
        ...(this.additionalHeaders ?? {}),
        "Content-Type": "application/json;charset=UTF-8",
        "X-Schematic-Api-Key": this.apiKey,
      },
      body: requestBody,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        return response.json();
      })
      .then((responseJson) => {
        const resp = CheckFlagsResponseFromJSON(responseJson);

        this.debug(`checkFlags result:`, resp);

        return (resp?.data?.flags ?? []).reduce(
          (accum: Record<string, boolean>, flag: CheckFlagResponseData) => {
            accum[flag.flag] = flag.value;
            return accum;
          },
          {},
        );
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        return {};
      });
  };

  /**
   * Send an identify event.
   * This will set the context for subsequent flag evaluation and events, and will also
   * send an identify event to the Schematic API which will upsert a user and company.
   */
  identify = (body: EventBodyIdentify): Promise<void> => {
    this.debug(`identify:`, body);

    try {
      // Set context for future events (async, don't wait)
      this.setContext({
        company: body.company?.keys,
        user: body.keys,
      });
    } catch (error) {
      console.error("Error setting context:", error);
    }

    // Send the identify event immediately
    return this.handleEvent("identify", body);
  };

  /**
   * Set the flag evaluation context.
   * In WebSocket mode, this will:
   * 1. Open a websocket connection if not already open
   * 2. Send the context to the server
   * 3. Wait for initial flag values to be returned
   * The promise resolves when initial flag values are received.
   * In offline mode, this will just set the context locally without connecting.
   */
  setContext = async (context: SchematicContext): Promise<void> => {
    if (this.areFlagChecksOffline() || !this.useWebSocket) {
      this.context = context;
      this.flushContextDependentEventQueue();
      this.setIsPending(false);
      return Promise.resolve();
    }

    // If using websocket, wsSendMessage will handle setting the context
    try {
      this.setIsPending(true);

      if (!this.conn) {
        // Cancel any pending reconnection and connect immediately
        if (this.wsReconnectTimer !== null) {
          this.debug(
            `Cancelling scheduled reconnection, connecting immediately`,
          );
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }

        this.conn = this.wsConnect();
      }

      const socket = await this.conn;
      await this.wsSendMessage(socket, context);
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      throw error;
    }
  };

  /**
   * Send a track event
   * Track usage for a company and/or user.
   * Optimistically updates feature usage flags if tracking a featureUsageEvent.
   */
  track = (body: EventBodyTrack): Promise<void> => {
    const { company, user, event, traits, quantity = 1 } = body;

    // Check if we have context (either provided or in this.context)
    if (!this.hasContext(company, user)) {
      this.debug(`track: queuing event "${event}" until context is available`);

      // Create the event and add to context-dependent queue
      const queuedEvent: Event = {
        api_key: this.apiKey,
        body: {
          company,
          event,
          traits: traits ?? {},
          user,
          quantity,
        },
        sent_at: new Date().toISOString(),
        tracker_event_id: uuidv4(),
        tracker_user_id: this.getAnonymousId(),
        type: "track",
      };

      this.contextDependentEventQueue.push(queuedEvent);
      return Promise.resolve();
    }

    const trackData = {
      company: company ?? this.context.company,
      event,
      traits: traits ?? {},
      user: user ?? this.context.user,
      quantity,
    };

    this.debug(`track:`, trackData);

    // Check if this event is in our featureUsageEventMap and update any related flags
    if (event in this.featureUsageEventMap) {
      this.optimisticallyUpdateFeatureUsage(event, quantity);
    }

    return this.handleEvent("track", trackData);
  };

  /**
   * Optimistically update feature usage flags associated with a tracked event
   * This updates flags in memory with updated usage counts and value/featureUsageExceeded flags
   * before the network request completes
   */
  private optimisticallyUpdateFeatureUsage = (
    eventName: string,
    quantity: number = 1,
  ): void => {
    const flagsForEvent = this.featureUsageEventMap[eventName];
    if (flagsForEvent === undefined || flagsForEvent === null) return;

    this.debug(
      `Optimistically updating feature usage for event: ${eventName}`,
      { quantity },
    );

    Object.entries(flagsForEvent).forEach(([flagKey, check]) => {
      if (check === undefined) return;

      // Clone the check to avoid modifying the original
      const updatedCheck: CheckFlagReturn = { ...check };

      // Increment usage by the specified quantity
      if (typeof updatedCheck.featureUsage === "number") {
        updatedCheck.featureUsage += quantity;

        // Determine if usage now exceeds allocation
        if (typeof updatedCheck.featureAllocation === "number") {
          const wasExceeded = updatedCheck.featureUsageExceeded === true;
          const nowExceeded =
            updatedCheck.featureUsage >= updatedCheck.featureAllocation;

          // Update flags if the status changed
          if (nowExceeded !== wasExceeded) {
            updatedCheck.featureUsageExceeded = nowExceeded;
            // If we're now exceeding usage, flip the value to false
            if (nowExceeded) {
              updatedCheck.value = false;
            }

            this.debug(`Usage limit status changed for flag: ${flagKey}`, {
              was: wasExceeded ? "exceeded" : "within limits",
              now: nowExceeded ? "exceeded" : "within limits",
              featureUsage: updatedCheck.featureUsage,
              featureAllocation: updatedCheck.featureAllocation,
              value: updatedCheck.value,
            });
          }
        }

        // Update in the feature usage event map
        if (this.featureUsageEventMap[eventName] !== undefined) {
          this.featureUsageEventMap[eventName][flagKey] = updatedCheck;
        }

        // Update in the context-based checks as well
        const contextStr = contextString(this.context);
        if (
          this.checks[contextStr] !== undefined &&
          this.checks[contextStr] !== null
        ) {
          this.checks[contextStr][flagKey] = updatedCheck;
        }

        // Notify listeners about the updated flag
        this.notifyFlagCheckListeners(flagKey, updatedCheck);
        this.notifyFlagValueListeners(flagKey, updatedCheck.value);
      }
    });
  };

  /**
   * Event processing
   */

  private hasContext = (
    company?: Record<string, string>,
    user?: Record<string, string>,
  ): boolean => {
    // Check if context is provided in the track call itself
    const hasProvidedContext =
      (company !== undefined &&
        company !== null &&
        Object.keys(company).length > 0) ||
      (user !== undefined && user !== null && Object.keys(user).length > 0);

    // Check if context is set on the instance (from previous identify or setContext calls)
    const hasInstanceContext =
      (this.context.company !== undefined &&
        this.context.company !== null &&
        Object.keys(this.context.company).length > 0) ||
      (this.context.user !== undefined &&
        this.context.user !== null &&
        Object.keys(this.context.user).length > 0);

    return hasProvidedContext || hasInstanceContext;
  };

  private flushContextDependentEventQueue = (): void => {
    this.debug(
      `flushing ${this.contextDependentEventQueue.length} context-dependent events`,
    );

    while (this.contextDependentEventQueue.length > 0) {
      const event = this.contextDependentEventQueue.shift();
      if (event) {
        // Update the event body with current context before sending
        if (
          event.type === "track" &&
          typeof event.body === "object" &&
          event.body !== null
        ) {
          const trackBody = event.body as EventBodyTrack;
          const updatedBody: EventBodyTrack = {
            ...trackBody,
            company: trackBody.company ?? this.context.company,
            user: trackBody.user ?? this.context.user,
          };

          const updatedEvent: Event = {
            ...event,
            body: updatedBody,
            sent_at: new Date().toISOString(), // Update timestamp to actual send time
          };

          this.sendEvent(updatedEvent);
        } else {
          this.sendEvent(event);
        }
      }
    }
  };

  private startRetryTimer = (): void => {
    if (this.retryTimer !== null) {
      return; // Timer already running
    }

    // Check for ready events every 5 seconds
    this.retryTimer = setInterval(() => {
      this.flushEventQueue().catch((error) => {
        this.debug("Error in retry timer flush:", error);
      });

      // Stop timer if queue is empty
      if (this.eventQueue.length === 0) {
        this.stopRetryTimer();
      }
    }, 5000);

    this.debug("Started retry timer");
  };

  private stopRetryTimer = (): void => {
    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
      this.debug("Stopped retry timer");
    }
  };

  private flushEventQueue = async (): Promise<void> => {
    if (this.eventQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const readyEvents: Event[] = [];
    const notReadyEvents: Event[] = [];

    // Separate events that are ready for retry from those still in backoff
    for (const event of this.eventQueue) {
      if (event.next_retry_at === undefined || event.next_retry_at <= now) {
        readyEvents.push(event);
      } else {
        notReadyEvents.push(event);
      }
    }

    if (readyEvents.length === 0) {
      this.debug(`No events ready for retry yet (${notReadyEvents.length} still in backoff)`);
      return;
    }

    this.debug(`Flushing event queue: ${readyEvents.length} ready, ${notReadyEvents.length} waiting`);

    // Keep events that aren't ready for retry yet
    this.eventQueue = notReadyEvents;

    // Process ready events one by one to avoid overwhelming the server
    for (const event of readyEvents) {
      try {
        await this.sendEvent(event);
        this.debug(`Queued event sent successfully:`, event.type);
      } catch (error) {
        this.debug(`Failed to send queued event:`, error);
        // sendEvent already re-adds failed events to queue with updated retry info
      }
    }
  };

  private getAnonymousId = (): string => {
    if (!this.storage) {
      return uuidv4();
    }

    const storedAnonymousId = this.storage.getItem(anonymousIdKey);
    if (typeof storedAnonymousId !== "undefined") {
      return storedAnonymousId;
    }

    const generatedAnonymousId = uuidv4();
    this.storage.setItem(anonymousIdKey, generatedAnonymousId);
    return generatedAnonymousId;
  };

  private handleEvent = (
    eventType: EventType,
    eventBody: EventBody,
  ): Promise<void> => {
    const event: Event = {
      api_key: this.apiKey,
      body: eventBody,
      sent_at: new Date().toISOString(),
      tracker_event_id: uuidv4(),
      tracker_user_id: this.getAnonymousId(),
      type: eventType,
    };

    if (typeof document !== "undefined" && document?.hidden) {
      return this.storeEvent(event);
    } else {
      return this.sendEvent(event);
    }
  };

  private sendEvent = async (event: Event): Promise<void> => {
    const captureUrl = `${this.eventUrl}/e`;
    const payload = JSON.stringify(event);

    this.debug(`sending event:`, { url: captureUrl, event });

    // If in offline mode, just log the event without sending
    if (this.isOffline()) {
      this.debug(`event not sent (offline mode):`, { event });
      return Promise.resolve();
    }

    try {
      const response = await fetch(captureUrl, {
        method: "POST",
        headers: {
          ...(this.additionalHeaders ?? {}),
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.debug(`event sent:`, {
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      const retryCount = (event.retry_count ?? 0) + 1;

      if (retryCount <= this.maxEventRetries) {
        this.debug(`Event failed to send (attempt ${retryCount}/${this.maxEventRetries}), queueing for retry:`, error);

        // Calculate exponential backoff delay
        const baseDelay = this.eventRetryInitialDelay * Math.pow(2, retryCount - 1);
        const jitterDelay = Math.min(baseDelay, this.eventRetryMaxDelay);
        const nextRetryAt = Date.now() + jitterDelay;

        // Update event with retry metadata
        const retryEvent = {
          ...event,
          retry_count: retryCount,
          next_retry_at: nextRetryAt,
        };

        // Add event back to queue for retry, but limit queue size
        if (this.eventQueue.length < this.maxEventQueueSize) {
          this.eventQueue.push(retryEvent);
          this.debug(`Event queued for retry in ${jitterDelay}ms (${this.eventQueue.length}/${this.maxEventQueueSize})`);
        } else {
          this.debug(`Event queue full (${this.maxEventQueueSize}), dropping oldest event`);
          // Remove oldest event and add new one (FIFO with size limit)
          this.eventQueue.shift();
          this.eventQueue.push(retryEvent);
        }

        // Start retry timer to periodically check for ready events
        this.startRetryTimer();
      } else {
        this.debug(`Event failed permanently after ${this.maxEventRetries} attempts, dropping:`, error);
        // Event is permanently failed, don't retry
      }
    }

    return Promise.resolve();
  };

  private storeEvent = (event: Event): Promise<void> => {
    this.eventQueue.push(event);
    return Promise.resolve();
  };

  /**
   * Websocket management
   */

  /**
   * If using websocket mode, close the connection when done.
   * In offline mode, this is a no-op.
   */
  cleanup = async (): Promise<void> => {
    // If flag checks are offline, no need to clean up connections since none are made
    if (this.areFlagChecksOffline()) {
      const reason = this.offlineEnabled
        ? "offline mode"
        : "offline flag checks enabled";
      this.debug(`cleanup: skipped (${reason})`);
      return Promise.resolve();
    }

    // Mark this as an intentional disconnect to prevent reconnection
    this.wsIntentionalDisconnect = true;

    // Clear any pending reconnection timers
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    // Stop retry timer
    this.stopRetryTimer();

    if (this.conn) {
      try {
        const socket = await this.conn;
        socket.close();
      } catch (error) {
        console.error("Error during cleanup:", error);
      } finally {
        this.conn = null;
      }
    }
  };

  /**
   * Calculate the delay for the next reconnection attempt using exponential backoff with jitter.
   * This helps prevent dogpiling when the server recovers from an outage.
   */
  private calculateReconnectDelay = (): number => {
    // Calculate exponential backoff: initialDelay * 2^attempt
    const exponentialDelay =
      this.webSocketInitialRetryDelay * Math.pow(2, this.wsReconnectAttempts);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, this.webSocketMaxRetryDelay);

    // Add jitter: random value between 0 and 50% of the delay
    // This spreads out reconnection attempts to avoid thundering herd
    const jitter = Math.random() * cappedDelay * 0.5;

    const totalDelay = cappedDelay + jitter;

    this.debug(
      `Reconnect delay calculated: ${totalDelay.toFixed(0)}ms (attempt ${this.wsReconnectAttempts + 1}/${this.webSocketMaxReconnectAttempts})`,
    );

    return totalDelay;
  };

  /**
   * Handle browser going offline
   */
  private handleNetworkOffline = async (): Promise<void> => {
    // Don't mark as intentional disconnect - we want to reconnect when online
    if (this.conn !== null) {
      try {
        const socket = await this.conn;
        // Close the zombie connection
        socket.close();
      } catch (error) {
        // Connection might already be dead, that's ok
        this.debug("Error closing connection on offline:", error);
      }
      this.conn = null;
    }

    // Clear any pending reconnection timers
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
  };

  /**
   * Handle browser coming back online
   */
  private handleNetworkOnline = (): void => {
    // Always attempt reconnection when network comes back online.
    // The application layer will re-establish context as needed.
    this.debug("Network online, attempting reconnection and flushing queued events");

    // Reset reconnection attempts for fresh start
    this.wsReconnectAttempts = 0;

    // Cancel any pending reconnection timer
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    // Flush any queued events that failed to send while offline
    this.flushEventQueue().catch((error) => {
      this.debug("Error flushing event queue on network online:", error);
    });

    // Attempt immediate reconnection
    this.attemptReconnect();
  };

  /**
   * Attempt to reconnect the WebSocket connection with exponential backoff.
   * Called automatically when the connection closes unexpectedly.
   */
  private attemptReconnect = (): void => {
    // Check if we've exceeded max reconnection attempts
    if (this.wsReconnectAttempts >= this.webSocketMaxReconnectAttempts) {
      this.debug(
        `Maximum reconnection attempts (${this.webSocketMaxReconnectAttempts}) reached, giving up`,
      );
      return;
    }

    // Clear any existing reconnection timer
    if (this.wsReconnectTimer !== null) {
      clearTimeout(this.wsReconnectTimer);
    }

    // Calculate delay with exponential backoff and jitter
    const delay = this.calculateReconnectDelay();

    this.debug(
      `Scheduling reconnection attempt ${this.wsReconnectAttempts + 1}/${this.webSocketMaxReconnectAttempts} in ${delay.toFixed(0)}ms`,
    );

    // Schedule the reconnection
    this.wsReconnectTimer = setTimeout(async () => {
      this.wsReconnectTimer = null;
      this.wsReconnectAttempts++;

      this.debug(
        `Attempting to reconnect (attempt ${this.wsReconnectAttempts}/${this.webSocketMaxReconnectAttempts})`,
      );

      try {
        // Create new connection
        this.conn = this.wsConnect();
        const socket = await this.conn;

        // Check if we have a context to re-send
        this.debug(`Reconnection context check:`, {
          hasCompany: this.context.company !== undefined,
          hasUser: this.context.user !== undefined,
          context: this.context
        });

        if (
          this.context.company !== undefined ||
          this.context.user !== undefined
        ) {
          this.debug(`Reconnected, force re-sending context`);
          // After reconnection, always send context even if it appears "unchanged"
          // because the server has lost all state and needs the initial context
          await this.wsSendContextAfterReconnection(socket, this.context);
        } else {
          this.debug(`No context to re-send after reconnection - websocket ready for new context`);
        }

        // After successful websocket reconnection, flush any queued events
        this.flushEventQueue().catch((error) => {
          this.debug("Error flushing event queue after websocket reconnection:", error);
        });

        this.debug(`Reconnection successful`);
      } catch (error) {
        this.debug(`Reconnection attempt failed:`, error);
        // The wsConnect onclose handler will trigger another attemptReconnect
      }
    }, delay);
  };

  // Open a websocket connection
  private wsConnect = (): Promise<WebSocket> => {
    // If flag checks are offline, don't actually connect
    if (this.areFlagChecksOffline()) {
      const reason = this.offlineEnabled
        ? "offline mode"
        : "offline flag checks enabled";
      this.debug(`wsConnect: skipped (${reason})`);
      return Promise.reject(
        new Error(`WebSocket connection skipped in ${reason}`),
      );
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.webSocketUrl}/flags/bootstrap?apiKey=${this.apiKey}`;

      this.debug(`connecting to WebSocket:`, wsUrl);

      const webSocket = new WebSocket(wsUrl);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;

      // Set up connection timeout
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          this.debug(
            `WebSocket connection timeout after ${this.webSocketConnectionTimeout}ms`,
          );
          webSocket.close();
          reject(new Error("WebSocket connection timeout"));
        }
      }, this.webSocketConnectionTimeout);

      webSocket.onopen = () => {
        isResolved = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        // Reset reconnection attempts on successful connection
        this.wsReconnectAttempts = 0;
        this.wsIntentionalDisconnect = false;

        this.debug(`WebSocket connection opened`);
        resolve(webSocket);
      };

      webSocket.onerror = (error) => {
        isResolved = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        this.debug(`WebSocket connection error:`, error);
        reject(error);
      };

      webSocket.onclose = () => {
        isResolved = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        this.debug(`WebSocket connection closed`);
        this.conn = null;

        // Attempt to reconnect if not intentionally disconnected
        if (!this.wsIntentionalDisconnect && this.webSocketReconnect) {
          this.attemptReconnect();
        }
      };
    });
  };

  // Send a message on the websocket after reconnection, forcing the send even if context appears unchanged
  // because the server has lost all state and needs the initial context
  private wsSendContextAfterReconnection = (
    socket: WebSocket,
    context: SchematicContext,
  ): Promise<void> => {
    // If flag checks are offline, don't send messages
    if (this.areFlagChecksOffline()) {
      const reason = this.offlineEnabled
        ? "offline mode"
        : "offline flag checks enabled";
      this.debug(`wsSendContextAfterReconnection: skipped (${reason})`);
      this.setIsPending(false);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Force update context and send message regardless of whether it appears "unchanged"
      this.debug(`WebSocket force sending context after reconnection:`, context);
      this.context = context;

      const sendMessage = () => {
        let resolved = false;

        const messageHandler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          this.debug(`WebSocket message received after reconnection:`, message);

          // Initialize flag checks for context
          if (!(contextString(context) in this.checks)) {
            this.checks[contextString(context)] = {};
          }

          // Message may contain only a subset of flags; merge with existing context
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (message.flags ?? []).forEach((flag: any) => {
            const flagCheck = CheckFlagReturnFromJSON(flag);
            const contextStr = contextString(context);
            if (this.checks[contextStr] === undefined) {
              this.checks[contextStr] = {};
            }
            this.checks[contextStr][flagCheck.flag] = flagCheck;
          });

          // Set this.useWebSocket = true to signal that we have a working connection
          this.useWebSocket = true;

          socket.removeEventListener("message", messageHandler);

          if (!resolved) {
            resolved = true;
            resolve(this.setIsPending(false));
          }
        };

        socket.addEventListener("message", messageHandler);

        const clientVersion =
          this.additionalHeaders["X-Schematic-Client-Version"] ??
          `schematic-js@${version}`;

        const messagePayload = {
          apiKey: this.apiKey,
          clientVersion,
          data: context,
        };

        this.debug(`WebSocket sending forced message after reconnection:`, messagePayload);

        socket.send(JSON.stringify(messagePayload));
      };

      if (socket.readyState === WebSocket.OPEN) {
        // If websocket is already open, send message immediately
        this.debug(`WebSocket already open, sending forced message after reconnection`);
        sendMessage();
      } else {
        // If websocket is connecting, wait for it to open
        socket.addEventListener("open", () => {
          this.debug(`WebSocket opened, sending forced message after reconnection`);
          sendMessage();
        });
      }
    });
  };

  // Send a message on the websocket indicating interest in a particular evaluation context
  // and wait for the initial set of flag values to be returned
  private wsSendMessage = (
    socket: WebSocket,
    context: SchematicContext,
  ): Promise<void> => {
    // If flag checks are offline, don't send messages
    if (this.areFlagChecksOffline()) {
      const reason = this.offlineEnabled
        ? "offline mode"
        : "offline flag checks enabled";
      this.debug(`wsSendMessage: skipped (${reason})`);
      this.setIsPending(false);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Confirm that the context has changed; if it hasn't, we don't need to do anything
      if (contextString(context) == contextString(this.context)) {
        this.debug(`WebSocket context unchanged, skipping update`);
        return resolve(this.setIsPending(false));
      }

      this.debug(`WebSocket context updated:`, context);

      this.context = context;

      const sendMessage = () => {
        let resolved = false;

        const messageHandler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          this.debug(`WebSocket message received:`, message);

          // Initialize flag checks for context
          if (!(contextString(context) in this.checks)) {
            this.checks[contextString(context)] = {};
          }

          // Message may contain only a subset of flags; merge with existing context
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (message.flags ?? []).forEach((flag: any) => {
            const flagCheck = CheckFlagReturnFromJSON(flag);
            const contextStr = contextString(context);
            if (this.checks[contextStr] === undefined) {
              this.checks[contextStr] = {};
            }
            this.checks[contextStr][flagCheck.flag] = flagCheck;

            this.debug(`WebSocket flag update:`, {
              flag: flagCheck.flag,
              value: flagCheck.value,
              flagCheck,
            });

            // Store in feature usage event map if appropriate
            if (typeof flagCheck.featureUsageEvent === "string") {
              this.updateFeatureUsageEventMap(flagCheck);
            }

            // Log flag check events if there are listeners registered
            if (
              this.flagCheckListeners[flag.flag]?.size > 0 ||
              this.flagValueListeners[flag.flag]?.size > 0
            ) {
              this.submitFlagCheckEvent(flagCheck.flag, flagCheck, context);
            }

            this.notifyFlagCheckListeners(flag.flag, flagCheck);
            this.notifyFlagValueListeners(flag.flag, flagCheck.value);
          });

          // Flush any context-dependent events that were queued
          this.flushContextDependentEventQueue();

          // Update pending state
          this.setIsPending(false);

          // If this is the first message received on the websocket, we need to resolve the promise
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        socket.addEventListener("message", messageHandler);

        const clientVersion =
          this.additionalHeaders["X-Schematic-Client-Version"] ??
          `schematic-js@${version}`;

        const messagePayload = {
          apiKey: this.apiKey,
          clientVersion,
          data: context,
        };

        this.debug(`WebSocket sending message:`, messagePayload);

        socket.send(JSON.stringify(messagePayload));
      };

      if (socket.readyState === WebSocket.OPEN) {
        // If websocket is already open, send message immediately
        this.debug(`WebSocket already open, sending message`);
        sendMessage();
      } else if (socket.readyState === WebSocket.CONNECTING) {
        // If websocket is connecting, wait for it to open before sending message
        this.debug(`WebSocket connecting, waiting for open to send message`);
        socket.addEventListener("open", sendMessage);
      } else {
        // If websocket is closed, reject the promise
        this.debug(`WebSocket is closed, cannot send message`);
        reject("WebSocket is not open or connecting");
      }
    });
  };

  /**
   * State management
   */

  // isPending state
  getIsPending = (): boolean => {
    return this.isPending;
  };

  addIsPendingListener = (listener: PendingListenerFn) => {
    this.isPendingListeners.add(listener);
    return () => {
      this.isPendingListeners.delete(listener);
    };
  };

  private setIsPending = (isPending: boolean) => {
    this.isPending = isPending;
    this.isPendingListeners.forEach((listener) =>
      notifyPendingListener(listener, isPending),
    );
  };

  // flag checks state
  getFlagCheck = (flagKey: string) => {
    const contextStr = contextString(this.context);
    const checks = this.checks[contextStr] ?? {};
    return checks[flagKey];
  };

  // flagValues state
  getFlagValue = (flagKey: string) => {
    const check = this.getFlagCheck(flagKey);
    return check?.value;
  };

  /** Register an event listener that will be notified with the boolean value for a given flag when this value changes */
  addFlagValueListener = (flagKey: string, listener: FlagValueListenerFn) => {
    if (!(flagKey in this.flagValueListeners)) {
      this.flagValueListeners[flagKey] = new Set();
    }

    this.flagValueListeners[flagKey].add(listener);

    return () => {
      this.flagValueListeners[flagKey].delete(listener);
    };
  };

  /** Register an event listener that will be notified with the full flag check response for a given flag whenever this value changes */
  addFlagCheckListener = (flagKey: string, listener: FlagCheckListenerFn) => {
    if (!(flagKey in this.flagCheckListeners)) {
      this.flagCheckListeners[flagKey] = new Set();
    }

    this.flagCheckListeners[flagKey].add(listener);

    return () => {
      this.flagCheckListeners[flagKey].delete(listener);
    };
  };

  private notifyFlagCheckListeners = (
    flagKey: string,
    check: CheckFlagReturn,
  ) => {
    const listeners = this.flagCheckListeners?.[flagKey] ?? [];

    if (listeners.size > 0) {
      this.debug(
        `Notifying ${listeners.size} flag check listeners for ${flagKey}`,
        check,
      );
    }

    // If this flag check has a featureUsageEvent, store it in our map
    if (typeof check.featureUsageEvent === "string") {
      this.updateFeatureUsageEventMap(check);
    }

    listeners.forEach((listener) => notifyFlagCheckListener(listener, check));
  };

  /** Add or update a CheckFlagReturn in the featureUsageEventMap */
  private updateFeatureUsageEventMap = (check: CheckFlagReturn) => {
    if (typeof check.featureUsageEvent !== "string") return;

    const eventName = check.featureUsageEvent;
    if (
      this.featureUsageEventMap[eventName] === undefined ||
      this.featureUsageEventMap[eventName] === null
    ) {
      this.featureUsageEventMap[eventName] = {};
    }

    if (this.featureUsageEventMap[eventName] !== undefined) {
      this.featureUsageEventMap[eventName][check.flag] = check;
    }
    this.debug(
      `Updated featureUsageEventMap for event: ${eventName}, flag: ${check.flag}`,
      check,
    );
  };

  private notifyFlagValueListeners = (flagKey: string, value: boolean) => {
    const listeners = this.flagValueListeners?.[flagKey] ?? [];

    if (listeners.size > 0) {
      this.debug(
        `Notifying ${listeners.size} flag value listeners for ${flagKey}`,
        { value },
      );
    }

    listeners.forEach((listener) => notifyFlagValueListener(listener, value));
  };
}

const notifyPendingListener = (listener: PendingListenerFn, value: boolean) => {
  if (listener.length > 0) {
    (listener as BooleanListenerFn)(value);
  } else {
    (listener as EmptyListenerFn)();
  }
};

const notifyFlagCheckListener = (
  listener: FlagCheckListenerFn,
  value: CheckFlagReturn,
) => {
  if (listener.length > 0) {
    (listener as CheckFlagReturnListenerFn)(value);
  } else {
    (listener as EmptyListenerFn)();
  }
};

const notifyFlagValueListener = (
  listener: FlagValueListenerFn,
  value: boolean,
) => {
  if (listener.length > 0) {
    (listener as BooleanListenerFn)(value);
  } else {
    (listener as EmptyListenerFn)();
  }
};

export * from "./types";
