# Schematic JavaScript Monorepo

This directory contains the core JavaScript/TypeScript packages and scripts for Schematic, including reusable components, React bindings, and utility scripts.

## Structure

- **components/**  
  The `schematic-components` package: Client-side React components for customer portals, checkouts, and more.  
  See [`components/README.md`](./components/README.md) for details.

- **react/**  
  The `schematic-react` package: React hooks and utilities for integrating Schematic into React apps.  
  See [`react/README.md`](./react/README.md) for details.

- **vue/**  
  The `schematic-vue` package: Vue composables and utilities for integrating Schematic into Vue apps.  
  See [`vue/README.md`](./vue/README.md) for details.

- **js/**  
  The core Schematic JS SDK: Core logic and utilities for interacting with Schematic APIs.  
  See [`js/README.md`](./js/README.md) for details.

- **scripts/**  
  Utility scripts for local development and testing.  
  - `test-components.sh`: Build and link components locally or with Vercel for testing in the demo app

## Development

Each package is managed independently but can be linked together for local development.  
See the individual package READMEs for setup and usage instructions.

### Depending on a sibling package

The packages install each other from npm, each with its own lockfile, and CI
installs with `--frozen-lockfile`. Two rules keep a release of one package
from blocking work on another:

- **A package types itself by what it consumes, not by its upstream's whole
  contract.** `react` names the billing resources it serves and picks the
  client members it calls (`react/src/billing/contract`); `components` does
  the same against `react`. An addition upstream is then invisible until the
  downstream package adopts it, so taking a newer upstream never carries a
  feature with it.
- **A floor bump is its own PR.** Once the upstream version is on npm, raise
  the range in `package.json`, run `pnpm update @schematichq/<package>`, and
  merge that alone. Feature PRs base on it. A bump inside a feature PR cannot
  go green until the feature's own upstream is published, and a feature that
  needs an unpublished upstream stays a draft until the bump lands.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com).
