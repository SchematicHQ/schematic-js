import { handlers as hydrateHandlers } from "./hydrate";
import { handlers as plansHandlers } from "./plans";

export const handlers = [...hydrateHandlers, ...plansHandlers];
