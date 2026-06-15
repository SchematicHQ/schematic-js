import { render, screen } from "@testing-library/react";

import { createPrimitiveContext } from "./createPrimitiveContext";

interface Value {
  label: string;
}

const [Provider, useValue] = createPrimitiveContext<Value>("Widget");

function Consumer() {
  const { label } = useValue("Consumer");
  return <div>{label}</div>;
}

describe("createPrimitiveContext", () => {
  test("provides the value to consumers inside the provider", () => {
    render(
      <Provider value={{ label: "hello" }}>
        <Consumer />
      </Provider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  test("throws a named error when used outside the provider", () => {
    // Suppress React's error logging for the expected throw.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      "`Consumer` must be rendered inside `Widget.Root`.",
    );
    spy.mockRestore();
  });
});
