import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";
import { type EmbedState } from "./embedState";

type Action =
  | { type: "HYDRATE_STARTED" }
  | {
      type: "HYDRATE_PUBLIC";
      data?: PublicPlansResponseData;
    }
  | {
      type: "HYDRATE_COMPONENT";
      data?: ComponentHydrateResponseData;
    }
  | { type: "RESET" }
  | { type: "ERROR"; error: Error };

export const reducer = (state: EmbedState, action: Action): EmbedState => {
  switch (action.type) {
    case "HYDRATE_STARTED":
      return {
        ...state,
        isPending: true,
      };
    case "HYDRATE_PUBLIC":
    case "HYDRATE_COMPONENT":
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
