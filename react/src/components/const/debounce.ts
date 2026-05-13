import { type DebounceSettings } from "lodash";

// use leading when we prefer a faster response
export const LEADING_DEBOUNCE_SETTINGS: DebounceSettings = {
  leading: true,
  trailing: false,
};

// use trailing when we prefer more up-to-date data
export const TRAILING_DEBOUNCE_SETTINGS: DebounceSettings = {
  leading: false,
  trailing: true,
};

export const EVENT_DEBOUNCE_TIMEOUT = 200;

export const FETCH_DEBOUNCE_TIMEOUT = 300;
