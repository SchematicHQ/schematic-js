export type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends (infer U)[]
    ? DeepPartial<U>[]
    : NonNullable<T[K]> extends object
      ? DeepPartial<NonNullable<T[K]>>
      : T[K];
};

export type DeepRequired<T> = {
  [K in keyof T]: Required<DeepRequired<T[K]>>;
};
