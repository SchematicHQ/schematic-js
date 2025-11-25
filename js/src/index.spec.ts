import { vi } from "vitest";
import { Schematic } from "./index";
import { RuleType } from "./types";
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

    (typeof window === "undefined" ? it.skip : it)(
      "should flush event queue on beforeunload event",
      () => {
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
      },
    );
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

describe("Fallback Values", () => {
  afterEach(() => {
    mockFetch.mockClear();
  });

  describe("flagValueDefaults", () => {
    it("should use flagValueDefaults when offline and no callsite fallback provided", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'premium-feature': true,
          'beta-feature': false,
        },
      });

      const premiumResult = await schematic.checkFlag({ key: 'premium-feature' });
      const betaResult = await schematic.checkFlag({ key: 'beta-feature' });
      const unknownResult = await schematic.checkFlag({ key: 'unknown-feature' });

      expect(premiumResult).toBe(true);
      expect(betaResult).toBe(false);
      expect(unknownResult).toBe(false); // Default false
    });

    it("should use flagValueDefaults when REST API fails", async () => {
      const schematic = new Schematic("API_KEY", {
        flagValueDefaults: {
          'api-failure-test': true,
        },
      });

      // Mock API failure
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("Network error"))
      );

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await schematic.checkFlag({ key: 'api-failure-test' });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // One for flag check attempt, one for event
    });
  });

  describe("flagCheckDefaults", () => {
    it("should use flagCheckDefaults when offline and no callsite fallback provided", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagCheckDefaults: {
          'advanced-feature': {
            flag: 'advanced-feature',
            value: true,
            reason: 'Company has premium plan',
            ruleType: RuleType.PLAN_ENTITLEMENT,
            featureAllocation: 1000,
            featureUsage: 250,
            featureUsageEvent: 'api_call',
          },
        },
      });

      const result = await schematic.checkFlag({ key: 'advanced-feature' });

      expect(result).toBe(true);
    });

    it("should use flagCheckDefaults when REST API fails", async () => {
      const schematic = new Schematic("API_KEY", {
        flagCheckDefaults: {
          'complex-fallback': {
            flag: 'complex-fallback',
            value: false,
            reason: 'Usage limit exceeded',
            ruleType: RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED,
            featureUsageExceeded: true,
          },
        },
      });

      // Mock API failure
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await schematic.checkFlag({ key: 'complex-fallback' });

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Priority Order", () => {
    it("should prioritize callsite fallback over flagValueDefaults", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'priority-test': false, // Default says false
        },
      });

      const withoutCallsite = await schematic.checkFlag({ key: 'priority-test' });
      const withCallsite = await schematic.checkFlag({ key: 'priority-test', fallback: true });

      expect(withoutCallsite).toBe(false); // Uses flagValueDefaults
      expect(withCallsite).toBe(true); // Uses callsite fallback
    });

    it("should prioritize callsite fallback over flagCheckDefaults", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagCheckDefaults: {
          'priority-test': {
            flag: 'priority-test',
            value: false,
            reason: 'Default from flagCheckDefaults',
          },
        },
      });

      const withoutCallsite = await schematic.checkFlag({ key: 'priority-test' });
      const withCallsite = await schematic.checkFlag({ key: 'priority-test', fallback: true });

      expect(withoutCallsite).toBe(false); // Uses flagCheckDefaults
      expect(withCallsite).toBe(true); // Uses callsite fallback
    });

    it("should prioritize flagCheckDefaults over flagValueDefaults", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'priority-test': true, // Simple default says true
        },
        flagCheckDefaults: {
          'priority-test': {
            flag: 'priority-test',
            value: false, // Complex default says false
            reason: 'flagCheckDefaults takes priority',
          },
        },
      });

      const result = await schematic.checkFlag({ key: 'priority-test' });

      expect(result).toBe(false); // Uses flagCheckDefaults, not flagValueDefaults
    });

    it("should use default false when no fallbacks are configured", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
      });

      const result = await schematic.checkFlag({ key: 'unconfigured-flag' });

      expect(result).toBe(false);
    });

    it("should prioritize API response over all fallbacks", async () => {
      const schematic = new Schematic("API_KEY", {
        flagValueDefaults: {
          'api-priority-test': false,
        },
        flagCheckDefaults: {
          'api-priority-test': {
            flag: 'api-priority-test',
            value: false,
            reason: 'Should not be used',
          },
        },
      });

      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };

      const expectedResponse = {
        data: {
          companyId: "comp_YRucCyZ3us4",
          flag: "api-priority-test",
          reason: "API response takes priority",
          value: true, // API says true, overriding all fallbacks
        },
      };

      // Mock successful API response
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

      const result = await schematic.checkFlag({
        key: 'api-priority-test',
        context,
        fallback: false, // Even callsite fallback doesn't matter when API succeeds
      });

      expect(result).toBe(true); // API response wins
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Combined fallbacks", () => {
    it("should handle both flagValueDefaults and flagCheckDefaults correctly", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'simple-flag': true,
        },
        flagCheckDefaults: {
          'complex-flag': {
            flag: 'complex-flag',
            value: false,
            reason: 'Complex fallback',
          },
        },
      });

      const simpleResult = await schematic.checkFlag({ key: 'simple-flag' });
      const complexResult = await schematic.checkFlag({ key: 'complex-flag' });

      expect(simpleResult).toBe(true); // From flagValueDefaults
      expect(complexResult).toBe(false); // From flagCheckDefaults
    });
  });

  describe("CheckFlagReturn object construction from flagValueDefaults", () => {
    it("should construct complete CheckFlagReturn object from boolean flagValueDefaults value", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'boolean-only-flag': true,
        },
      });

      // We need to test the internal method since there's no public method that returns CheckFlagReturn
      // This tests the behavior that would occur if such a method existed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (schematic as any).resolveFallbackCheckFlagReturn(
        'boolean-only-flag',
        undefined,
        "Test fallback scenario"
      );

      // Should construct a complete CheckFlagReturn object
      expect(result).toEqual({
        flag: 'boolean-only-flag',
        value: true, // From flagValueDefaults
        reason: "Test fallback scenario",
        error: undefined,
      });

      // Should have the essential properties
      expect(result.flag).toBe('boolean-only-flag');
      expect(result.value).toBe(true);
      expect(result.reason).toBe("Test fallback scenario");
      expect(result.error).toBeUndefined();

      // Rich metadata fields should be undefined since we only have boolean
      expect(result.ruleType).toBeUndefined();
      expect(result.featureUsage).toBeUndefined();
      expect(result.featureAllocation).toBeUndefined();
      expect(result.featureUsageEvent).toBeUndefined();
      expect(result.featureUsageExceeded).toBeUndefined();
    });

    it("should construct CheckFlagReturn with false value from flagValueDefaults", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'disabled-flag': false,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (schematic as any).resolveFallbackCheckFlagReturn(
        'disabled-flag',
        undefined,
        "Test fallback scenario"
      );

      expect(result).toEqual({
        flag: 'disabled-flag',
        value: false, // From flagValueDefaults
        reason: "Test fallback scenario",
        error: undefined,
      });
    });

    it("should prioritize flagCheckDefaults over constructed object from flagValueDefaults", async () => {
      const schematic = new Schematic("API_KEY", {
        offline: true,
        flagValueDefaults: {
          'priority-flag': true, // Boolean default
        },
        flagCheckDefaults: {
          'priority-flag': {
            flag: 'priority-flag',
            value: false, // Rich default with different value
            reason: 'Rich default takes priority',
            ruleType: RuleType.PLAN_ENTITLEMENT,
            featureAllocation: 100,
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (schematic as any).resolveFallbackCheckFlagReturn(
        'priority-flag',
        undefined,
        "Test fallback scenario"
      );

      // Should use flagCheckDefaults, not construct from flagValueDefaults
      expect(result.value).toBe(false); // From flagCheckDefaults, not flagValueDefaults
      expect(result.reason).toBe('Rich default takes priority'); // From flagCheckDefaults
      expect(result.ruleType).toBe(RuleType.PLAN_ENTITLEMENT); // Rich metadata preserved
      expect(result.featureAllocation).toBe(100);
    });
  });
});

