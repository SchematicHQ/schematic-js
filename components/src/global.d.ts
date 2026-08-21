// CSS imports resolve to their source text (esbuild `text` loader).
declare module "*.css" {
  const css: string;
  export default css;
}

// Ambient type declarations for build-time replaced values
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SCHEMATIC_COMPONENTS_VERSION?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
