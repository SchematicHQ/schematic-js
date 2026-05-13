import { handlers as accessTokenHandlers } from "./accessToken";
import { handlers as hydrateHandlers } from "./hydrate";
import { handlers as plansHandlers } from "./plans";

export const handlers = [
  ...accessTokenHandlers,
  ...hydrateHandlers,
  ...plansHandlers,
];
