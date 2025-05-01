import "../localization";

import { createContext } from "react";

import { type EmbedState, initialState } from "./embedState";

export interface EmbedContextProps extends EmbedState {
  getPublicPlans: () => Promise<void>;
  hydrate: (id: string, accessToken: string) => Promise<void>;
}

const stub = () => {
  throw new Error("You forgot to wrap your code with <EmbedProvider>.");
};

export const initialContext = {
  ...initialState,
  getPublicPlans: stub,
  hydrate: stub,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
