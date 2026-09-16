/**
 * The HTTP status behind a failed billing read, or `undefined` for anything
 * that was not an HTTP response (network error, missing provider, malformed
 * response).
 *
 * Checked by shape rather than `instanceof`: a page with two copies of
 * schematic-js has two `SchematicApiError` classes, and the shape matches both.
 */
export function httpStatus(error: Error | undefined): number | undefined {
  if (error === undefined || error.name !== "SchematicApiError") {
    return undefined;
  }
  const { status } = error as Error & { status?: unknown };
  return typeof status === "number" ? status : undefined;
}
