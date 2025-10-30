// Ambient type declarations for build-time replaced values
declare namespace NodeJS {
  interface ProcessEnv {
    readonly SCHEMATIC_COMPONENTS_VERSION?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
