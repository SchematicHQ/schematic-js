import { type DebounceSettings } from "lodash";

export const debounceOptions: DebounceSettings = {
  leading: true,
  trailing: false,
};

export const EVENT_DEBOUNCE_TIMEOUT = 200;

export const FETCH_DEBOUNCE_TIMEOUT = 300;
