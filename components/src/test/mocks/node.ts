import { setupServer } from "msw/node";

import { plansHandlers } from "./handlers/plans";

export const server = setupServer(...plansHandlers);
