import { parseOptInText } from "./optInText";

describe("parseOptInText", () => {
  test("turns Markdown links into links and leaves the rest as text", () => {
    expect(
      parseOptInText(
        "I agree to the [Terms](https://acme.test/terms) and [Privacy Policy](http://acme.test/privacy).",
      ),
    ).toEqual([
      { kind: "text", text: "I agree to the " },
      { kind: "link", text: "Terms", url: "https://acme.test/terms" },
      { kind: "text", text: " and " },
      {
        kind: "link",
        text: "Privacy Policy",
        url: "http://acme.test/privacy",
      },
      { kind: "text", text: "." },
    ]);
  });

  test("keeps plain text, brackets and other schemes as typed", () => {
    expect(parseOptInText("I agree to the terms.")).toEqual([
      { kind: "text", text: "I agree to the terms." },
    ]);
    expect(parseOptInText("See [the terms] below.")).toEqual([
      { kind: "text", text: "See [the terms] below." },
    ]);
    expect(parseOptInText("[Run](javascript:alert(1))")).toEqual([
      { kind: "text", text: "[Run](javascript:alert(1))" },
    ]);
  });

  test("is empty for empty text", () => {
    expect(parseOptInText("")).toEqual([]);
  });
});
