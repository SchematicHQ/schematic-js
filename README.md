# Schematic JavaScript Monorepo

This directory contains the core JavaScript/TypeScript packages and scripts for Schematic, including reusable components, React bindings, and utility scripts.

This monorepo is managed with [Bun](https://bun.sh) using workspaces and dependency catalogs for fast, efficient package management.

## Getting Started

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install all dependencies across all packages
bun install

# Run commands across all packages
bun run --filter '*' build
bun run --filter '*' test
bun run --filter '*' lint
```

## Monorepo Structure

- **components/**
  The `schematic-components` package: Client-side React components for customer portals, checkouts, and more.
  See [`components/README.md`](./components/README.md) for details.

- **react/**
  The `schematic-react` package: React hooks and utilities for integrating Schematic into React apps.
  See [`react/README.md`](./react/README.md) for details.

- **js/**
  The core Schematic JS SDK: Core logic and utilities for interacting with Schematic APIs.
  See [`js/README.md`](./js/README.md) for details.

- **scripts/**
  Utility scripts for local development and testing.
  - `test-components.sh`: Build and link components locally or with Vercel for testing in the demo app

## Bun Workspace Features

This monorepo leverages Bun's powerful workspace features:

### Workspaces
All packages are defined in the root `package.json` using Bun's workspace configuration. Dependencies are automatically hoisted and de-duplicated for optimal performance.

### Dependency Catalogs
Shared dependencies (TypeScript, ESLint, Prettier, etc.) are defined once in the root `package.json` using [dependency catalogs](https://bun.sh/docs/install/catalogs). Individual packages reference these using the `catalog:` protocol, ensuring version consistency across the monorepo.

### Fast Performance
Bun provides significantly faster installation and execution compared to traditional package managers:
- ~28x faster than `npm install`
- ~12x faster than `yarn install`
- Native TypeScript support without transpilation
- Built-in test runner (no Jest configuration needed)

Learn more about [Bun workspaces](https://bun.sh/docs/install/workspaces).

## Development

Each package can be developed independently:

```bash
# Work on a specific package
cd js
bun install
bun test
bun run build

# Run tests for all packages
bun run --filter '*' test

# Build all packages
bun run --filter '*' build
```

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com).
