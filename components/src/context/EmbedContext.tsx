import "../localization";

import { createContext } from "react";

import { type ComponentHydrateResponseData } from "../api/checkoutexternal";
import { type RecursivePartial } from "../types";

export interface EmbedContextProps {
  data?: RecursivePartial<ComponentHydrateResponseData>;
  error?: Error;
  getPublicData: () => Promise<void>;
  hydrateEmbed: (id: string, accessToken: string) => Promise<void>;
  isPending: boolean;
}

const stub = () => {
  throw new Error("You forgot to wrap your code with <EmbedProvider>.");
};

export const initialContext = {
  getPublicData: stub,
  hydrateEmbed: stub,
  isPending: false,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
