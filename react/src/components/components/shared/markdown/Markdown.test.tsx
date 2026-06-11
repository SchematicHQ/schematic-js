import { describe, expect, test } from "vitest";

import { render } from "../../../test/setup";
import { renderOptInMarkdown } from "../../../utils";

import { Markdown } from "./Markdown";

describe("Markdown", () => {
  test("renders the a/strong/em elements from renderOptInMarkdown", () => {
    const { container } = render(
      <Markdown>
        {renderOptInMarkdown(
          "see the [Terms](https://example.com) and **bold** and *italic*",
        )}
      </Markdown>,
    );

    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link?.textContent).toBe("Terms");

    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
  });

  test("renders nothing for empty input", () => {
    const { container } = render(
      <Markdown>{renderOptInMarkdown(null)}</Markdown>,
    );
    expect(container.textContent).toBe("");
  });
});
