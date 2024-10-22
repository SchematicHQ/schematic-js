import * as uuid from "uuid";

import "cross-fetch/polyfill";
import {
  BooleanListenerFn,
  ListenerFn,
  EmptyListenerFn,
  CheckOptions,
  Event,
  EventBody,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  FlagCheckWithKeyResponseBody,
  SchematicContext,
  SchematicOptions,
  StoragePersister,
} from "./types";
import { contextString } from "./utils";

const anonymousIdKey = "schematicId";

/* @preserve */
export class Schematic {
  private apiKey: string;
  private apiUrl = "https://api.schematichq.com";
  private conn: Promise<WebSocket> | null = null;
  private context: SchematicContext = {};
  private eventQueue: Event[];
  private eventUrl = "https://c.schematichq.com";
  private flagListener?: (values: Record<string, boolean>) => void;
  private flagValueListeners: Record<string, Set<ListenerFn>> = {};
  private isPending: boolean = true;
  private isPendingListeners: Set<ListenerFn> = new Set();
  private storage: StoragePersister | undefined;
  private useWebSocket: boolean = false;
  private values: Record<string, Record<string, boolean>> = {};
  private webSocketUrl = "wss://api.schematichq.com";

  constructor(apiKey: string, options?: SchematicOptions) {
    this.apiKey = apiKey;
    this.eventQueue = [];
    this.useWebSocket = options?.useWebSocket ?? false;
    this.flagListener = options?.flagListener;

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

  // Get value for a single flag
  // If in websocket mode, return the local value, otherwise make an API call
  async checkFlag(options: CheckOptions): Promise<boolean> {
    const { fallback = false, key } = options;
    const context = options.context || this.context;

    if (this.useWebSocket) {
      const contextVals = this.values[contextString(context)] ?? {};
      return typeof contextVals[key] === "undefined"
        ? fallback
        : contextVals[key];
    }

    const requestUrl = `${this.apiUrl}/flags/${key}/check`;
    return fetch(requestUrl, {
      method: "POST",
      headers: {
        "X-Schematic-Api-Key": this.apiKey,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(context),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        return data.data.value;
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        return fallback;
      });
  }

  // Make an API call to fetch all flag values for a given context (use if not in websocket mode)
  checkFlags = async (
    context?: SchematicContext,
  ): Promise<Record<string, boolean>> => {
    context = context || this.context;

    const requestUrl = `${this.apiUrl}/flags/check`;
    const requestBody = JSON.stringify(context);
    return fetch(requestUrl, {
      method: "POST",
      headers: {
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
      .then((data) => {
        return (data?.data?.flags ?? []).reduce(
          (
            accum: Record<string, boolean>,
            flag: FlagCheckWithKeyResponseBody,
          ) => {
            accum[flag.flag] = flag.value;
            return accum;
          },
          {},
        );
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        return false;
      });
  };

  // Send an identify event
  identify = (body: EventBodyIdentify): Promise<void> => {
    this.setContext({
      company: body.company?.keys,
      user: body.keys,
    });

    return this.handleEvent("identify", body);
  };

  // Set the flag evaluation context; if the context has changed,
  // this will open a websocket connection (if not already open)
  // and submit this context. The promise will resolve when the
  // websocket sends back an initial set of flag values.
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
      console.error("Error setting Schematic context:", error);
    }
  };

  // Send track event
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
        resolve();
        return;
      }

      this.context = context;

      const sendMessage = () => {
        let resolved = false;

        const messageHandler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          // Initialize flag values for context
          if (!(contextString(context) in this.values)) {
            this.values[contextString(context)] = {};
          }

          // Message may contain only a subset of flags; merge with existing context
          (message.flags ?? []).forEach(
            (flag: FlagCheckWithKeyResponseBody) => {
              this.values[contextString(context)][flag.flag] = flag.value;
              this.notifyFlagValueListeners(flag.flag, flag.value);
            },
          );

          // Notify flag listener (deprecating soon)
          if (this.flagListener) {
            this.flagListener(this.getFlagValues());
          }

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

  addIsPendingListener = (listener: ListenerFn) => {
    this.isPendingListeners.add(listener);
    return () => {
      this.isPendingListeners.delete(listener);
    };
  };

  private setIsPending = (isPending: boolean) => {
    this.isPending = isPending;
    this.isPendingListeners.forEach((listener) =>
      notifyListener(listener, isPending),
    );
  };

  // flagValues state
  getFlagValue = (flagKey: string) => {
    const values = this.getFlagValues();
    return values[flagKey];
  };

  getFlagValues = () => {
    const contextStr = contextString(this.context);
    return this.values[contextStr] ?? {};
  };

  addFlagValueListener = (flagKey: string, listener: ListenerFn) => {
    if (!(flagKey in this.flagValueListeners)) {
      this.flagValueListeners[flagKey] = new Set();
    }

    this.flagValueListeners[flagKey].add(listener);

    return () => {
      this.flagValueListeners[flagKey].delete(listener);
    };
  };

  private notifyFlagValueListeners = (flagKey: string, value: boolean) => {
    const listeners = this.flagValueListeners?.[flagKey] ?? [];
    listeners.forEach((listener) => notifyListener(listener, value));
  };
}

const notifyListener = (listener: ListenerFn, value: boolean) => {
  if (listener.length > 0) {
    (listener as BooleanListenerFn)(value);
  } else {
    (listener as EmptyListenerFn)();
  }
};

export * from "./types";
