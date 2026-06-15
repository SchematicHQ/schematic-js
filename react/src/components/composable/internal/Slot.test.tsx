import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { vi } from "vitest";

import { Slot, composeRefs } from "./Slot";

describe("Slot", () => {
  test("merges className and style onto the child", () => {
    render(
      <Slot className="slot" style={{ color: "red" }}>
        <button className="child" style={{ background: "blue" }}>
          Click
        </button>
      </Slot>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("slot");
    expect(button).toHaveClass("child");
    expect(button).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(button).toHaveStyle({ background: "rgb(0, 0, 255)" });
  });

  test("chains event handlers child-first, then slot", () => {
    const calls: string[] = [];

    render(
      <Slot onClick={() => calls.push("slot")}>
        <button onClick={() => calls.push("child")}>Click</button>
      </Slot>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(calls).toEqual(["child", "slot"]);
  });

  test("composes the slot ref with the child ref", () => {
    const slotRef = createRef<HTMLButtonElement>();
    const childRef = createRef<HTMLButtonElement>();

    render(
      <Slot ref={slotRef}>
        <button ref={childRef}>Click</button>
      </Slot>,
    );

    expect(slotRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(childRef.current).toBe(slotRef.current);
  });

  test("renders null when children is not a single element", () => {
    const { container } = render(<Slot>{"text"}</Slot>);
    expect(container).toBeEmptyDOMElement();
  });

  test("child prop wins over slot prop for non-merged keys", () => {
    render(
      <Slot title="slot-title">
        <button title="child-title">Click</button>
      </Slot>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("title", "child-title");
  });
});

describe("composeRefs", () => {
  test("writes the node to every ref", () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const node = document.createElement("div");

    composeRefs(objectRef, callbackRef)(node);

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);
  });
});
