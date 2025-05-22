import { useCallback, useMemo, useState } from "react";

type RequestState<TData> = {
  isLoading: boolean;
  error: Error | null;
  data: TData | undefined;
};

export function useRequest<TData>(
  fn: () => Promise<{ data: TData }> | undefined,
) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);

  const request = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fn();
      if (!response) {
        return;
      }

      setData(response.data);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  const value = useMemo<[RequestState<TData>, () => Promise<void>]>(() => {
    const state: RequestState<TData> = { isLoading, error, data };
    return [state, request];
  }, [isLoading, error, data, request]);

  return value;
}
