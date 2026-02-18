import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { server } from "../../test/mocks/node";
import { render, waitFor } from "../../test/setup";

import { SchematicEmbed } from ".";

describe("SchematicEmbed access token", () => {
  test("sends correct access token on initial hydration request", async () => {
    const tokenReceived = vi.fn();

    server.use(
      http.get(
        "https://api.schematichq.com/components/:id/hydrate",
        ({ request }) => {
          tokenReceived(request.headers.get("X-Schematic-Api-Key"));
          return HttpResponse.json({ data: {} });
        },
      ),
    );

    render(
      <SchematicEmbed
        id="comp_test"
        accessToken="token_abc12345678901234567890123456"
      />,
    );

    await waitFor(() => {
      expect(tokenReceived).toHaveBeenCalledWith(
        "token_abc12345678901234567890123456",
      );
    });
  });

  test("sends updated access token after token refresh", async () => {
    const tokensReceived: (string | null)[] = [];

    server.use(
      http.get(
        "https://api.schematichq.com/components/:id/hydrate",
        ({ request }) => {
          tokensReceived.push(request.headers.get("X-Schematic-Api-Key"));
          return HttpResponse.json({ data: {} });
        },
      ),
    );

    const { rerender } = render(
      <SchematicEmbed
        id="comp_test"
        accessToken="token_old12345678901234567890123456"
      />,
    );

    await waitFor(() => {
      expect(tokensReceived).toContain("token_old12345678901234567890123456");
    });

    rerender(
      <SchematicEmbed
        id="comp_test"
        accessToken="token_new12345678901234567890123456"
      />,
    );

    await waitFor(() => {
      expect(tokensReceived).toContain("token_new12345678901234567890123456");
    });
  });
});
