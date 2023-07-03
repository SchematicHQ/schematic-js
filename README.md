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
const company = {
  id: 'my-company-id',
  name: 'My Company',
  traits: {
    'location': 'Atlanta, GA'
  },
};
schematic.identify(userId, traits, company);

// Send a track event
const event = 'query';
const traits = {
  companyId: 'my-company-id',
  feature: 'feat_cns2asuKAG2',
};
schematic.track(event, traits);
```
