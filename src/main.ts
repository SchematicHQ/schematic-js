import zlib from 'zlib';
import querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';

const anonymousIdKey = 'schematicId';

type EventType = 'identify' | 'track';

type EventBodyCustomer = {
  id: string;
  name?: string;
  traits: Record<string, any>;
};

type EventBodyIdentify = {
  id: string;
  traits: Record<string, any>;
  customer?: EventBodyCustomer;
};

type EventBodyTrack = {
  event: string;
  feature?: string;
  traits: Record<string, any>;
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

class Schematic {
  private apiKey: string;
  private eventQueue: Event[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.eventQueue = [];
  }

  private sendEvent(event: Event): void {
    const url = 'https://api.schematichq.com/e';
    const payload = JSON.stringify(event);

    zlib.deflate(payload, (err, compressedData) => {
      if (err) {
        console.error('Error compressing event data:', err);
        return;
      }

      const base64EncodedData = compressedData.toString('base64');
      const escapedData = querystring.escape(base64EncodedData);
      const requestUrl = `${url}?p=${escapedData}`;

      const request = new XMLHttpRequest();
      request.open('GET', requestUrl);
      request.send();
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
      tracker_event_id: uuidv4(),
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

    const generatedAnonymousId = uuidv4();
    localStorage.setItem(anonymousIdKey, generatedAnonymousId);
    return generatedAnonymousId;
  }

  identify(userId: string, traits: Record<string, any>, customer?: EventBodyCustomer): void {
    const eventBody: EventBodyIdentify = {
      id: userId,
      customer,
      traits,
    };

    this.handleEvent('identify', eventBody);
  }

  track(event: string, traits: Record<string, any>): void {
    const eventBody: EventBodyTrack = {
      event,
      traits: traits,
    };

    this.handleEvent('track', eventBody);
  }

  initialize(): void {
    // Add an event listener to detect when the window is about to close
    window.addEventListener('beforeunload', () => {
      this.flushEventQueue();
    });

    // Retrieve and process any stored events from local storage
    const storedEvents = localStorage.getItem('eventQueue');
    if (storedEvents) {
      this.eventQueue = JSON.parse(storedEvents);
      this.flushEventQueue();
      this.clearStoredEvents();
    }
  }
}

export default Schematic;
