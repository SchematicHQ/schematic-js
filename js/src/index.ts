import * as uuid from "uuid";

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
  private eventQueue: Event[];
  private eventUrl = "https://c.schematichq.com";
  private flagCheckListeners: Record<string, Set<FlagCheckListenerFn>> = {};
  private flagValueListeners: Record<string, Set<FlagValueListenerFn>> = {};
  private isPending: boolean = true;
  private isPendingListeners: Set<PendingListenerFn> = new Set();
  private storage: StoragePersister | undefined;
  private useWebSocket: boolean = false;
  private checks: Record<string, Record<string, CheckFlagReturn>> = {};
  private webSocketUrl = "wss://api.schematichq.com";

  constructor(apiKey: string, options?: SchematicOptions) {
    this.apiKey = apiKey;
    this.eventQueue = [];
    this.useWebSocket = options?.useWebSocket ?? false;
    this.debugEnabled = options?.debug ?? false;
    this.offlineEnabled = options?.offline ?? false;

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

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
    if (typeof window !== "undefined" && window?.addEventListener) {
      window.addEventListener("beforeunload", () => {
        this.flushEventQueue();
      });
    }

    if (this.offlineEnabled) {
      this.debug(
        "Initialized with offline mode enabled - no network requests will be made",
      );
    } else if (this.debugEnabled) {
      this.debug("Initialized with debug mode enabled");
    }
  }

  /**
   * Get value for a single flag.
   * In WebSocket mode, returns cached values if connection is active, otherwise establishes
   * new connection and then returns the requestedvalue. Falls back to REST API if WebSocket
   * connection fails.
   * In REST mode, makes an API call for each check.
   */
  async checkFlag(options: CheckOptions): Promise<boolean> {
    const { fallback = false, key } = options;
    const context = options.context || this.context;
    const contextStr = contextString(context);

    this.debug(`checkFlag: ${key}`, { context, fallback });

    // If in offline mode, return fallback immediately without making any network request
    if (this.isOffline()) {
      this.debug(`checkFlag offline result: ${key}`, {
        value: fallback,
        offlineMode: true,
      });

      return fallback;
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

          // Submit a flag check event
          this.submitFlagCheckEvent(key, result, context);

          return result.value;
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);

          // Create a minimal result for the error case and submit event
          const errorResult: CheckFlagReturn = {
            flag: key,
            value: fallback,
            reason: "API request failed",
            error: error instanceof Error ? error.message : String(error),
          };
          this.submitFlagCheckEvent(key, errorResult, context);

          return fallback;
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

      // If in offline mode, return fallback immediately
      if (this.isOffline()) {
        return fallback;
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
      const result = flagCheck?.value ?? fallback;

      this.debug(
        `checkFlag WebSocket result: ${key}`,
        typeof flagCheck !== "undefined"
          ? flagCheck
          : { value: fallback, fallbackUsed: true },
      );

      // If we have flag check results, submit an event
      if (typeof flagCheck !== "undefined") {
        this.submitFlagCheckEvent(key, flagCheck, context);
      }

      return result;
    } catch (error) {
      console.error("Unexpected error in checkFlag:", error);

      // Create a minimal result for the error case and submit event
      const errorResult: CheckFlagReturn = {
        flag: key,
        value: fallback,
        reason: "Unexpected error in flag check",
        error: error instanceof Error ? error.message : String(error),
      };
      this.submitFlagCheckEvent(key, errorResult, context);

      return fallback;
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
    fallback: boolean,
  ): Promise<boolean> {
    // If in offline mode, immediately return fallback value
    if (this.isOffline()) {
      this.debug(`fallbackToRest offline result: ${key}`, {
        value: fallback,
        offlineMode: true,
      });

      return fallback;
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

      // Submit a flag check event
      this.submitFlagCheckEvent(key, result, context);

      return result.value;
    } catch (error) {
      console.error("REST API call failed, using fallback value:", error);

      // Create a minimal result for the error case and submit event
      const errorResult: CheckFlagReturn = {
        flag: key,
        value: fallback,
        reason: "API request failed (fallback)",
        error: error instanceof Error ? error.message : String(error),
      };
      this.submitFlagCheckEvent(key, errorResult, context);

      return fallback;
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

    // If in offline mode, return empty object without making network request
    if (this.isOffline()) {
      this.debug(`checkFlags offline result: returning empty object`);
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
      this.setContext({
        company: body.company?.keys,
        user: body.keys,
      });
    } catch (error) {
      console.error("Error setting context:", error);
    }

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
    // If offline mode, set isPending to false and return
    if (this.isOffline()) {
      this.context = context;
      this.setIsPending(false);
      return Promise.resolve();
    }

    // If not using WebSocket, just return
    if (!this.useWebSocket) {
      return Promise.resolve();
    }

    try {
      this.setIsPending(true);

      if (!this.conn) {
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
   */
  track = (body: EventBodyTrack): Promise<void> => {
    const { company, user, event, traits } = body;

    const trackData = {
      company: company ?? this.context.company,
      event,
      traits: traits ?? {},
      user: user ?? this.context.user,
    };

    this.debug(`track:`, trackData);

    return this.handleEvent("track", trackData);
  };

  /**
   * Event processing
   */

  private flushEventQueue = (): void => {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  };

  private getAnonymousId = (): string => {
    if (!this.storage) {
      return uuid.v4();
    }

    const storedAnonymousId = this.storage.getItem(anonymousIdKey);
    if (typeof storedAnonymousId !== "undefined") {
      return storedAnonymousId;
    }

    const generatedAnonymousId = uuid.v4();
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
      tracker_event_id: uuid.v4(),
      tracker_user_id: this.getAnonymousId(),
      type: eventType,
    };

    if (document?.hidden) {
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

      this.debug(`event sent:`, {
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      console.error("Error sending Schematic event: ", error);
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
    // In offline mode, no need to clean up connections since none are made
    if (this.isOffline()) {
      this.debug("cleanup: skipped (offline mode)");
      return Promise.resolve();
    }

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

  // Open a websocket connection
  private wsConnect = (): Promise<WebSocket> => {
    // If in offline mode, don't actually connect
    if (this.isOffline()) {
      this.debug("wsConnect: skipped (offline mode)");
      return Promise.reject(
        new Error("WebSocket connection skipped in offline mode"),
      );
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.webSocketUrl}/flags/bootstrap?apiKey=${this.apiKey}`;

      this.debug(`connecting to WebSocket:`, wsUrl);

      const webSocket = new WebSocket(wsUrl);

      webSocket.onopen = () => {
        this.debug(`WebSocket connection opened`);
        resolve(webSocket);
      };

      webSocket.onerror = (error) => {
        this.debug(`WebSocket connection error:`, error);
        reject(error);
      };

      webSocket.onclose = () => {
        this.debug(`WebSocket connection closed`);
        this.conn = null;
      };
    });
  };

  // Send a message on the websocket indicating interest in a particular evaluation context
  // and wait for the initial set of flag values to be returned
  private wsSendMessage = (
    socket: WebSocket,
    context: SchematicContext,
  ): Promise<void> => {
    // If in offline mode, don't send messages
    if (this.isOffline()) {
      this.debug("wsSendMessage: skipped (offline mode)");
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
            this.checks[contextString(context)][flagCheck.flag] = flagCheck;

            this.debug(`WebSocket flag update:`, {
              flag: flagCheck.flag,
              value: flagCheck.value,
              flagCheck,
            });

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

    listeners.forEach((listener) => notifyFlagCheckListener(listener, check));
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