describe("WebSocket Fallback Behavior", () => {
  let mockServer: WebSocketServer;
  const TEST_WS_URL = "ws://localhost:1234";
  const FULL_WS_URL = `${TEST_WS_URL}/flags/bootstrap?apiKey=API_KEY`;

  beforeEach(() => {
    mockServer?.stop();
    mockServer = new WebSocketServer(FULL_WS_URL);
  });

  afterEach(async () => {
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
    mockFetch.mockClear();
  });

  describe("Before WebSocket connection is established", () => {
    it("should use flagValueDefaults when WebSocket connection is pending", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagValueDefaults: {
          'ws-pending-test': true,
        },
      });

      // Set up WebSocket connection but don't send any flag data
      let connectionEstablished = false;
      mockServer.on("connection", (socket) => {
        connectionEstablished = true;
        // Don't send any response - simulate pending state
        socket.on("message", () => {
          // Don't send any response to simulate pending/timeout
        });
      });

      const result = await schematic.checkFlag({ key: 'ws-pending-test' });

      // Connection should be established but no flag data received
      expect(connectionEstablished).toBe(true);

      // Should use fallback from flagValueDefaults since no WebSocket response for this flag
      expect(result).toBe(true);

      await schematic.cleanup();
    });

    it("should use flagCheckDefaults when WebSocket connection is pending", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagCheckDefaults: {
          'ws-pending-complex': {
            flag: 'ws-pending-complex',
            value: false,
            reason: 'WebSocket connection pending',
          },
        },
      });

      // Set up WebSocket connection but don't send any flag data
      let connectionEstablished = false;
      mockServer.on("connection", (socket) => {
        connectionEstablished = true;
        // Don't send any response - simulate pending state
        socket.on("message", () => {
          // Don't send any response to simulate pending/timeout
        });
      });

      const result = await schematic.checkFlag({ key: 'ws-pending-complex' });

      // Connection should be established but no flag data received
      expect(connectionEstablished).toBe(true);

      // Should use fallback from flagCheckDefaults since no WebSocket response for this flag
      expect(result).toBe(false);

      await schematic.cleanup();
    });
  });

  describe("When WebSocket connection cannot be established", () => {
    it("should use flagValueDefaults when WebSocket connection fails", async () => {
      // Stop the mock server to simulate connection failure
      mockServer.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagValueDefaults: {
          'ws-failure-test': true,
        },
      });

      // Mock successful REST fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: {
            flag: 'ws-failure-test',
            value: true,
            reason: 'REST fallback after WebSocket failure',
          },
        }),
      });

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await schematic.checkFlag({ key: 'ws-failure-test' });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // REST fallback + event

      await schematic.cleanup();
    });

    it("should use flagCheckDefaults when both WebSocket and REST fail", async () => {
      // Stop the mock server to simulate WebSocket connection failure
      mockServer.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagCheckDefaults: {
          'ws-rest-failure': {
            flag: 'ws-rest-failure',
            value: false,
            reason: 'Both WebSocket and REST failed',
          },
        },
      });

      // Mock REST API failure
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("REST API also failed"))
      );

      // Mock the flag check event endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await schematic.checkFlag({ key: 'ws-rest-failure' });

      expect(result).toBe(false); // From flagCheckDefaults
      expect(mockFetch).toHaveBeenCalledTimes(2); // REST attempt + event

      await schematic.cleanup();
    });
  });

  describe("After WebSocket connection is established and then lost", () => {
    it("should use cached WebSocket values rather than fallbacks after connection loss", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagValueDefaults: {
          'ws-cache-test': false, // Fallback says false
        },
      });

      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };

      // Set up WebSocket connection that sends flag value
      mockServer.on("connection", (socket) => {
        socket.on("message", () => {
          socket.send(
            JSON.stringify({
              flags: [
                {
                  flag: "ws-cache-test",
                  value: true, // WebSocket says true (different from fallback)
                  reason: "WebSocket response",
                },
              ],
            }),
          );
        });
      });

      // First check - should get value from WebSocket
      const firstResult = await schematic.checkFlag({
        key: 'ws-cache-test',
        context,
      });

      expect(firstResult).toBe(true); // WebSocket value

      // Now close the WebSocket connection to simulate connection loss
      mockServer.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second check after connection loss - should use cached WebSocket value, not fallback
      const secondResult = await schematic.checkFlag({
        key: 'ws-cache-test',
        context,
      });

      expect(secondResult).toBe(true); // Still uses cached WebSocket value (true), not fallback (false)

      await schematic.cleanup();
    });

    it("should handle unknown flags with fallbacks after WebSocket connection loss", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagValueDefaults: {
          'unknown-flag': true,
        },
      });

      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };

      // Set up WebSocket connection that sends different flag value
      mockServer.on("connection", (socket) => {
        socket.on("message", () => {
          socket.send(
            JSON.stringify({
              flags: [
                {
                  flag: "known-flag", // Different flag
                  value: true,
                  reason: "WebSocket response",
                },
              ],
            }),
          );
        });
      });

      // First check - establish WebSocket connection with different flag
      await schematic.checkFlag({
        key: 'known-flag',
        context,
      });

      // Close WebSocket connection
      mockServer.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check for unknown flag after connection loss - should use fallback since no cached value exists
      const result = await schematic.checkFlag({
        key: 'unknown-flag',
        context,
      });

      expect(result).toBe(true); // Uses fallback since no cached value for this flag

      await schematic.cleanup();
    });
  });

  describe("WebSocket priority over fallbacks", () => {
    it("should prioritize WebSocket values over flagValueDefaults when connected", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagValueDefaults: {
          'ws-priority-test': false, // Fallback says false
        },
      });

      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };

      // WebSocket returns true (opposite of fallback)
      mockServer.on("connection", (socket) => {
        socket.on("message", () => {
          socket.send(
            JSON.stringify({
              flags: [
                {
                  flag: "ws-priority-test",
                  value: true, // WebSocket says true
                  reason: "WebSocket has priority",
                },
              ],
            }),
          );
        });
      });

      const result = await schematic.checkFlag({
        key: 'ws-priority-test',
        context,
      });

      expect(result).toBe(true); // WebSocket value wins over fallback

      await schematic.cleanup();
    });

    it("should prioritize WebSocket values over flagCheckDefaults when connected", async () => {
      const schematic = new Schematic("API_KEY", {
        useWebSocket: true,
        webSocketUrl: TEST_WS_URL,
        flagCheckDefaults: {
          'ws-priority-complex': {
            flag: 'ws-priority-complex',
            value: false, // Complex fallback says false
            reason: 'Should not be used when WebSocket is connected',
          },
        },
      });

      const context = {
        company: { companyId: "456" },
        user: { userId: "123" },
      };

      // WebSocket returns true (opposite of fallback)
      mockServer.on("connection", (socket) => {
        socket.on("message", () => {
          socket.send(
            JSON.stringify({
              flags: [
                {
                  flag: "ws-priority-complex",
                  value: true, // WebSocket says true
                  reason: "WebSocket value overrides fallback",
                },
              ],
            }),
          );
        });
      });

      const result = await schematic.checkFlag({
        key: 'ws-priority-complex',
        context,
      });

      expect(result).toBe(true); // WebSocket value wins over complex fallback

      await schematic.cleanup();
    });
  });
});

