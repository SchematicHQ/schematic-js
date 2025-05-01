import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";

export interface EmbedState {
  data?: PublicPlansResponseData | ComponentHydrateResponseData;
  error?: Error;
  isPending: boolean;
}

export const initialState: EmbedState = {
  isPending: false,
};
