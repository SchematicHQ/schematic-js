import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { render } from "../../../test/setup";

import { ExpandListToggle } from "./ExpandListToggle";

describe("ExpandListToggle", () => {
  test("renders the total in the collapsed label", () => {
    render(
      <ExpandListToggle isExpanded={false} onToggle={vi.fn()} total={18} />,
    );

    expect(screen.getByText("See all (18)")).toBeInTheDocument();
  });

  test("falls back to a bare label when no total is given", () => {
    render(<ExpandListToggle isExpanded={false} onToggle={vi.fn()} />);

    expect(screen.getByText("See all")).toBeInTheDocument();
  });

  test("shows the collapse label when expanded", () => {
    render(<ExpandListToggle isExpanded onToggle={vi.fn()} total={18} />);

    expect(screen.getByText("Hide all")).toBeInTheDocument();
    expect(screen.queryByText("See all (18)")).not.toBeInTheDocument();
  });

  test("honors label overrides", () => {
    const { rerender } = render(
      <ExpandListToggle
        isExpanded={false}
        onToggle={vi.fn()}
        total={18}
        expandLabel="See more"
        collapseLabel="See less"
      />,
    );

    expect(screen.getByText("See more")).toBeInTheDocument();

    rerender(
      <ExpandListToggle
        isExpanded
        onToggle={vi.fn()}
        total={18}
        expandLabel="See more"
        collapseLabel="See less"
      />,
    );

    expect(screen.getByText("See less")).toBeInTheDocument();
  });

  test("fires onToggle on click and on Enter/Space, but not other keys", () => {
    const onToggle = vi.fn();
    render(
      <ExpandListToggle isExpanded={false} onToggle={onToggle} total={18} />,
    );

    const trigger = screen.getByText("See all (18)");

    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onToggle).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(trigger, { key: " " });
    expect(onToggle).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(trigger, { key: "a" });
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  test("fires onToggle when the chevron is clicked", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <ExpandListToggle isExpanded={false} onToggle={onToggle} total={18} />,
    );

    const chevron = container.querySelector('[title="chevron-down"]');
    expect(chevron).not.toBeNull();

    fireEvent.click(chevron!);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("is a single tab stop and reports its expanded state", () => {
    const { rerender } = render(
      <ExpandListToggle isExpanded={false} onToggle={vi.fn()} total={18} />,
    );

    const collapsed = screen.getByRole("button");
    expect(collapsed).toHaveAttribute("aria-expanded", "false");
    expect(collapsed).toHaveAttribute("tabindex", "0");
    // The label and chevron are inside the control, not stops of their own.
    expect(collapsed.querySelectorAll("[tabindex]")).toHaveLength(0);

    rerender(<ExpandListToggle isExpanded onToggle={vi.fn()} total={18} />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });
});