describe("forceReconnect", () => {
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

  it("should immediately reconnect and get fresh flag values", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    let connectionCount = 0;
    let flagValue = true;

    mockServer.on("connection", (socket) => {
      connectionCount++;
      socket.on("message", () => {
        socket.send(
          JSON.stringify({
            flags: [
              {
                flag: "TEST_FLAG",
                value: flagValue,
              },
            ],
          }),
        );
      });
    });

    // Establish initial connection
    const firstValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(firstValue).toBe(true);
    expect(connectionCount).toBe(1);

    // Change the flag value that will be returned
    flagValue = false;

    // Force reconnect - should get new value
    await schematic.forceReconnect();

    // Give time for reconnection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have made a new connection
    expect(connectionCount).toBe(2);

    // Check flag should now return the new value
    const secondValue = await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: true,
    });
    expect(secondValue).toBe(false);
  }, 15000);

  it("should reconnect even after max retry attempts exhausted", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    // Create client with very few retry attempts
    await schematic.cleanup();
    schematic = new Schematic("API_KEY", {
      useWebSocket: true,
      webSocketUrl: TEST_WS_URL,
      webSocketMaxReconnectAttempts: 1,
    });

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

    // Establish initial connection
    await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(connectionCount).toBe(1);

    // Simulate connection loss and wait for retries to exhaust
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Restart server
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

    // forceReconnect should work even though retries were exhausted
    await schematic.forceReconnect();

    // Give time for reconnection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have made a new connection
    expect(connectionCount).toBe(2);
  }, 15000);

  it("should cancel pending reconnection timer and reconnect immediately", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    // Create client with long initial retry delay
    await schematic.cleanup();
    schematic = new Schematic("API_KEY", {
      useWebSocket: true,
      webSocketUrl: TEST_WS_URL,
      webSocketInitialRetryDelay: 10000, // 10 second delay
    });

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

    // Establish initial connection
    await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(connectionCount).toBe(1);

    // Close connection to trigger reconnection with long delay
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restart server
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

    // forceReconnect should bypass the 10 second delay and reconnect immediately
    const startTime = Date.now();
    await schematic.forceReconnect();
    const elapsed = Date.now() - startTime;

    // Should have reconnected much faster than the 10 second delay
    expect(elapsed).toBeLessThan(2000);

    // Give time for reconnection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have made a new connection
    expect(connectionCount).toBe(2);
  }, 15000);

  it("should be a no-op in offline mode", async () => {
    await schematic.cleanup();
    schematic = new Schematic("API_KEY", {
      offline: true,
    });

    // Should not throw and should complete immediately
    await schematic.forceReconnect();

    // No connections should have been made
    // (We can't easily verify this, but at least it shouldn't throw)
  });

  it("should handle forceReconnect when no context is set", async () => {
    // Create a fresh client without setting context
    await schematic.cleanup();
    schematic = new Schematic("API_KEY", {
      useWebSocket: true,
      webSocketUrl: TEST_WS_URL,
    });

    let connectionCount = 0;

    mockServer.on("connection", () => {
      connectionCount++;
    });

    // forceReconnect without context should not create a connection
    await schematic.forceReconnect();

    // Give time for any potential connection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // No connection should be made since there's no context
    expect(connectionCount).toBe(0);
  }, 15000);

  it("should reconnect even if connection is healthy", async () => {
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

    // Establish initial connection
    await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(connectionCount).toBe(1);

    // forceReconnect should reconnect even if connection is healthy
    await schematic.forceReconnect();

    // Give time for reconnection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have made a new connection (total 2)
    expect(connectionCount).toBe(2);
  }, 15000);
});

