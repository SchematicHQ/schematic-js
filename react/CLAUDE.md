# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project overview

`@schematichq/schematic-react` is the unified React SDK for
[Schematic](https://schematichq.com). It merges the legacy
`schematic-react` (WS-backed flags/entitlements) and `schematic-components`
(REST-backed UI) packages behind a single provider with subpath exports.
The root entry stays lightweight; the heavier UI surface ships from
`@schematichq/schematic-react/components`.

## Subpath exports

- `@schematichq/schematic-react` — root entry. WS-backed flags,
  entitlements, events, plan info. Pulls in `react` and (as an external)
  `@schematichq/schematic-js` and nothing else.
- `@schematichq/schematic-react/components` — UI surface. Re-exports the
  root entry, plus `lazy`-wrapped UI components (`PricingTable`,
  `PaymentMethod`, `CheckoutDialog`, etc.) and the embed-side hooks
  (`useEmbed`, `useAvailablePlans`, …).
- `@schematichq/schematic-react/composable` — headless primitive surface.
  Fully headless, Radix-style compound components (`PricingTable.Root`,
  `PricingTable.Plan`, `PaymentMethod.Root`, …): behavior + state +
  semantic `data-schematic-*` attributes + `asChild` (Slot) polymorphism,
  zero visual styling. Source lives in `src/components/composable/`. The
  default-styled `/components` exports are thin wrappers over these
  primitives. This bundle pulls in NONE of styled-components/Stripe/
  i18next/icons — `scripts/check-tree-shake.mjs` enforces that, and an
  ESLint `no-restricted-imports` rule scoped to
  `src/components/composable/**` is the compile-time analog. Data/state is
  sourced from the same styled-free hooks (`useEmbed`, `useAvailablePlans`),
  so the bundle externalizes `@schematichq/schematic-react` to share the
  single `SchematicContext` instance (SCHY-372).

## Architecture

`SchematicProvider` is a thin wrapper around the bare plugin host in
`src/provider.tsx`. The host composes optional adapter components into the
tree and forwards a per-adapter slice of props to each.

- `src/context.ts` — the single `SchematicContext`. Value shape
  `{ client, embed }`.
- `src/provider.tsx` — bare provider. Wraps `children` in an inner
  Suspense boundary (isolates `useEmbed` throws), mounts whichever
  adapters are bound, and wraps the whole tree in an outer Suspense
  boundary that uses the consumer's `fallback`. Filters props per-adapter
  via `pickWsProps` / `pickEmbedProps`.
- `src/core/WsAdapter.tsx` — WS adapter. Constructs (or accepts) a
  `Schematic` client, provides the WS slot, cleans up on unmount. Warns
  in dev when `publishableKey` or `client` changes after mount (the
  initial value is captured by design).
- `src/components/embed/EmbedAdapter.tsx` — embed adapter. REST clients,
  reducer, theme, i18n, fonts. Heavy — only mounted from the /components
  subpath, and even then only lazily.
- `src/embed-loader.ts` — coordinates the lazy embed mount. Exposes a
  `useSyncExternalStore`-compatible store the bare provider subscribes
  to, plus `SchematicEmbedDisabledContext` so `useEmbed` can throw an
  explicit error when `embed={null}` is the active opt-out.

### Lazy embed loading (the Path C mechanism)

By default, neither entry's `SchematicProvider` pre-binds the embed
adapter. When a descendant calls `useEmbed` (or mounts one of the lazy UI
components), the hook throws the embed adapter's import promise. The
inner Suspense boundary inside the bare provider catches it; the provider
re-renders with the dynamically-loaded adapter mounted; the suspended
component retries inside the populated context.

Three opt-in / opt-out paths:

- `embed={undefined}` (default) — lazy load on first `useEmbed`.
- `embed={EmbedAdapter}` — eager mount at provider time. `EmbedAdapter`
  is exported from `/components` as a thin function-component wrapper
  around a `React.lazy` ref (the chunk-split shape is preserved).
- `embed={null}` — explicit opt-out. The provider publishes
  `SchematicEmbedDisabledContext={true}`; `useEmbed` throws a clear error
  instead of looping on a Suspense throw the provider would never resolve.

### Provider props (discriminated union)

Both entries restore the v1 `client xor publishableKey` requirement and
add a third arm:

```ts
type SchematicProviderProps = CommonProps &
  ( { client: Schematic; publishableKey?: never }
  | { client?: never; publishableKey: string }
  | { client?: never; publishableKey?: string; ws: null }
  );
```

The bare provider in `provider.tsx` keeps a loose flat shape
(`SchematicProviderBaseProps`); the wrappers in `src/index.tsx` and
`src/components/index.tsx` apply the union at the public API boundary.

## Development commands

```bash
# Watch mode (types only)
yarn dev

# Full build (regenerates version.ts, builds core + components, types,
# tree-shake invariant)
yarn build

# Specific build steps
yarn build:core:cjs
yarn build:core:esm
yarn build:components:cjs
yarn build:components:esm
yarn build:types
yarn check:tree-shake   # fails if heavy deps leak into the root bundle

# Quality
yarn tsc
yarn format
yarn lint

# Test
yarn test           # one-shot
yarn test:watch     # vitest watch

# OpenAPI client regeneration
yarn openapi
```

Tests run under `jsdom` (configured in `vitest.config.ts`); MSW handlers
live in `src/components/test/`.

## Conventions

- The root entry must not pull in any styled-components, Stripe, i18next,
  or `@schematichq/schematic-icons` code. `scripts/check-tree-shake.mjs`
  fails the build if any of those strings appear in
  `dist/schematic-react.esm.js`.
- `version.ts` is auto-generated by `version.sh` from `package.json`. Do
  not hand-edit it. Both adapters read this single source for their
  `X-Schematic-*-Version` headers.
- `@schematichq/schematic-js` is **external** in all four esbuild builds
  and declared in `dependencies` so the consumer's install supplies a
  single instance (avoids the dual-package hazard).
- WS adapter prop changes after mount are intentionally ignored (the
  WebSocket connection should outlive prop churn); the dev-mode warning
  exists so a stale credential isn't silently retained.
- New embed UI components must be `React.lazy`-wrapped in
  `src/components/index.tsx`; non-lazy exports would pull
  styled-components into the /components main bundle.
- When decomposing a page component into the `/composable` layer, follow
  the established pattern (`pricing-table`, `payment-method`): a
  `usX()` controller hook + `context.tsx` that lifts the container's
  state/derivation, a pure-provider `Root`, headless `parts`, and an
  `index.tsx` that assembles the dot-notation namespace via
  `Object.assign(Root, { … })`. The styled `/components` wrapper then
  consumes the controller context and keeps the legacy markup, `sch-*`
  classNames, and `data-testid`s unchanged. The dot-notation namespace
  lives only on the (non-lazy) `/composable` export — never bolt statics
  onto the lazy styled export.
- When adding a new adapter slot or prop, update `pickWsProps` /
  `pickEmbedProps` in `provider.tsx` so each adapter only sees what it
  consumes.

## Dependencies

- `react >= 18` (peer)
- `@schematichq/schematic-js` (runtime dep)
- `/components` peers (optional): `@stripe/react-stripe-js`,
  `@stripe/stripe-js`, `styled-components`, `i18next`, `react-i18next`,
  `react-dom`.
