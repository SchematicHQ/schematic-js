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

/**
 * The server's own words for a refused write, or `undefined` when the
 * response carried none and the error's message is the client's
 * "failed with status" fallback.
 */
export function serverMessage(error: Error | undefined): string | undefined {
  if (httpStatus(error) === undefined) {
    return undefined;
  }
  const { body } = error as Error & { body?: unknown };
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return undefined;
  }
  const message = (body as { error: unknown }).error;
  return typeof message === "string" && message !== "" ? message : undefined;
}
