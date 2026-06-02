import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { renderOptInMarkdown } from "./markdown";

describe("renderOptInMarkdown", () => {
  test("returns null for empty input", () => {
    expect(renderOptInMarkdown("")).toBeNull();
    expect(renderOptInMarkdown(null)).toBeNull();
    expect(renderOptInMarkdown(undefined)).toBeNull();
  });

  test("renders bold and italic", () => {
    const { container } = render(<>{renderOptInMarkdown("a **b** c *d*")}</>);
    expect(container.querySelector("strong")?.textContent).toBe("b");
    expect(container.querySelector("em")?.textContent).toBe("d");
    expect(container.textContent).toBe("a b c d");
  });

  test("renders http(s) links in a new tab with safe rel", () => {
    render(
      <>
        {renderOptInMarkdown(
          "I agree to the [Terms](https://example.com/terms).",
        )}
      </>,
    );
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link).toHaveAttribute("href", "https://example.com/terms");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("renders unsafe (non-http) links as plain text, not anchors", () => {
    const { container } = render(
      <>{renderOptInMarkdown("click [here](javascript:void) now")}</>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("click here now");
  });

  test("escapes text content (no raw HTML injection)", () => {
    const { container } = render(
      <>{renderOptInMarkdown("<img src=x onerror=alert(1)>")}</>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});
