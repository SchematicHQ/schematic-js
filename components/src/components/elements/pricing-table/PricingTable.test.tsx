import "@testing-library/dom";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "../../../test";

import { PricingTable } from ".";

beforeAll(() => {});
afterEach(() => {});
afterAll(() => {});

test("loads and displays pricing table", async () => {
  await act(() => {
    render(<PricingTable callToActionUrl="/" />);
  });

  // fireEvent.click(screen.getByText("Load Greeting"));

  // await screen.findByRole("heading");

  // expect(screen.getByRole("heading")).toHaveTextContent("hello there");
  await expect(screen.getByRole("button")).resolves.toBeEnabled();
});
