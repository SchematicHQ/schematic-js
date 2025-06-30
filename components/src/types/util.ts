export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[K] extends object | undefined
      ? DeepPartial<T[K]>
      : T[K];
};

export type DeepRequired<T> = {
  [K in keyof T]: Required<DeepRequired<T[K]>>;
};
