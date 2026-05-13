# schematic-components

`schematic-components` provides client-side React components for customer portals, checkouts, and more using [Schematic](https://schematichq.com). It can be used in combination with [schematic-react](https://github.com/schematichq/schematic-js/tree/main/react), or on its own.

## Install

```bash
npm install @schematichq/schematic-components
# or
yarn add @schematichq/schematic-components
# or
pnpm add @schematichq/schematic-components
```

## Usage

Import components and functions and compose them into your project.

```js
import { EmbedProvider, SchematicEmbed, useEmbed } from '@schematichq/schematic-components';
```

See the [Schematic documentation](https://docs.schematichq.com/components/set-up) for a full guide on how to set up and use Schematic components.

## Advanced Checkout Usage

We provide a function `initializeWithPlan` as an alternate entrypoint into a
checkout flow. It's suitable for click handlers, and must be extracted from
the library's embedded context.

```ts
const { initializeWithPlan } = useEmbed();
```

This function allows developers to create their own button that

* Pre-selects a Plan
* Pre-selects Add-ons (if available)
* Skips and hides plan selection stages

The `initializeWithPlan` function can be called with a Schematic plan ID, or
with a more powerful `BypassConfig` object.

Providing a plan ID as a string will preselect that plan and skip the plan
selection stage.

```ts
initializeWithPlan('plan_VBXv4bHjSf3');
```

Passing a config object allows pre-selecting Add-ons as well as hiding
specific stages.

```ts
const config = {
  planId: 'plan_VBXv4bHjSf3',      // pre-select a Plan
  addOnIds: ['plan_AWv7bPjSx2'],   // pre-select 1 or more Add-ons
  period: 'month',                 // pre-select 'month' or 'year' for the billing period (optional)
  skipped: {
    planStage: true,               // if true, skip Plan selection
    addOnStage: true               // if true, skip Add-on selection
  }
  hideSkipped:  true               // if true, hide skipped stages from breadcrumb navigation
};

initializeWithPlan(config);
```

The Plans and Add-ons available to the checkout flows must be live in your
Schematic account [Catalog configuration](https://docs.schematichq.com/catalog/overview).

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
