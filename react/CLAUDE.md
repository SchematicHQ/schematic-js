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
bun run dev

# Full build process
bun run build

# Individual build steps
bun run build:cjs     # Build CommonJS bundle
bun run build:esm     # Build ESM bundle
bun run build:types   # Build TypeScript types
```

### Code Quality Commands

```bash
# Run TypeScript compiler
bun run tsc

# Format code with Prettier
bun run format

# Run ESLint with auto-fix
bun run lint

# Run tests
bun test
```

### Other Commands

```bash
# Clean build artifacts
bun run clean
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
- Make sure to run `bun run build` before committing changes to verify the build works

## Dependencies

- React >=18 (peer dependency)
- @schematichq/schematic-js (main dependency)