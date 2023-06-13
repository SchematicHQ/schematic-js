import zlib from 'zlib';
import querystring from 'querystring';

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

class Schematic {
  private apiKey: string;
  private eventQueue: { type: EventType; data: object }[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.eventQueue = [];
  }

  private sendRequest(eventType: EventType, eventData: object): void {
    const url = 'https://api.schematichq.com/e';

    const payload = JSON.stringify({
      type: eventType,
      api_key: this.apiKey,
      body: eventData,
    });

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
        this.sendRequest(event.type, event.data);
      }
    }
  }

  private storeEvent(eventType: EventType, eventData: object): void {
    this.eventQueue.push({ type: eventType, data: eventData });
  }

  private clearStoredEvents(): void {
    this.eventQueue = [];
  }

  identify(userId: string, traits: Record<string, any>): void {
    const eventData: EventBodyIdentify = {
      id: userId,
      traits,
    };

    if (document.hidden) {
      this.storeEvent('identify', eventData);
    } else {
      this.sendRequest('identify', eventData);
    }
  }

  track(event: string, properties: Record<string, any>): void {
    const eventData: EventBodyTrack = {
      event,
      traits: properties,
    };

    if (document.hidden) {
      this.storeEvent('track', eventData);
    } else {
      this.sendRequest('track', eventData);
    }
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
