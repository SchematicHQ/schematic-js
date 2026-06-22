import { render } from "@testing-library/react";

import { createPrimitiveContext } from "./createPrimitiveContext";

describe("createPrimitiveContext", () => {
  it("provides a value the consumer hook reads", () => {
    const [Provider, useCtx] = createPrimitiveContext<{ n: number }>("Widget");

    let seen: number | undefined;
    function Consumer() {
      seen = useCtx("useWidget").n;
      return null;
    }

    render(
      <Provider value={{ n: 7 }}>
        <Consumer />
      </Provider>,
    );

    expect(seen).toBe(7);
  });

  it("throws a named error when used outside the Root", () => {
    const [, useCtx] = createPrimitiveContext<{ n: number }>("Widget");

    function Orphan() {
      useCtx("useWidget");
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      "`useWidget` must be rendered inside `Widget.Root`.",
    );
  });
});
