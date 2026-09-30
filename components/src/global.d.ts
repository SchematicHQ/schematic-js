// Ambient type declarations for build-time replaced values
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SCHEMATIC_COMPONENTS_VERSION?: string;
    readonly NODE_ENV?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

// Vite's `?raw` import: a file's text, for a test that reads a package's CSS.
declare module "*?raw" {
  const text: string;
  export default text;
}
