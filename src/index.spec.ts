import { Schematic } from "./index";

const mockFetch = jest.fn();
global.fetch = mockFetch;
// const mockLocalStorage = {
//   setItem: jest.fn(),
//   getItem: jest.fn(),
//   removeItem: jest.fn(),
// };
// global.localStorage = mockLocalStorage;

describe("EntityTraitDefinitionsService", () => {
  let schematic: Schematic;

  beforeEach(() => {
    schematic = new Schematic("API_KEY");
  });

  afterEach(() => {
    mockFetch.mockClear();
    // mockLocalStorage.setItem.mockClear();
    // mockLocalStorage.getItem.mockClear();
  });

  describe("identify", () => {
    it("should handle identify event", () => {
      const eventBody = {
        keys: { userId: "123" },
        traits: { name: "John Doe" },
      };
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

    // Add more identify tests for different scenarios...
  });

  describe("track", () => {
    it("should handle track event", () => {
      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
      };
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

    // Add more track tests for different scenarios...
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

    // Add more initialize tests for different scenarios...
  });

  describe("checkFlag", () => {
    it("should check flag and return the value", async () => {
      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };
      const expectedResponse = {
        data: { value: true },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValue = await schematic.checkFlag("FLAG_KEY", context);

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

    // Add more checkFlag tests for different scenarios...
  });
});
