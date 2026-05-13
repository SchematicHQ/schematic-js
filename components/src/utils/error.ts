export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export const ERROR_UNKNOWN = new Error("An unknown error occurred.");
