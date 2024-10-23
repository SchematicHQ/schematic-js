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

    it("should use set context if none is provided in track call", async () => {
      const setContext = {
        user: { userId: "123" },
        company: { companyId: "456" },
      };
      schematic.setContext(setContext);

      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);

      await schematic.track(eventBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://c.schematichq.com/e",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: expect.any(String),
        }),
      );

      const [[, { body }]] = mockFetch.mock.calls;
      const parsedBody = JSON.parse(body);
      expect(parsedBody).toMatchObject({
        api_key: "API_KEY",
        body: {
          company: { companyId: "456" },
          user: { userId: "123" },
          event: "Page View",
          traits: { url: "https://example.com" },
        },
        type: "track",
      });
    });

    it("should use provided context over set context in track call", async () => {
      const setContext = {
        user: { userId: "123" },
        company: { companyId: "456" },
      };
      schematic.setContext(setContext);

      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
        user: { userId: "789" },
        company: { companyId: "101" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);

      await schematic.track(eventBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://c.schematichq.com/e",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: expect.any(String),
        }),
      );

      const [[, { body }]] = mockFetch.mock.calls;
      const parsedBody = JSON.parse(body);
      expect(parsedBody).toMatchObject({
        api_key: "API_KEY",
        body: {
          company: { companyId: "101" },
          user: { userId: "789" },
          event: "Page View",
          traits: { url: "https://example.com" },
        },
        type: "track",
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
          flag: "FLAG_KEY",
          reason: "Matched rule rule_iuBRNdJEjYh",
          ruleId: "rule_iuBRNdJEjYh",
          userId: "user_6oRr9UTncXf",
          value: true,
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValue = await schematic.checkFlag({ key: "FLAG_KEY", context });

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

    it("should include additional headers", async () => {
      const schematicWithHeaders = new Schematic("API_KEY", {
        additionalHeaders: { "X-Additional-Header": "foo" },
      });
      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };
      const expectedResponse = {
        data: {
          companyId: "comp_YRucCyZ3us4",
          flag: "FLAG_KEY",
          reason: "Matched rule rule_iuBRNdJEjYh",
          ruleId: "rule_iuBRNdJEjYh",
          userId: "user_6oRr9UTncXf",
          value: true,
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValue = await schematicWithHeaders.checkFlag({
        key: "FLAG_KEY",
        context,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Additional-Header": "foo",
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
              flag: "FLAG_KEY1",
              reason: "Matched rule rule_iuBRNdJEjYh",
              ruleId: "rule_iuBRNdJEjYh",
              userId: "user_6oRr9UTncXf",
              value: true,
            },
            {
              companyId: "comp_YRucCyZ3us4",
              flag: "FLAG_KEY2",
              reason: "No rules matched",
              ruleId: null,
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

    it("should include additional headers", async () => {
      const schematicWithHeaders = new Schematic("API_KEY", {
        additionalHeaders: { "X-Additional-Header": "foo" },
      });
      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };
      const expectedResponse = {
        data: {
          flags: [
            {
              companyId: "comp_YRucCyZ3us4",
              flag: "FLAG_KEY1",
              reason: "Matched rule rule_iuBRNdJEjYh",
              ruleId: "rule_iuBRNdJEjYh",
              userId: "user_6oRr9UTncXf",
              value: true,
            },
            {
              companyId: "comp_YRucCyZ3us4",
              flag: "FLAG_KEY2",
              reason: "No rules matched",
              ruleId: null,
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
      const flagValues = await schematicWithHeaders.checkFlags(context);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Additional-Header": "foo",
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
