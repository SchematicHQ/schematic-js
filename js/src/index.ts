import * as uuid from "uuid";

import "cross-fetch/polyfill";

const anonymousIdKey = "schematicId";
export type EventType = "identify" | "track";

export type Keys = Record<string, string>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Traits = Record<string, any>;

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
  traits?: Traits;
};

export type EventBody = EventBodyIdentify | EventBodyTrack;

export type Event = {
  api_key: string;
  body: EventBody;
  sent_at: string;
  tracker_event_id: string;
  tracker_user_id: string;
  type: EventType;
};

export type FlagCheckResponseBody = {
  company_id?: string;
  error?: string;
  reason: string;
  rule_id?: string;
  user_id?: string;
  value: boolean;
};

export type FlagCheckWithKeyResponseBody = FlagCheckResponseBody & {
  flag: string;
};

export type StoragePersister = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setItem(key: string, value: any): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  getItem(key: string): any;
  removeItem(key: string): void;
};

export type SchematicOptions = {
  apiUrl?: string;
  webSocketUrl?: string;
  eventUrl?: string;
  flagListener?: (values: Record<string, boolean>) => void;
  storage?: StoragePersister;
  useWebSocket?: boolean;
};

export type CheckOptions = {
  context?: SchematicContext;
  fallback?: boolean;
  key: string;
};

/* @preserve */
export class Schematic {
  private apiKey: string;
  private apiUrl = "https://api.schematichq.com";
  private webSocketUrl = "wss://api.schematichq.com";
  private eventUrl = "https://c.schematichq.com";
  private conn: Promise<WebSocket> | null = null;
  private context: SchematicContext = {};
  private eventQueue: Event[];
  private storage: StoragePersister | undefined;
  private useWebSocket: boolean = false;
  private values: Record<string, Record<string, boolean>> = {};
  private flagListener?: (values: Record<string, boolean>) => void;

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
    if (window?.addEventListener) {
      window.addEventListener("beforeunload", () => {
        this.flushEventQueue();
      });
    }
  }

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

  // Make a REST API call to fetch all flag values for a given context
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

    if (!this.conn) {
      this.conn = this.wsConnect();
    }

    return this.conn.then((socket) => {
      return this.wsSendMessage(socket, context);
    });
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

  private wsSendMessage = (
    socket: WebSocket,
    context: SchematicContext,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (contextString(context) == contextString(this.context)) {
        // Don't reset if context has not changed
        resolve();
        return;
      }

      this.context = context;

      const sendMessage = () => {
        let resolved = false;

        const messageHandler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          // Message may contain only a subset of flags; merge with existing context
          if (!(contextString(context) in this.values)) {
            this.values[contextString(context)] = {};
          }

          (message.flags ?? []).forEach(
            (flag: FlagCheckWithKeyResponseBody) => {
              this.values[contextString(context)][flag.flag] = flag.value;
            },
          );

          if (this.flagListener) {
            this.flagListener(this.values[contextString(context)]);
          }

          if (!resolved) {
            resolved = true;
            resolve();
          }

          socket.removeEventListener("message", messageHandler);
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
        sendMessage();
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener("open", sendMessage);
      } else {
        reject("WebSocket is not open or connecting");
      }
    });
  };
}

function contextString(context: SchematicContext): string {
  const sortedContext = Object.keys(context).reduce((acc, key) => {
    const sortedKeys = Object.keys(
      context[key as keyof SchematicContext] || {},
    ).sort();
    const sortedObj = sortedKeys.reduce((obj, sortedKey) => {
      obj[sortedKey] = context[key as keyof SchematicContext]![sortedKey];
      return obj;
    }, {} as Keys);
    acc[key as keyof SchematicContext] = sortedObj;
    return acc;
  }, {} as SchematicContext);

  return JSON.stringify(sortedContext);
}
