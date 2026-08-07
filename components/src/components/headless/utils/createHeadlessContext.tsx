import { createContext, useContext, type Provider } from "react";

/**
 * Create a lightweight, strongly-typed context for a headless compound
 * component. The returned hook throws a descriptive error when a part is
 * rendered outside its provider (mirrors the throw-on-missing-provider idiom
 * used by `EmbedContext`, but scoped to a single component).
 *
 * @param errorMessage - thrown when the hook is used outside the provider.
 * @returns a tuple of `[Provider, useContext]`.
 */
export function createHeadlessContext<T>(
  errorMessage: string,
): [Provider<T | null>, () => T] {
  const Context = createContext<T | null>(null);

  const useHeadlessContext = (): T => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error(errorMessage);
    }
    return context;
  };

  return [Context.Provider, useHeadlessContext];
}
