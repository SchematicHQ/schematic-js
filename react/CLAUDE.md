# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`schematic-react` is a client-side React library for [Schematic](https://schematichq.com) that provides hooks to track events, check flags, and more. It offers React-specific wrappers around the core functionality provided by `@schematichq/schematic-js`.

## Repository Structure

- `/src/context`: Contains the SchematicProvider component and context
- `/src/hooks`: Contains React hooks for interacting with Schematic
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

The library is built on a React context pattern:

1. `SchematicProvider`: React context provider that initializes the Schematic client
   - Accepts either a publishable key or a pre-configured client
   - Manages client lifecycle (cleanup on unmount)

2. Core Hooks:
   - `useSchematicFlag`: Check feature flag values
   - `useSchematicEntitlement`: Check entitlements with usage data
   - `useSchematicEvents`: Track events and identify users/companies
   - `useSchematicIsPending`: Check if data is still loading
   - `useSchematicContext`: Access and modify context

## Development Guidelines

- Maintain React best practices, especially regarding hooks dependencies and memoization
- Ensure backward compatibility for public API
- Follow existing patterns when adding new hooks or features
- Make sure to run `yarn build` before committing changes to verify the build works

## Dependencies

- React >=18 (peer dependency)
- @schematichq/schematic-js (main dependency)