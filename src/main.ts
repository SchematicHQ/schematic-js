import querystring from 'querystring';
import zlib from 'zlib';

class Schematic {
  private apiKey: string;
  private apiDomain: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiDomain = 'https://api.schematichq.com/';
  }

  private sendRequest(eventType: string, eventData: object): void {
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
      const requestUrl = `${this.apiDomain}e?p=${escapedData}`;

      const request = new XMLHttpRequest();
      request.open('GET', requestUrl);
      request.send();
    });
  }

  identify(userId: string, traits: object): void {
    const eventData = {
      id: userId,
      traits,
    };
    this.sendRequest('identify', eventData);
  }

  track(userId: string, event: string, properties: object): void {
    const eventData = {
      id: userId,
      event,
      properties,
    };
    this.sendRequest('track', eventData);
  }
}

export default Schematic;
