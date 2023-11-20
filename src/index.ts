import * as uuid from "uuid";

const anonymousIdKey = "schematicId";

type EventType = "identify" | "track";

type EventBodyCompany = {
  keys: Record<string, string>;
  name?: string;
  traits: Record<string, any>;
};

type EventBodyIdentify = {
  company?: EventBodyCompany;
  keys: Record<string, string>;
  name?: string;
  traits: Record<string, any>;
};

type EventBodyTrack = {
  event: string;
  traits: Record<string, any>;
  company?: Record<string, string>;
  user?: Record<string, string>;
};

type EventBody = EventBodyIdentify | EventBodyTrack;

type Event = {
  api_key: string;
  body: EventBody;
  sent_at: string;
  tracker_event_id: string;
  tracker_user_id: string;
  type: EventType;
};

type FlagCheckContext = {
  company?: Record<string, string>;
  user?: Record<string, string>;
};

/* @preserve */
export class Schematic {
  private apiKey: string;
  private eventQueue: Event[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.eventQueue = [];
  }

  private sendEvent(event: Event): void {
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
  }

  private flushEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }

  private storeEvent(event: Event): void {
    this.eventQueue.push(event);
  }

  private clearStoredEvents(): void {
    this.eventQueue = [];
  }

  private handleEvent(eventType: EventType, eventBody: EventBody): void {
    const event: Event = {
      api_key: this.apiKey,
      body: eventBody,
      sent_at: new Date().toISOString(),
      tracker_event_id: uuid.v4(),
      tracker_user_id: this.getAnonymousId(),
      type: eventType,
    };

    if (document.hidden) {
      this.storeEvent(event);
    } else {
      this.sendEvent(event);
    }
  }

  private getAnonymousId(): string {
    const storedAnonymousId = localStorage.getItem(anonymousIdKey);
    if (storedAnonymousId) {
      return storedAnonymousId;
    }

    const generatedAnonymousId = uuid.v4();
    localStorage.setItem(anonymousIdKey, generatedAnonymousId);
    return generatedAnonymousId;
  }

  async checkFlag(key: string, context: FlagCheckContext): Promise<boolean> {
    if (!context.company && !context.user) {
      return Promise.resolve(false);
    }

    const requestUrl = `https://api.schematichq.com/flags/${key}/check`;
    const requestBody = JSON.stringify(context);

    return fetch(requestUrl, {
      method: "POST",
      headers: {
        "X-Schematic-Api-Key": this.apiKey,
        "Content-Type": "application/json;charset=UTF-8",
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
        return data.data.value;
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        return false;
      });
  }

  identify(body: EventBodyIdentify): void {
    this.handleEvent("identify", body);
  }

  track(body: EventBodyTrack): void {
    this.handleEvent("track", body);
  }

  initialize(): void {
    // Add an event listener to detect when the window is about to close
    window.addEventListener("beforeunload", () => {
      this.flushEventQueue();
    });

    // Retrieve and process any stored events from local storage
    const storedEvents = localStorage.getItem("eventQueue");
    if (storedEvents) {
      this.eventQueue = JSON.parse(storedEvents);
      this.flushEventQueue();
      this.clearStoredEvents();
    }
  }
}
