# @schematichq/schematic-react

A single Schematic SDK for React that unifies what used to be two packages
(websocket-backed flags/entitlements and REST-backed UI components) behind
**one React context, one provider, and one set of hooks** — without bloating
the bundle for users who only need the lightweight surface.

This package replaces both `@schematichq/schematic-react` (legacy WS-only)
and `@schematichq/schematic-components` (legacy UI-only). The
`components/` package is deprecated; its functionality is reachable here
via the `/components` subpath.

## The shape

- `src/context.ts` — the ONE `SchematicContext`. Value type
  `{ client: Schematic | null; embed: unknown | null }`. The `embed` slot
  stays `null` unless a /components import wires it up.
- `src/provider.tsx` — the ONE `SchematicProvider`, a pure plugin host.
  Composes optional `ws` and `embed` adapter components around `children`.
  Holds no React state itself.
- `src/core/WsAdapter.tsx` — WS adapter. Constructs a `Schematic` client
  from `publishableKey` (or accepts a pre-built `client`) and provides the
  context. Auto-bound by both subpath entries; pass `ws={null}` to opt out.
- `src/components/embed/EmbedAdapter.tsx` — embed adapter. REST clients,
  reducer, theme, i18n, fonts. Heavy. Only reachable from the /components
  subpath.

## Subpath exports & tree-shaking

```ts
// Flags / entitlements / events only.
// Bundle is ~6 KB ESM, pulls in NOTHING beyond `react` and
// `@schematichq/schematic-js`.
import { SchematicProvider, useSchematicFlag } from "@schematichq/schematic-react";

// Same provider, plus the REST-backed UI surface (PricingTable, Embed,
// PaymentMethod, etc.). Bundle is ~890 KB ESM with lodash, pako, uuid, and
// @schematichq/schematic-icons inlined; Stripe, styled-components, i18next,
// and react-i18next stay external and must be installed by the consumer.
import { SchematicProvider, PricingTable, useEmbed } from "@schematichq/schematic-react/components";
```

The /components entry's `SchematicProvider` is a thin wrapper that pre-binds
both the `ws` and `embed` adapters — same component name, same context, no
extra setup required from the user.

To use only the UI surface (no WebSocket connection), pass `ws={null}` to
the `/components` `SchematicProvider`:

```tsx
import { SchematicProvider, PricingTable } from "@schematichq/schematic-react/components";

<SchematicProvider publishableKey="..." ws={null}>
  <PricingTable />
</SchematicProvider>
```

`scripts/check-tree-shake.mjs` runs after the build and fails if any
forbidden string (`@stripe/*`, `styled-components`, `i18next`,
`react-i18next`, `@schematichq/schematic-icons`) shows up in the root
bundle, guarding the abstraction.

## Hooks

**Core hooks** (available from both entries; read only `client` from the
context):

- `useSchematicFlag(key, opts?)` — boolean flag value
- `useSchematicEntitlement(key, opts?)` — entitlement check + reason + usage
- `useSchematicPlan(opts?)` — plan + trial status
- `useSchematicEvents(opts?)` — `{ track, identify }`
- `useSchematicContext(opts?)` — `{ setContext }`
- `useSchematicIsPending(opts?)` — boolean loading state
- `useSchematic()` — `{ client }`

**Embed hooks** (only from `/components`; read the embed slot and throw if
called outside an embed-providing tree):

- `useEmbed()` — the full embed surface (data, settings, hydrate, checkout, etc.)
- `useAvailableCurrencies()`
- `useAvailablePlans()`
- `useCustomPlanBilling()`
- `usePaymentConfirmation()`
- `useTrialEnd()`
- `useIsLightBackground()`
- plus internals: `useRequest`, `useWrapChildren`

## Layout

```
react/
├── README.md
├── package.json              # subpath exports + optional peer deps
├── tsconfig.json
├── api-extractor.{core,components}.json
├── eslint.config.mjs
├── vitest.config.ts
├── vitest.setup.ts
├── test.sh
├── version.sh
├── generate_openapi.sh
├── openapitools.json
├── mockServiceWorker.js
├── scripts/
│   └── check-tree-shake.mjs  # post-build invariant guard
└── src/
    ├── context.ts            # ONE SchematicContext
    ├── provider.tsx          # ONE SchematicProvider (plugin host)
    ├── index.tsx             # /core entry — pre-binds WsAdapter
    ├── version.ts
    ├── index.spec.tsx
    ├── core/
    │   ├── WsAdapter.tsx     # WS client adapter
    │   ├── hooks.ts          # 7 core hooks; read from ../context
    │   └── index.ts
    └── components/
        ├── index.tsx         # /components entry — pre-binds both adapters
        ├── api/              # generated OpenAPI clients
        ├── components/       # UI components (PricingTable, Embed, etc.)
        ├── embed/
        │   ├── EmbedAdapter.tsx  # heavy embed implementation
        │   ├── embedReducer.ts
        │   ├── embedState.ts
        │   └── index.ts
        ├── hooks/            # 11 embed hooks
        ├── const/
        ├── localization/     # i18n (side-effectful import)
        ├── types/
        ├── utils/
        └── test/             # MSW handlers + setup
```

## Build

```bash
yarn build
```

Emits:

```
dist/
├── schematic-react.cjs.js          # ~8.5 KB
├── schematic-react.esm.js          # ~6 KB
├── schematic-react.d.ts            # rolled-up types
└── components/
    ├── schematic-react-components.cjs.js   # ~925 KB
    ├── schematic-react-components.esm.js   # ~893 KB
    └── schematic-react-components.d.ts     # rolled-up types
```

## Test

```bash
yarn test          # one-shot
yarn test:watch    # watch mode
```

Tests run under `jsdom` with MSW-mocked APIs. Fixtures live in
`src/components/test/`.

## Notes

- `sideEffects` is an array, not `false` — only
  `./src/components/localization/**` has side effects (i18next registers
  translation resources on import). Marking the whole package as
  side-effect-free would drop that import during bundling.
- `resolutions.undici` is pinned to `^7.24.0`. `jsdom@29` uses a 7.x API
  in `jsdom-dispatcher.js` that isn't present in `undici@8`.
- The bundled deps for `/components` (lodash, pako, uuid,
  `@schematichq/schematic-icons`) sit in `devDependencies` so they're
  available during build but aren't installed by consumers — esbuild inlines
  them.
- esbuild defines `process.env.SCHEMATIC_COMPONENTS_VERSION` at build time;
  the value is read from `package.json` and surfaced in the
  `X-Schematic-Components-Version` request header.
- The JS `SchematicContext` type (the user/company context shape from
  `@schematichq/schematic-js`) is intentionally **not** re-exported — its
  name collides with the React context we expose. Import it directly from
  `@schematichq/schematic-js` if you need to type your user/company context.

## Migration from prior packages

- **Legacy `@schematichq/schematic-react` (WS-only) users:** root entry's
  import surface is unchanged. Bump the version and you're done.
- **Legacy `@schematichq/schematic-components` users:** change the package
  name and append `/components` to your imports. `EmbedProvider` is no
  longer exported — use `SchematicProvider` from `/components`, which
  pre-binds the embed adapter. The `apiKey` prop is gone; the same
  `publishableKey` authenticates both the WS client and the public REST
  surface.
