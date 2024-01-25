import { Schematic } from "./index";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Schematic", () => {
  let schematic: Schematic;

  beforeEach(() => {
    schematic = new Schematic("API_KEY");
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe("identify", () => {
    it("should handle identify event", () => {
      const eventBody = {
        keys: { userId: "123" },
        traits: { name: "John Doe" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);

      schematic.identify(eventBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: expect.any(String),
      });
    });
  });

  describe("track", () => {
    it("should handle track event", () => {
      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);
      schematic.track(eventBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: expect.any(String),
      });
    });
  });

  describe("initialize", () => {
    beforeAll(() => {
      Object.defineProperty(window, "onbeforeunload", {
        value: null,
        writable: true,
      });
    });

    it("should flush event queue on beforeunload event", () => {
      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);
      schematic.track(eventBody);
      window.dispatchEvent(new Event("beforeunload"));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: expect.any(String),
      });
    });
  });

  describe("checkFlag", () => {
    it("should check flag and return the value", async () => {
      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };
      const expectedResponse = {
        data: {
          companyId: "comp_YRucCyZ3us4",
          flag:  "FLAG_KEY",
          reason:  "Matched rule rule_iuBRNdJEjYh",
          ruleId:  "rule_iuBRNdJEjYh",
          userId: "user_6oRr9UTncXf",
          value: true,
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValue = await schematic.checkFlag({ key: "FLAG_KEY", context});

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: expect.any(String),
      });
      expect(flagValue).toBe(true);
    });
  });

  describe("checkFlags", () => {
    it("should check flags and return the values", async () => {
      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };
      const expectedResponse = {
        data: {
          flags: [
            {
              companyId: "comp_YRucCyZ3us4",
              flag:  "FLAG_KEY1",
              reason:  "Matched rule rule_iuBRNdJEjYh",
              ruleId:  "rule_iuBRNdJEjYh",
              userId: "user_6oRr9UTncXf",
              value: true,
            },
            {
              companyId: "comp_YRucCyZ3us4",
              flag:  "FLAG_KEY2",
              reason:  "No rules matched",
              ruleId:  null,
              userId: "user_6oRr9UTncXf",
              value: false,
            },
          ],
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValues = await schematic.checkFlags(context);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: expect.any(String),
      });
      expect(flagValues).toEqual({
        FLAG_KEY1: true,
        FLAG_KEY2: false,
      });
    });
  });
});
