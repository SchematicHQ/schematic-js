import "@testing-library/dom";
import "@testing-library/jest-dom";

import { render, screen, within } from "../../../test/setup";

import { Modal } from "./Modal";
import { ModalContent } from "./ModalContent";
import { ModalHeader } from "./ModalHeader";

describe("`Modal` component", () => {
  test("renders a basic modal", async () => {
    render(
      <Modal open>
        <ModalHeader>Modal Dialog</ModalHeader>
        <ModalContent>This is content</ModalContent>
      </Modal>,
    );

    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();

    const headerText = within(modal).getByText("Modal Dialog");
    expect(headerText).toBeInTheDocument();

    const contentText = within(modal).getByText("This is content");
    expect(contentText).toBeInTheDocument();
  });
});
