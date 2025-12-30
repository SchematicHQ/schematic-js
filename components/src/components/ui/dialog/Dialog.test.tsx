import "@testing-library/dom";
import "@testing-library/jest-dom";

import { render, screen, within } from "../../../test/setup";

import { Dialog } from "./Dialog";
import { DialogContent } from "./DialogContent";
import { DialogHeader } from "./DialogHeader";

describe("`Dialog` component", () => {
  test("renders a basic dialog", async () => {
    render(
      <Dialog open>
        <DialogHeader>Modal Dialog</DialogHeader>
        <DialogContent>This is content</DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const headerText = within(dialog).getByText("Modal Dialog");
    expect(headerText).toBeInTheDocument();

    const contentText = within(dialog).getByText("This is content");
    expect(contentText).toBeInTheDocument();
  });
});
