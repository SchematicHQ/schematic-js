import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";

export interface EmbedState {
  isPending: boolean;
  data?: PublicPlansResponseData | ComponentHydrateResponseData;
  error?: Error;
}

export const initialState: EmbedState = {
  isPending: false,
};
