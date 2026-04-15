# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`schematic-angular` is a client-side Angular library for [Schematic](https://schematichq.com) that provides an injectable service to track events, check flags, and more. It offers Angular-specific wrappers around the core functionality provided by `@schematichq/schematic-js`.

## Repository Structure

- `/src/provide.ts`: Contains the `provideSchematic()` function and `SCHEMATIC_CLIENT` InjectionToken
- `/src/schematic.service.ts`: Contains the `SchematicService` with Observable-based methods
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

The library is built on Angular's dependency injection pattern:

1. `provideSchematic()`: Provider function that initializes the Schematic client
   - Accepts either a publishable key or a pre-configured client
   - Uses `makeEnvironmentProviders` for compatibility with both standalone and NgModule apps
   - Manages client lifecycle (cleanup via DestroyRef)

2. `SchematicService`: Single injectable service exposing all functionality
   - `flagValue$(key)`: Check feature flag values (returns `Observable<boolean>`)
   - `entitlement$(key)`: Check entitlements with usage data (returns `Observable<CheckFlagReturn>`)
   - `plan$()`: Get plan information (returns `Observable<CheckPlanReturn | undefined>`)
   - `isPending$()`: Check if data is still loading (returns `Observable<boolean>`)
   - `setContext(ctx)`: Set the evaluation context
   - `identify(body)`: Identify users/companies
   - `track(body)`: Track usage events

## Angular-Specific Patterns

### Dependency Injection

- Uses `InjectionToken` for the raw Schematic client
- `SchematicService` uses bare `@Injectable()` and is provided explicitly via `provideSchematic()`, ensuring consumers get a clear error if they forget to call the provider function
- Consumer apps call `provideSchematic()` in their app config

### Reactivity

- All reactive methods return RxJS Observables
- Observables use `shareReplay({ bufferSize: 1, refCount: true })` for late subscribers
- Observable instances are cached per key to avoid duplicate subscriptions
- Consumers can use `toSignal()` from `@angular/core/rxjs-interop` for Signal-based usage

### Lifecycle Management

- Client cleanup registered via `DestroyRef.onDestroy()` in the provider factory
- If a pre-configured client is provided, cleanup is the caller's responsibility

## Development Guidelines

- Follow Angular best practices for services and dependency injection
- Ensure all Observable methods emit an initial value synchronously
- Maintain backward compatibility for public API
- Follow existing patterns when adding new methods
- Make sure to run `yarn build` before committing changes to verify the build works

## Dependencies

- Angular >=16 (peer dependency). Note: the signal convenience methods (`flagValue`, `entitlement`, `plan`, `isPending`) use `toSignal` from `@angular/core/rxjs-interop`, which was introduced in Angular 16.
- RxJS >=7 (peer dependency)
- @schematichq/schematic-js (main dependency)
