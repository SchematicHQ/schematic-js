import { HttpResponse, http } from "msw";

import hydrate from "./response/hydrate.json";

export const handlers = [
  http.get("https://api.schematichq.com/components/:id/hydrate", () => {
    return HttpResponse.json(hydrate);
  }),
  http.get("https://api.schematichq.com/components/hydrate", () => {
    const source = { ...hydrate };
    const { data, params } = source;
    const { component, ...rest } = data;
    return HttpResponse.json({ data: rest, params });
  }),
];
