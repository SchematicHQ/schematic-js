import * as uuid from "uuid";

const anonymousIdKey = "schematicId";
export type EventType = "identify" | "track";

export type Keys = Record<string, string>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Traits = Record<string, any>;

export type SchematicContext = {
  company?: Keys;
  user?: Keys;
};

export type EventBodyCompany = {
  keys: Keys;
  name?: string;
  traits: Traits;
};

export type EventBodyIdentify = {
  company?: EventBodyCompany;
  keys: Keys;
  name?: string;
  traits: Traits;
};

export type EventBodyTrack = SchematicContext & {
  event: string;
  traits: Traits;
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

type StoragePersister = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setItem(key: string, value: any): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  getItem(key: string): any;
  removeItem(key: string): void;
};

type SchematicOptions = {
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
  private conn: WebSocket | null = null;
  private context: SchematicContext = {};
  private eventQueue: Event[];
  private storage: StoragePersister | undefined;
  private useWebSocket: boolean = false;
  private values: Record<string, Record<string, boolean>> = {};

  constructor(apiKey: string, options?: SchematicOptions) {
    this.apiKey = apiKey;
    this.eventQueue = [];
    this.useWebSocket = options?.useWebSocket ?? false;

    if (options?.storage) {
      this.storage = options.storage;
    } else if (typeof localStorage !== "undefined") {
      this.storage = localStorage;
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.flushEventQueue();
      });
    }
  }

  checkFlag = async (options: CheckOptions): Promise<boolean> => {
    const { fallback = false, key } = options;
    const context = options.context || this.context;

    if (this.useWebSocket) {
      const contextVals = this.values[contextString(context)] ?? {};
      return typeof contextVals[key] === "undefined" ? fallback : contextVals[key];
    }

    const requestUrl = `https://api.schematichq.com/flags/${key}/check`;
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
  };

  // Make a REST API call to fetch all flag values for a given context
  checkFlags = async (
    context?: SchematicContext,
  ): Promise<Record<string, boolean>> => {
    context = context || this.context;

    const requestUrl = "https://api.schematichq.com/flags/check";
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

  cleanup = (): void => {
    if (this.conn) {
      this.conn.close();
    }
  };

  // Send an identify event
  identify = (body: EventBodyIdentify): void => {
    this.handleEvent("identify", body);
  };

  // Set the flag evaluation context; if the context has changed,
  // this will open a websocket connection (if not already open)
  // and submit this context. The promise will resolve when the
  // websocket sends back an initial set of flag values.
  setContext = (context: SchematicContext): Promise<void> => {
    if (!this.useWebSocket) {
      this.context = context;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.wsConnect().then(() => {
        this.wsSendMessage(context);
        resolve();
      });
    });
  };

  // Send track event
  track = (body: EventBodyTrack): void => {
    this.handleEvent("track", body);
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

  private handleEvent = (eventType: EventType, eventBody: EventBody): void => {
    const event: Event = {
      api_key: this.apiKey,
      body: eventBody,
      sent_at: new Date().toISOString(),
      tracker_event_id: uuid.v4(),
      tracker_user_id: this.getAnonymousId(),
      type: eventType,
    };

    if (typeof document !== "undefined" && document.hidden) {
      this.storeEvent(event);
    } else {
      this.sendEvent(event);
    }
  };

  private sendEvent = (event: Event): void => {
    const captureUrl = "https://c.schematichq.com/e";
    const payload = JSON.stringify(event);

    fetch(captureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: payload,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.statusText}`,
          );
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
      });
  };

  private storeEvent = (event: Event): void => {
    this.eventQueue.push(event);
  };

  private wsConnect = (): Promise<void> => {
    return new Promise((resolve) => {
      if (this.conn) {
        resolve();
      }

      const wsUrl = "wss://api.schematichq.com/flags/bootstrap";
      const webSocket = new WebSocket(wsUrl);
      this.conn = webSocket;

      webSocket.onopen = () => {
        resolve();
      };

      webSocket.onclose = () => {
        this.conn = null;
      };
    });
  };

  // Sends a message with a new context over the websocket connection
  private wsSendMessage = (context: SchematicContext): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (contextString(context) == contextString(this.context)) {
        // Don't reset if context has not changed
        resolve();
      }

      this.context = context;

      if (!this.conn) {
        reject("Not connected");
        return;
      }

      if (this.conn.readyState === WebSocket.OPEN) {
        let resolved = false;

        this.conn.onmessage = (event) => {
          const message = JSON.parse(event.data);

          this.values[contextString(context)] = (message.flags ?? []).reduce(
            (
              accum: Record<string, boolean>,
              flag: FlagCheckWithKeyResponseBody,
            ) => {
              accum[flag.flag] = flag.value;
              return accum;
            },
            {},
          );

          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        this.conn.onerror = (error) => {
          console.error("Schematic websocket error: ", error);
        };

        this.conn.send(
          JSON.stringify({
            apiKey: this.apiKey,
            data: context,
          }),
        );
      } else if (this.conn.readyState === WebSocket.CONNECTING) {
        this.conn.onopen = () => {
          this.wsSendMessage(context);
        };
      } else {
        reject("Not connected");
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
