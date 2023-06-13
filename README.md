# keynes-js

## Install

```
yarn install
```

## Build

```
yarn run build
```

## Usage example


```javascript
const apiKey = 'your-api-key';
const eventClient = new EventClient(apiKey);

// Send an identify event
const userId = 'my-user-id';
const traits = {
  anykey: 'anyval',
};
eventClient.identify(userId, traits);

// Send a track event
const event = 'purchase';
const properties = {
  userId: 'my-user-id',
  product: 'ABC123',
  quantity: 2,
};
eventClient.track(userId, event, properties);
```
