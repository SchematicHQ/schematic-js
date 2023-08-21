# schematic-js

## Install

```
yarn install
```

## Build

```
yarn build
```

## Usage example

```javascript
const schematic = new Schematic("your-api-key");

// Send an identify event
const userId = "my-user-id";
const keys = {
  id: userId,
};
const traits = {
  anykey: "anyval",
};
const company = {
  name: "My Company",
  keys: {
    id: "my-company-id",
  },
  traits: {
    location: "Atlanta, GA",
  },
};
schematic.identify({ keys, traits, company });

// Send a track event
const event = "query";
const traits = {
};
const company = {
};
const user = {
},
schematic.track({
  event: "query",
  traits: {
      feature: "feat_cns2asuKAG2",
  },
  company: {
    id: "my-company-id",
  },
  name: "My User",
  user: {
    id: "my-user-id",
  },
});
```
