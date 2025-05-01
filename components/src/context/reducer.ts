import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";
import { type EmbedState } from "./embedState";

type Action =
  | { type: "DATA_FETCH_STARTED" }
  | {
      type: "DATA_FETCH_PUBLIC";
      data?: PublicPlansResponseData;
    }
  | {
      type: "DATA_FETCH_EMBED";
      data?: ComponentHydrateResponseData;
    }
  | { type: "RESET" }
  | { type: "ERROR"; error: Error };

/**
 * Handles how that state changes in the `useAuth0` hook.
 */
export const reducer = (state: EmbedState, action: Action): EmbedState => {
  switch (action.type) {
    case "DATA_FETCH_STARTED":
      return {
        ...state,
        isPending: true,
      };
    case "DATA_FETCH_PUBLIC":
    case "DATA_FETCH_EMBED":
      return {
        ...state,
        data: action.data,
        error: undefined,
        isPending: false,
      };
    case "RESET":
      return {
        ...state,
        data: undefined,
      };
    case "ERROR":
      return {
        ...state,
        isPending: false,
        error: action.error,
      };
  }
};
