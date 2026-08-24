// Ambient type declarations for build-time replaced values
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SCHEMATIC_COMPONENTS_VERSION?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

// The v3 stylesheet inlines the schematic-icons icon-font CSS; esbuild loads
// .css imports as plain strings for the v3 entry (see esbuild.mjs).
declare module "*.css" {
  const css: string;
  export default css;
}
