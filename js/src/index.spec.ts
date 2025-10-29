import { vi } from "vitest";
import { Schematic } from "./index";
import { Server as WebSocketServer } from "mock-socket";

import { version } from "./version";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

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
          "X-Schematic-Client-Version": `schematic-js@${version}`,
        },
        body: expect.any(String),
      });
    });
  });

  describe("track", () => {
    it("should queue track event when no context is available", () => {
      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);

      // Call track without any context set
      schematic.track(eventBody);

      // Event should be queued, not sent immediately
      expect(mockFetch).toHaveBeenCalledTimes(0);

      // Now set context, which should flush the queued event
      schematic.setContext({ user: { userId: "123" } });

      // Now the event should be sent
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
        },
        body: expect.any(String),
      });
    });

    it("should immediately send track event when context is provided", () => {
      const eventBody = {
        event: "Page View",
        traits: { url: "https://example.com" },
        user: { userId: "123" }, // Context provided in the call
      };
      const apiResponse = { ok: true };
      mockFetch.mockResolvedValue(apiResponse);

      // Call track with context provided
      schematic.track(eventBody);

      // Event should be sent immediately since context was provided
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
        },
        body: expect.any(String),
      });
    });

    it("should track with event data", async () => {
      // Create a new instance to avoid state from previous tests
      const trackSchematic = new Schematic("API_KEY");
      mockFetch.mockClear();

      const eventBody = {
        user: { userId: "123" },
        company: { companyId: "456" },
        event: "Page View",
        traits: { url: "https://example.com" },
      };

      const apiResponse = { ok: true, status: 200 };
      mockFetch.mockResolvedValueOnce(apiResponse);

      await trackSchematic.track(eventBody);

      // We should have one track event sent
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://c.schematichq.com/e",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json;charset=UTF-8",
            "X-Schematic-Client-Version": `schematic-js@${version}`,
          }),
          body: expect.any(String),
        }),
      );

      // Parse the event data
      const [[, { body }]] = mockFetch.mock.calls;
      const parsedBody = JSON.parse(body);

      // Verify the structure
      expect(parsedBody.api_key).toBe("API_KEY");
      expect(parsedBody.type).toBe("track");

      // Verify content in the track event body
      expect(parsedBody.body.event).toBe("Page View");
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
            "X-Schematic-Client-Version": `schematic-js@${version}`,
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
      if (typeof window !== "undefined") {
        Object.defineProperty(window, "onbeforeunload", {
          value: null,
          writable: true,
        });
      }
    });

    (typeof window === "undefined" ? it.skip : it)("should flush event queue on beforeunload event", () => {
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
          "X-Schematic-Client-Version": `schematic-js@${version}`,
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
          ruleType: "standard",
          userId: "user_6oRr9UTncXf",
          value: true,
        },
      };

      // Mock the flag check endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(expectedResponse),
      });

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const flagValue = await schematic.checkFlag({ key: "FLAG_KEY", context });

      // Expect two calls - one for flag check and one for flag check event
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify first call (flag check)
      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
        },
        body: expect.any(String),
      });

      // Verify second call (flag check event)
      expect(mockFetch.mock.calls[1][0]).toBe("https://c.schematichq.com/e");
      expect(mockFetch.mock.calls[1][1].method).toBe("POST");

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
          ruleType: "standard",
          userId: "user_6oRr9UTncXf",
          value: true,
        },
      };

      // Mock the flag check endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(expectedResponse),
      });

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const flagValue = await schematicWithHeaders.checkFlag({
        key: "FLAG_KEY",
        context,
      });

      // Expect two calls - one for flag check and one for flag check event
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify first call (flag check)
      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
          "X-Additional-Header": "foo",
        },
        body: expect.any(String),
      });

      // Verify the additional header is also in the second call
      expect(mockFetch.mock.calls[1][1].headers).toHaveProperty(
        "X-Additional-Header",
        "foo",
      );

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
              ruleType: "standard",
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
        json: vi.fn().mockResolvedValueOnce(expectedResponse),
      });

      const flagValues = await schematic.checkFlags(context);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
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
        json: vi.fn().mockResolvedValueOnce(expectedResponse),
      });
      const flagValues = await schematicWithHeaders.checkFlags(context);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: {
          "X-Schematic-Api-Key": "API_KEY",
          "Content-Type": "application/json;charset=UTF-8",
          "X-Schematic-Client-Version": `schematic-js@${version}`,
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

describe("Schematic WebSocket", () => {
  let schematic: Schematic;
  let mockServer: WebSocketServer;
  const TEST_WS_URL = "ws://localhost:1234";
  const FULL_WS_URL = `${TEST_WS_URL}/flags/bootstrap?apiKey=API_KEY`;

  beforeEach(() => {
    mockServer?.stop();
    mockServer = new WebSocketServer(FULL_WS_URL);
    schematic = new Schematic("API_KEY", {
      useWebSocket: true,
      webSocketUrl: TEST_WS_URL,
    });
  });

  afterEach(async () => {
    await schematic.cleanup();
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
    mockFetch.mockClear();
  });

  it("should wait for WebSocket connection and initial message before returning flag value", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    mockServer.on("connection", (socket) => {
      socket.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());
        expect(parsedData).toEqual({
          apiKey: "API_KEY",
          clientVersion: `schematic-js@${version}`,
          data: context,
        });

        setTimeout(() => {
          socket.send(
            JSON.stringify({
              flags: [
                {
                  flag: "TEST_FLAG",
                  value: true,
                },
              ],
            }),
          );
        }, 100);
      });
    });

    const flagValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });

    expect(flagValue).toBe(true);
  }, 15000);

  it("should handle connection closing and reopening", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    let connectionCount = 0;

    mockServer.on("connection", (socket) => {
      connectionCount++;
      socket.on("message", () => {
        socket.send(
          JSON.stringify({
            flags: [
              {
                flag: "TEST_FLAG",
                value: true,
              },
            ],
          }),
        );
      });
    });

    const firstCheckResult = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(firstCheckResult).toBe(true);
    expect(connectionCount).toBe(1);

    mockServer.stop();
    await schematic.cleanup();
    await new Promise((resolve) => setTimeout(resolve, 500));

    mockServer = new WebSocketServer(FULL_WS_URL);
    mockServer.on("connection", (socket) => {
      connectionCount++;
      socket.on("message", () => {
        socket.send(
          JSON.stringify({
            flags: [
              {
                flag: "TEST_FLAG",
                value: true,
              },
            ],
          }),
        );
      });
    });

    const secondCheckResult = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });

    expect(secondCheckResult).toBe(true);
    expect(connectionCount).toBe(2);
  }, 15000);

  it("should fall back to REST API if WebSocket connection fails", async () => {
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    // Mock the successful flag check API response
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              value: true,
              flag: "TEST_FLAG",
              companyId: context.company?.companyId,
              userId: context.user?.userId,
            },
          }),
      }),
    );

    // Mock the flag check event endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const flagValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });

    expect(flagValue).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2); // One for flag check, one for event
  });

  it("should return fallback value if REST API call fails", async () => {
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    // API response with server error
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    // Mock the flag check event endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const flagValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: true,
    });

    expect(flagValue).toBe(true); // fallback value
    expect(mockFetch).toHaveBeenCalledTimes(2); // One for flag check attempt, one for event
  });

  it("should return fallback value if REST API call throws", async () => {
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    // network error
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new Error("Network error")),
    );

    // Mock the flag check event endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const flagValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: true,
    });

    expect(flagValue).toBe(true); // fallback value
    expect(mockFetch).toHaveBeenCalledTimes(2); // One for flag check attempt, one for event
  });

  it("should use cached values for subsequent checks", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    let messageCount = 0;
    mockServer.on("connection", (socket) => {
      socket.on("message", () => {
        messageCount++;
        socket.send(
          JSON.stringify({
            flags: [
              {
                flag: "TEST_FLAG",
                value: true,
              },
            ],
          }),
        );
      });
    });

    const firstValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });

    const secondValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });

    expect(firstValue).toBe(true);
    expect(secondValue).toBe(true);
    expect(messageCount).toBe(1);
  });
});
