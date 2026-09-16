/**
 * The HTTP status behind a failed billing read, or `undefined` when the
 * failure was not an HTTP response: a network error, a missing provider, a
 * session that never resolved.
 *
 * The hooks pass the thrown error through unchanged, and an HTTP failure is
 * schematic-js's `SchematicApiError`, which carries `status`. Read by shape
 * rather than `instanceof`: a page with two copies of schematic-js — a
 * linked checkout resolving its own `node_modules` — has two classes of that
 * name, and the shape is the same in both.
 */
export function httpStatus(error: Error | undefined): number | undefined {
  if (error === undefined || error.name !== "SchematicApiError") {
    return undefined;
  }
  const { status } = error as Error & { status?: unknown };
  return typeof status === "number" ? status : undefined;
}
