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
  entitlements, events, plan info. Pulls in `react` and nothing else
  eagerly: `@schematichq/schematic-js` (an external) is lazy-loaded with
  the WS adapter on first core-hook use, so a consumer who only uses the
  UI surface (`ws={null}`) tree-shakes it out.
- `@schematichq/schematic-react/components` — UI surface. Re-exports the
  root entry, plus `lazy`-wrapped UI components (`PricingTable`,
  `PaymentMethod`, `CheckoutDialog`, etc.) and the embed-side hooks
  (`useEmbed`, `useAvailablePlans`, …).
- `@schematichq/schematic-react/headless` — headless primitive surface.
  Fully headless, Radix-style compound components (`UsageMeter.Root`,
  `UsageMeter.Track`, `UsageMeter.Fill`, …): behavior + state + semantic
  `data-schematic-*` attributes + `asChild` (Slot) polymorphism, zero
  visual styling. Source lives in `src/headless/`. The default-styled
  exports (e.g. `UsageMeter` from the root entry) are thin wrappers over
  the same controller hooks. This bundle pulls in NONE of
  styled-components/Stripe/i18next/icons — `scripts/check-tree-shake.mjs`
  enforces that, and an ESLint `no-restricted-imports` rule scoped to
  `src/headless/**` is the compile-time analog. Data/state is sourced
  from the same styled-free hooks (`useUsageMeter`, …) imported via the
  package self-specifier, so the bundle externalizes
  `@schematichq/schematic-react` to share the single `SchematicContext`
  instance (SCHY-372).

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
  initial value is captured by design). It is the only root-entry code
  that imports `@schematichq/schematic-js` at runtime (`new Schematic`),
  so it is reachable only via a dynamic `import()` — lazy by default.
- `src/components/embed/EmbedAdapter.tsx` — embed adapter. REST clients,
  reducer, theme, i18n, fonts. Heavy — only mounted from the /components
  subpath, and even then only lazily.
- `src/embed-loader.ts` / `src/ws-loader.ts` — coordinate the lazy embed
  and WS mounts. Each exposes a `useSyncExternalStore`-compatible store the
  bare provider subscribes to, plus a disabled-signal context
  (`SchematicEmbedDisabledContext` / `SchematicWsDisabledContext`) so the
  relevant hooks throw an explicit error when `embed={null}` / `ws={null}`
  is the active opt-out.

### Lazy adapter loading (the Path C mechanism)

By default, `SchematicProvider` pre-binds neither adapter — both the embed
and WS adapters are loaded on demand via a dynamic `import()`. When a
descendant needs an adapter, it triggers the import; the bare provider
subscribes to that adapter's loader store via `useSyncExternalStore` and
re-renders with the dynamically-loaded adapter mounted.

Embed and WS differ in how the trigger surfaces:

- **Embed** — `useEmbed` (and the embed UI components) throw the import
  promise; the inner Suspense boundary catches it and the suspended
  component retries inside the populated context.
- **WS** — the client-returning core hooks (`useSchematic`,
  `useSchematicEvents`, `useSchematicContext`) throw the import promise
  (suspend). The value hooks (`useSchematicFlag`, `useSchematicEntitlement`,
  `useSchematicPlan`, `useSchematicIsPending`) do **not** suspend: they
  trigger the load from an effect and return their fallback until the
  client is bound, preserving the instant-fallback contract.

Opt-in / opt-out paths (symmetric for `ws` and `embed`):

- `undefined` (default) — lazy load on first use.
- `EmbedAdapter` / `WsAdapter` — eager mount at provider time. Each is
  exported as a thin function-component wrapper around a `React.lazy` ref
  (the chunk-split shape is preserved); `EmbedAdapter` from `/components`,
  `WsAdapter` from the root entry.
- `null` — explicit opt-out (`ws={null}` is UI-only mode). The provider
  publishes the matching disabled-signal context; the relevant hooks throw
  a clear error instead of looping on a Suspense throw the provider would
  never resolve.

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

- The root entry's eager (static-import) graph must not pull in any
  styled-components, Stripe, i18next, or `@schematichq/schematic-icons`
  code, nor the WS adapter runtime. `scripts/check-tree-shake.mjs` walks
  the static-import graph rooted at `dist/schematic-react.esm.js` and fails
  the build if any forbidden dep string appears, or if the WS adapter's
  marker (`X-Schematic-Client-Version`) shows up — that marker leaking out
  of its dynamic chunk means `WsAdapter` (and `new Schematic`) is no longer
  lazy. The WS adapter must therefore only ever be reached via a dynamic
  `import()` (in `ws-loader.ts` and the `WsAdapter` export in
  `src/index.tsx`); never add a static import of `./core/WsAdapter`.
- `@schematichq/schematic-js`'s value re-exports (`Schematic`, `RuleType`,
  `TrialStatus`, `UsagePeriod`) are the one place the specifier appears in
  the eager graph — that's fine: they're pure re-export bindings of an
  external, tree-shaken per-consumer when unused, and intentionally not in
  the `check-tree-shake` forbidden list. Core hooks reference the package
  with `import type` only.
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
- When decomposing a component into the `/headless` layer, follow the
  `usage-meter` pattern: a styled-free controller hook that lifts all
  derivation (`src/core/components/usage-meter/controller.ts`), a
  pure-provider `Root`, headless `parts`, and an `index.tsx` assembling the
  dot-notation namespace via `Object.assign(Root, { … })`. The headless
  `Root` reads the controller via the package self-specifier
  (`@schematichq/schematic-react`); that specifier is externalized in the
  /components and /headless builds (so those bundles share the single
  installed `SchematicContext`) and resolves to local source via the
  tsconfig `paths` mapping in the root build. The default-styled export is a
  thin wrapper that mounts the headless `Root` and styles the parts —
  reading derived data from the part context hook
  (`useUsageMeterContext`) — exactly as a consumer would. Importing the
  headless parts into the root entry is fine: they pull in no heavy peers,
  so the root tree-shake invariant still holds. The dot-notation namespace
  lives only on the `/headless` export.
- When adding a new adapter slot or prop, update `pickWsProps` /
  `pickEmbedProps` in `provider.tsx` so each adapter only sees what it
  consumes.

## Dependencies

- `react >= 18` (peer)
- `@schematichq/schematic-js` (runtime dep)
- `/components` peers (optional): `@stripe/react-stripe-js`,
  `@stripe/stripe-js`, `styled-components`, `i18next`, `react-i18next`,
  `react-dom`.
