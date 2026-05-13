import { HttpResponse, http } from "msw";

import plans from "./response/plans.json";

export const handlers = [
  http.get("https://api.schematichq.com/public/plans", () => {
    return HttpResponse.json(plans);
  }),
];
