declare module "@schematichq/schematic-dev-toolbar" {
  import type {
    DeveloperToolbarDependencies,
    DeveloperToolbarInterface,
  } from "./types";

  export class DeveloperToolbar implements DeveloperToolbarInterface {
    constructor(deps: DeveloperToolbarDependencies);
    initialize(): void;
    cleanup(): void;
    getManualOverride(
      flagKey: string,
    ): import("./types").CheckFlagReturn | undefined;
    hasManualOverride(flagKey: string): boolean;
    setManualOverride(flagKey: string, value: boolean): void;
    getAllManualOverrides(): Record<string, import("./types").CheckFlagReturn>;
  }
}
