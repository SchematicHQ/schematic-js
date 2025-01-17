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

const anonymousIdKey = "schematicId";

/* @preserve */
export class Schematic {
  private additionalHeaders: Record<string, string> = {};
  private apiKey: string;
  private apiUrl = "https://api.schematichq.com";
  private conn: Promise<WebSocket> | null = null;
  private context: SchematicContext = {};
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

    if (options?.additionalHeaders) {
      this.additionalHeaders = options.additionalHeaders;
    }

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
          return CheckFlagResponseFromJSON(response).data.value;
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
          return fallback;
        });
    }

    try {
      // If we have an active connection, return a cached value if available
      const existingVals = this.checks[contextStr];
      if (
        this.conn &&
        typeof existingVals !== "undefined" &&
        typeof existingVals[key] !== "undefined"
      ) {
        return existingVals[key].value;
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
      return contextVals[key]?.value ?? fallback;
    } catch (error) {
      console.error("Unexpected error in checkFlag:", error);
      return fallback;
    }
  }

  /**
   * Helper method for falling back to REST API when WebSocket connection fails
   */
  private async fallbackToRest(
    key: string,
    context: SchematicContext,
    fallback: boolean,
  ): Promise<boolean> {
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

      const data = CheckFlagResponseFromJSON(await response.json());
      return data?.data?.value ?? false;
    } catch (error) {
      console.error("REST API call failed, using fallback value:", error);
      return fallback;
    }
  }

  /**
   * Make an API call to fetch all flag values for a given context.
   * Recommended for use in REST mode only.
   */
  checkFlags = async (
    context?: SchematicContext,
  ): Promise<Record<string, boolean>> => {
    context = context || this.context;

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
   */
  setContext = async (context: SchematicContext): Promise<void> => {
    if (!this.useWebSocket) {
      this.context = context;
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
    return this.handleEvent("track", {
      company: company ?? this.context.company,
      event,
      traits: traits ?? {},
      user: user ?? this.context.user,
    });
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

    try {
      await fetch(captureUrl, {
        method: "POST",
        headers: {
          ...(this.additionalHeaders ?? {}),
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: payload,
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
   */
  cleanup = async (): Promise<void> => {
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
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.webSocketUrl}/flags/bootstrap`;
      const webSocket = new WebSocket(wsUrl);

      webSocket.onopen = () => {
        resolve(webSocket);
      };

      webSocket.onerror = (error) => {
        reject(error);
      };

      webSocket.onclose = () => {
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
    return new Promise((resolve, reject) => {
      // Confirm that the context has changed; if it hasn't, we don't need to do anything
      if (contextString(context) == contextString(this.context)) {
        return resolve(this.setIsPending(false));
      }

      this.context = context;

      const sendMessage = () => {
        let resolved = false;

        const messageHandler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          // Initialize flag checks for context
          if (!(contextString(context) in this.checks)) {
            this.checks[contextString(context)] = {};
          }

          // Message may contain only a subset of flags; merge with existing context
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (message.flags ?? []).forEach((flag: any) => {
            const flagCheck = CheckFlagReturnFromJSON(flag);
            this.checks[contextString(context)][flagCheck.flag] = flagCheck;
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

        socket.send(
          JSON.stringify({
            apiKey: this.apiKey,
            data: context,
          }),
        );
      };

      if (socket.readyState === WebSocket.OPEN) {
        // If websocket is already open, send message immediately
        sendMessage();
      } else if (socket.readyState === WebSocket.CONNECTING) {
        // If websocket is connecting, wait for it to open before sending message
        socket.addEventListener("open", sendMessage);
      } else {
        // If websocket is closed, reject the promise
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
    listeners.forEach((listener) => notifyFlagCheckListener(listener, check));
  };

  private notifyFlagValueListeners = (flagKey: string, value: boolean) => {
    const listeners = this.flagValueListeners?.[flagKey] ?? [];
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
