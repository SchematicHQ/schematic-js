import { HttpResponse, http } from "msw";

import hydrate from "./response/hydrate.json";

export const handlers = [
  http.get("https://api.schematichq.com/components/:id/hydrate", () => {
    return HttpResponse.json(hydrate);
  }),
  http.get("https://api.schematichq.com/components/hydrate", () => {
    const response = { ...hydrate };
    // @ts-expect-error: the `component` data does not exist for this endpoint
    delete response.data.component;
    return HttpResponse.json(hydrate);
  }),
];
