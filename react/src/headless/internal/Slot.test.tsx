import { render } from "@testing-library/react";
import { createRef } from "react";
import { vi } from "vitest";

import { Slot } from "./Slot";

describe("Slot", () => {
  it("merges className and shallow-merges style onto the child", () => {
    const { getByTestId } = render(
      <Slot className="slot" style={{ color: "red", margin: 0 }}>
        <div data-testid="child" className="child" style={{ color: "blue" }} />
      </Slot>,
    );

    const el = getByTestId("child");
    expect(el.className).toBe("slot child");
    // child value wins on conflict; non-conflicting slot styles are kept
    expect(el.style.color).toBe("blue");
    expect(el.style.margin).toBe("0px");
  });

  it("chains on* handlers child-first", () => {
    const calls: string[] = [];
    const { getByTestId } = render(
      <Slot onClick={() => calls.push("slot")}>
        <button data-testid="btn" onClick={() => calls.push("child")} />
      </Slot>,
    );

    getByTestId("btn").click();
    expect(calls).toEqual(["child", "slot"]);
  });

  it("composes the forwarded ref with the child's ref", () => {
    const slotRef = createRef<HTMLElement>();
    const childRef = createRef<HTMLDivElement>();
    render(
      <Slot ref={slotRef}>
        <div data-testid="child" ref={childRef} />
      </Slot>,
    );

    expect(slotRef.current).toBe(childRef.current);
    expect(childRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders null when children is not a single valid element", () => {
    const onError = vi.fn();
    const { container } = render(<Slot>{"just text"}</Slot>);
    expect(container.firstChild).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
