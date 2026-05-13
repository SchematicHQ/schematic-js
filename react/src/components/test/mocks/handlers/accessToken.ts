import { HttpResponse, http } from "msw";

import accessToken from "./response/accessToken.json";

export const handlers = [
  http.get("https://api.schematichq.com/accessToken", () => {
    return HttpResponse.json(accessToken);
  }),
];
