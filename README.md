# Schematic JavaScript Monorepo

This directory contains the core JavaScript/TypeScript packages and scripts for Schematic, including reusable components, React bindings, and utility scripts.

## Structure

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

## Development

Each package is managed independently but can be linked together for local development.  
See the individual package READMEs for setup and usage instructions.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com).
