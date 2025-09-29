import "@testing-library/dom";
import "@testing-library/jest-dom";
import { http, delay, HttpResponse } from "msw";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "../../../test/setup";

import { PricingTable } from ".";

test("loads and displays pricing table", async () => {
  render(<PricingTable callToActionUrl="/" />);

  /* const loadingText = screen.queryByText("loading todo list");
  await waitFor(() => expect(loadingText).not.toBeInTheDocument());
  const list = screen.getByRole("list");
  expect(list).toBeInTheDocument();
  expect(within(list).getAllByRole("listitem")).toHaveLength(2); */

  // fireEvent.click(screen.getByText("Load Greeting"));

  // await screen.findByRole("heading");

  // expect(screen.getByRole("heading")).toHaveTextContent("hello there");
  // await expect(screen.getByRole("button")).resolves.toBeEnabled();
});
