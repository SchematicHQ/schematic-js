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

All packages live in one pnpm workspace, with a single `pnpm-lock.yaml` and
`pnpm-workspace.yaml` at the repo root. Install once from the root:

```sh
pnpm install
```

`schematic-react` depends on `schematic-js`, and `schematic-components` depends
on both; those are declared with pnpm's `workspace:` protocol, so they resolve
to the working tree during development and are rewritten to the sibling's
published version on `pnpm publish`. Because a link resolves to the sibling's
gitignored `dist/`, build the dependencies before typechecking or testing a
package that has them:

```sh
# a package plus everything it depends on, in topological order
pnpm --filter "@schematichq/schematic-components..." run build

# just its dependencies
pnpm --filter "@schematichq/schematic-components^..." run build

# a single package's scripts
pnpm --filter "@schematichq/schematic-components" run test
```

`schematic-vue` and `schematic-angular` are not linked to the working tree —
they resolve `@schematichq/schematic-js` from the registry at their declared
range.

### Linking a package into another project

Build the package and its workspace dependencies first — `main`, `module`,
`types`, and `exports` all point into a gitignored `dist/`, so a link to an
unbuilt package resolves to nothing:

```sh
pnpm --filter "@schematichq/schematic-components..." run build
```

Then point the consuming project at the directory:

```sh
# from the consuming project
pnpm link ../schematic-js/components
```

The link now carries the working tree all the way down. `schematic-components`
resolves `schematic-react` and `schematic-js` through the workspace, so a change
in `js/` reaches the consuming app once you rebuild — before the workspace, that
link pointed at whatever the registry had published, and local changes to the
dependencies were invisible.

React resolution is the one thing a link does not settle on its own. A linked
package resolves `react` from its own `node_modules` — this workspace's copy,
not the app's — and two Reacts means any hook throws "Invalid hook call". Next.js
sidesteps it: its webpack config aliases `react$`, `react-dom$`, and the JSX
runtimes to its own bundled copy for every layer, and an alias is
path-independent, so a linked package gets the same React the app does.
Bundlers without that aliasing need to be told:

```js
// vite.config.js
resolve: {
  dedupe: ["react", "react-dom"],
}
```

`scripts/test-components.sh` sidesteps this a different way: it `pnpm pack`s
components and installs the tarball, which exercises the `files` list and
`exports` map a symlink bypasses.

See the individual package READMEs for setup and usage instructions.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com).
