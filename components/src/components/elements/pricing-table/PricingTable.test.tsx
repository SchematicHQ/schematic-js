import "@testing-library/dom";
import "@testing-library/jest-dom";
import { HttpResponse, delay, http } from "msw";

import { server } from "~/test/mocks/node";
import { render, screen, waitFor } from "~/test/setup";

import { PricingTable } from ".";

test("Renders loading state", async () => {
  server.use(
    http.get("https://api.schematichq.com/public/plans", async () => {
      await delay(1000);
      return HttpResponse.json([]);
    }),
  );

  render(<PricingTable callToActionUrl="/" />);

  const loadingText = screen.queryByLabelText("loading");
  expect(loadingText).toBeInTheDocument();
});

test("Renders pricing table", async () => {
  render(<PricingTable callToActionUrl="/" />);

  const loadingText = screen.queryByLabelText("loading");

  await waitFor(() => expect(loadingText).not.toBeInTheDocument());

  const pricingTableWrapper = screen.queryByTestId("pricing-table");
  expect(pricingTableWrapper).toBeInTheDocument();
});

test("Renders empty", async () => {
  server.use(
    http.get("https://api.schematichq.com/public/plans", async () => {
      return HttpResponse.json([]);
    }),
  );

  render(<PricingTable callToActionUrl="/" />);

  const loadingText = screen.queryByLabelText("loading");

  await waitFor(() => expect(loadingText).not.toBeInTheDocument());

  const plansWrapper = screen.queryByTestId("plans");
  expect(plansWrapper).not.toBeInTheDocument();
});
