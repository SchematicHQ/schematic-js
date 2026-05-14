// Tests for `useEmbed`'s opt-out behavior. We don't load the real
// EmbedAdapter here — `embed={null}` short-circuits before any import,
// which is exactly the path we want to verify.

import { render } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { vi } from "vitest";

import { useEmbed } from "./hooks/useEmbed";

import { SchematicProvider } from "./index";

class CaptureBoundary extends Component<
  { children: ReactNode; onError: (err: Error) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const Consumer = () => {
  useEmbed();
  return <span>should not render</span>;
};

describe("useEmbed — embed={null} opt-out", () => {
  it("throws a clear, non-suspending error instead of looping on a load promise", () => {
    const captured: Error[] = [];
    // React surfaces an extra console.error for uncaught render exceptions
    // even after the error boundary catches them. Silence to keep test
    // output clean.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SchematicProvider publishableKey="key" ws={null} embed={null}>
        <CaptureBoundary onError={(e) => captured.push(e)}>
          <Consumer />
        </CaptureBoundary>
      </SchematicProvider>,
    );

    expect(captured).toHaveLength(1);
    expect(captured[0]?.message).toMatch(/embed={null}/);
    expect(captured[0]?.message).toMatch(/explicitly disabled/);

    errSpy.mockRestore();
  });
});
