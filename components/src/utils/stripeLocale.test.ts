import { describe, expect, it } from "vitest";

import { stripeLocale } from "./stripeLocale";

describe("stripeLocale", () => {
  it("passes through a locale Stripe supports", () => {
    expect(stripeLocale("en")).toBe("en");
    expect(stripeLocale("it")).toBe("it");
    expect(stripeLocale("pt-BR")).toBe("pt-BR");
  });

  it("matches a supported locale regardless of case", () => {
    expect(stripeLocale("PT-br")).toBe("pt-BR");
  });

  it("normalizes an underscore-separated tag", () => {
    expect(stripeLocale("pt_BR")).toBe("pt-BR");
    expect(stripeLocale("es_419")).toBe("es-419");
    expect(stripeLocale("de_CH")).toBe("de");
  });

  it("resolves the region behind a script subtag", () => {
    expect(stripeLocale("zh-Hant-TW")).toBe("zh-TW");
    expect(stripeLocale("zh-Hans-CN")).toBe("zh");
  });

  it("falls back to the base language for an unsupported region", () => {
    expect(stripeLocale("en-US")).toBe("en");
    expect(stripeLocale("de-CH")).toBe("de");
  });

  it("falls back to English for an unsupported or missing language", () => {
    expect(stripeLocale("xx")).toBe("en");
    expect(stripeLocale("")).toBe("en");
    expect(stripeLocale(undefined)).toBe("en");
  });

  it("never resolves to auto, which would follow the browser", () => {
    expect(stripeLocale("auto")).toBe("en");
  });
});
