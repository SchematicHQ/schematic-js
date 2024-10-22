export type EventType = "identify" | "track";

export type Keys = Record<string, string>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type Traits = Record<string, any>;

export type SchematicContext = {
  company?: Keys;
  user?: Keys;
};

export type EventBodyIdentify = {
  company?: {
    keys?: Keys;
    name?: string;
    traits?: Traits;
  };
  keys?: Keys;
  name?: string;
  traits?: Traits;
};

export type EventBodyTrack = SchematicContext & {
  event: string;
  traits?: Traits;
};

export type EventBody = EventBodyIdentify | EventBodyTrack;

export type Event = {
  api_key: string;
  body: EventBody;
  sent_at: string;
  tracker_event_id: string;
  tracker_user_id: string;
  type: EventType;
};

export type FlagCheckResponseBody = {
  company_id?: string;
  error?: string;
  reason: string;
  rule_id?: string;
  user_id?: string;
  value: boolean;
};

export type FlagCheckWithKeyResponseBody = FlagCheckResponseBody & {
  flag: string;
};

export type StoragePersister = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  setItem(key: string, value: any): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  getItem(key: string): any;
  removeItem(key: string): void;
};

export type SchematicOptions = {
  apiUrl?: string;
  webSocketUrl?: string;
  eventUrl?: string;
  flagListener?: (values: Record<string, boolean>) => void;
  storage?: StoragePersister;
  useWebSocket?: boolean;
};

export type CheckOptions = {
  context?: SchematicContext;
  fallback?: boolean;
  key: string;
};

export type BooleanListenerFn = (value: boolean) => void;
export type ListenerFn = BooleanListenerFn | EmptyListenerFn;
export type EmptyListenerFn = () => void;
