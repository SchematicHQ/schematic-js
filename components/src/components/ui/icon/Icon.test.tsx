import "@testing-library/dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { render } from "../../../test/setup";

import { ICON_FALLBACK_CLASS, Icon } from "./Icon";

describe("`Icon` component", () => {
  test("renders a known icon name as a font glyph, not literal text", () => {
    render(<Icon name="check" data-testid="icon" />);

    const icon = screen.getByTestId("icon");
    // schematic-icons renders the glyph on an <i> via `icon-{name}` + :before.
    expect(icon.tagName).toBe("I");
    expect(icon).toHaveClass("icon-check");
    // The literal slug must never leak into the rendered text.
    expect(screen.queryByText("check")).not.toBeInTheDocument();
  });

  test("renders an emoji value as-is", () => {
    render(<Icon name="📈" />);

    expect(screen.getByText("📈")).toBeInTheDocument();
  });

  describe("unknown icon name", () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    test("falls back to a monogram instead of the raw name", () => {
      render(<Icon name="workos-but-newer" data-testid="icon" />);

      const icon = screen.getByTestId("icon");
      // First letter, uppercased — never the overflowing raw slug.
      expect(icon).toHaveTextContent("W");
      expect(screen.queryByText("workos-but-newer")).not.toBeInTheDocument();
      expect(icon).toHaveClass(ICON_FALLBACK_CLASS);
      // Keep the full name accessible / hover-discoverable.
      expect(icon).toHaveAttribute("title", "workos-but-newer");
    });

    test("warns once for the missing icon", () => {
      // Distinct name: the warn dedupes per-name across the module's lifetime.
      render(<Icon name="freshly-added-icon" />);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown icon "freshly-added-icon"'),
      );
    });
  });
});
