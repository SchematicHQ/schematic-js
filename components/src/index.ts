import { PACKAGE_VERSION } from "./version";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__SCHEMATIC_PACKAGE_VERSION__ = PACKAGE_VERSION;
}

export * from "./components";
export * from "./context";
export * from "./hooks";
