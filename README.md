# schematic-js

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
const schematic = new Schematic('your-api-key');

// Send an identify event
const userId = 'my-user-id';
const traits = {
  anykey: 'anyval',
};
const customer = {
  id: 'my-customer-id',
  name: 'My Customer',
  traits: {
    'location': 'Atlanta, GA'
  },
};
schematic.identify(userId, traits, customer);

// Send a track event
const event = 'query';
const traits = {
  customerId: 'my-customer-id',
  feature: 'feat_cns2asuKAG2',
};
schematic.track(event, traits);
```
