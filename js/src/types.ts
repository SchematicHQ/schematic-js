import { CreateEventRequestBody } from "./api/models";

export type Keys = Record<string, string>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Traits = Record<string, any>;

export type SchematicContext = {
  company?: Keys;
  user?: Keys;
};

export type Event = CreateEventRequestBody & {
  api_key: string;
  tracker_event_id: string;
  tracker_user_id: string;
};

export type StoragePersister = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setItem(key: string, value: any): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  getItem(key: string): any;
  removeItem(key: string): void;
};

export type SchematicOptions = {
  additionalHeaders?: Record<string, string>;
  apiUrl?: string;
  eventUrl?: string;
  flagListener?: (values: Record<string, boolean>) => void;
  storage?: StoragePersister;
  useWebSocket?: boolean;
  webSocketUrl?: string;
};

export type CheckOptions = {
  context?: SchematicContext;
  fallback?: boolean;
  key: string;
};

export type BooleanListenerFn = (value: boolean) => void;
export type ListenerFn = BooleanListenerFn | EmptyListenerFn;
export type EmptyListenerFn = () => void;
