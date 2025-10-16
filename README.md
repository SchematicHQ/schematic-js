# Schematic JavaScript Monorepo

This directory contains the core JavaScript/TypeScript packages and scripts for Schematic, including reusable components, React bindings, and utility scripts.

This monorepo is managed with [Bun](https://bun.sh) using workspaces and dependency catalogs for fast, efficient package management.

## Getting Started

[Install Bun](https://bun.com/)

Install all dependencies across all packages

```
bun install
```

Run commands across all packages

```
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

### Workspaces

This monorepo leverages Bun workspace features:

All packages are defined in the root `package.json` using Bun's workspace configuration.
Dependencies are automatically hoisted and de-duplicated.

Learn more about [Bun workspaces](https://bun.sh/docs/install/workspaces).

### Dependency Catalogs

Shared dependencies (TypeScript, ESLint, Prettier, etc.) are defined once in the
root `package.json` using [dependency catalogs](https://bun.sh/docs/install/catalogs).
Individual packages reference these using the `catalog:` protocol, ensuring version
consistency across the monorepo.

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

