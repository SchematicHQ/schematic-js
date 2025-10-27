# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`schematic-vue` is a client-side Vue library for [Schematic](https://schematichq.com) that provides composables to track events, check flags, and more. It offers Vue-specific wrappers around the core functionality provided by `@schematichq/schematic-js`.

## Repository Structure

- `/src/context`: Contains the SchematicPlugin and provide/inject logic
- `/src/composables`: Contains Vue composables for interacting with Schematic
- `/src/version.ts`: Auto-generated version info (do not edit directly)

## Development Commands

### Build Commands

```bash
# Watch mode for development
yarn dev

# Full build process
yarn build

# Individual build steps
yarn build:cjs     # Build CommonJS bundle
yarn build:esm     # Build ESM bundle 
yarn build:types   # Build TypeScript types
```

### Code Quality Commands

```bash
# Run TypeScript compiler
yarn tsc

# Format code with Prettier
yarn format

# Run ESLint with auto-fix
yarn lint

# Run tests
yarn test
```

### Other Commands

```bash
# Clean build artifacts
yarn clean
```

## Architecture

The library is built on Vue's provide/inject pattern:

1. `SchematicPlugin`: Vue plugin that initializes the Schematic client
   - Accepts either a publishable key or a pre-configured client
   - Uses Vue's `provide()` to make the client available throughout the app
   - Client lifecycle should be managed by the application (cleanup when app unmounts)

2. Core Composables:
   - `useSchematicFlag`: Check feature flag values (returns `Ref<boolean>`)
   - `useSchematicEntitlement`: Check entitlements with usage data (returns object with computed refs)
   - `useSchematicEvents`: Track events and identify users/companies
   - `useSchematicIsPending`: Check if data is still loading (returns `Ref<boolean>`)
   - `useSchematicContext`: Access and modify context

## Vue-Specific Patterns

### Reactivity

- All composables return Vue refs or computed values for automatic reactivity
- Uses `ref()` for mutable state and `computed()` for derived state
- Subscriptions to the Schematic client are set up with listeners
- Listeners are automatically cleaned up using `onUnmounted()`

### Provide/Inject

- Uses Vue's `InjectionKey` for type-safe injection
- The `SchematicSymbol` is the injection key used throughout the library
- Components must have the plugin installed to use the composables

### Lifecycle Management

- Uses `onUnmounted()` to clean up event listeners
- Client cleanup (closing WebSocket) should be handled at the app level
- Each composable manages its own listener subscriptions

## Development Guidelines

- Follow Vue 3 Composition API best practices
- Ensure all reactive values are properly typed
- Clean up listeners in `onUnmounted()` hooks
- Maintain backward compatibility for public API
- Follow existing patterns when adding new composables
- Make sure to run `yarn build` before committing changes to verify the build works

## Differences from React SDK

1. **State Management**: Uses Vue's `ref()` and `computed()` instead of React's `useSyncExternalStore`
2. **Provider Pattern**: Uses Vue plugin with `provide()`/`inject()` instead of React Context
3. **Lifecycle**: Uses `onUnmounted()` instead of React's `useEffect` cleanup
4. **Reactivity**: Vue's reactivity system auto-tracks dependencies; React requires explicit dependencies
5. **Templates**: Refs are auto-unwrapped in templates, making usage cleaner

## Dependencies

- Vue >=3.3 (peer dependency)
- @schematichq/schematic-js (main dependency)

## Testing

Tests use `@vue/test-utils` for mounting components and testing composables within the Vue environment.