describe("reconnectIfNeeded", () => {
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

  it("should no-op if connection is healthy", async () => {
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

    // Establish initial connection
    await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(connectionCount).toBe(1);

    // reconnectIfNeeded should no-op since connection is healthy
    await schematic.reconnectIfNeeded();

    // Give time for any potential connection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should still be just 1 connection
    expect(connectionCount).toBe(1);
  }, 15000);

  it("should reconnect if connection is unhealthy", async () => {
    const context = {
      company: { companyId: "456" },
      user: { userId: "123" },
    };

    let connectionCount = 0;
    const serverSockets: WebSocket[] = [];

    mockServer.on("connection", (socket) => {
      connectionCount++;
      serverSockets.push(socket);
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

    // Establish initial connection
    await schematic.checkFlag({
      key: "TEST_FLAG",
      context,
      fallback: false,
    });
    expect(connectionCount).toBe(1);

    // Explicitly close the server-side socket to ensure client knows connection is closed
    serverSockets.forEach((socket) => socket.close());
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close the server
    mockServer.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restart server
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

    // reconnectIfNeeded should reconnect since connection is unhealthy
    await schematic.reconnectIfNeeded();

    // Give time for reconnection
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have made a new connection
    expect(connectionCount).toBe(2);
  }, 15000);
});
