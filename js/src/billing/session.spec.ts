import { vi } from "vitest";

import { fakeFetch, tokens } from "./testing";
import {
  SchematicApiError,
  SchematicSession,
  TOKEN_CACHE_SIZE,
  sessionKey,
} from "./session";

describe("sessionKey", () => {
  it("is the (company, user) pair, not the company alone", () => {
    // Users and companies are many-to-many: the same person reads two
    // companies, and the same company is read by two people. Keying by
    // either alone hands one reader's rows to the other.
    const alice = { company: "comp_a", user: "user_1", token: "t" };
    expect(sessionKey(alice)).toBe(
      sessionKey({ company: "comp_a", user: "user_1", token: "other" }),
    );
    expect(sessionKey(alice)).not.toBe(
      sessionKey({ company: "comp_a", user: "user_2", token: "t" }),
    );
    expect(sessionKey(alice)).not.toBe(
      sessionKey({ company: "comp_b", user: "user_1", token: "t" }),
    );
    // A company-wide token names no user, and that is its own session too.
    expect(sessionKey({ company: "comp_a", token: "t" })).not.toBe(
      sessionKey(alice),
    );
  });
});

describe("SchematicSession", () => {
  it("sends the credential and reports where the request went", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(calls[0].url).toBe("https://api.schematichq.com/probe");
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t");
  });

  it("carries a body and its content type when one is sent", async () => {
    // What checkout will need of the same machinery.
    const sent: RequestInit[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent.push(init);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await session.request("/checkout", { method: "POST", body: { a: 1 } });
    expect(sent[0].method).toBe("POST");
    expect(sent[0].body).toBe('{"a":1}');
    expect((sent[0].headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("resolves a token provider once and shares it across concurrent requests", async () => {
    const provider = vi.fn(async () => ({ token: "t1" }));
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: provider },
      fetch: fetchImpl,
    });
    await Promise.all([session.request("/probe"), session.request("/probe")]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(tokens(calls)).toEqual(["t1", "t1"]);
  });

  it("refreshes the token once after a 401 and retries", async () => {
    let n = 0;
    const provider = vi.fn(async () => `t${++n}`);
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "t1"
        ? { status: 401, body: { error: "expired" } }
        : {},
    );
    const session = new SchematicSession({
      session: { company: "comp_a", token: provider },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("re-resolves an expired cached token before requesting", async () => {
    let n = 0;
    const provider = vi.fn(async () => ({
      token: `t${++n}`,
      expiresAt: new Date(Date.now() - 1000),
    }));
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: provider },
      fetch: fetchImpl,
    });
    await session.request("/probe");
    await session.request("/probe");
    expect(provider).toHaveBeenCalledTimes(2);
    expect(tokens(calls)).toEqual(["t1", "t2"]);
  });

  it("does not retry a 401 with a string token; it surfaces the error", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 401,
      body: { error: "nope" },
    }));
    const session = new SchematicSession({
      session: { company: "comp_a", token: "tok" },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).rejects.toMatchObject({
      name: "SchematicApiError",
      status: 401,
      message: "nope",
    });
  });

  it("says a session started when the host first states one", () => {
    const session = new SchematicSession();
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    expect(session.status).toBe("pending");
    session.set({ company: "comp_a", token: "t1" });
    expect(session.status).toBe("active");
    expect(events).toEqual(["started"]);
  });

  it("says nothing about a session the host has not resolved yet", () => {
    // Every async auth renders once before it knows. Reading that as a
    // change would drop the rows it just loaded.
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t1" },
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set(undefined);
    expect(events).toEqual([]);
    expect(session.status).toBe("active");
  });

  it("treats a rebuilt token closure for the same pair as the same session", async () => {
    // The documented shape: `token: async () => …` written inline, so the
    // function is new on every render while the pair is not.
    const { calls, fetchImpl } = fakeFetch();
    let issued = 0;
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => `t${++issued}` },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    await session.request("/probe");
    session.set({ company: "comp_a", token: async () => `t${++issued}` });
    await session.request("/probe");

    expect(events).toEqual([]);
    expect(tokens(calls)).toEqual(["t1", "t1"]);
  });

  it("says a session changed when the company does", () => {
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t1" },
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set({ company: "comp_b", token: "t1" });
    expect(events).toEqual(["changed"]);
  });

  it("says a session changed when the user does under one company", () => {
    // The other axis of the many-to-many: a support tool reading one
    // company as two different people sees two sessions, not one.
    const session = new SchematicSession({
      session: { company: "comp_a", user: "user_1", token: "t1" },
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set({ company: "comp_a", user: "user_2", token: "t1" });
    expect(events).toEqual(["changed"]);
  });

  it("reads a user stated as null the way the session key reads it", async () => {
    // `sessionKey` collapses an absent user and an explicit null, so a host
    // writing `user: userId ?? null` — plain JS, past the type — must not
    // have its own session read as a change and its rows dropped.
    const session = new SchematicSession({
      session: { company: "comp_a", user: undefined, token: "t" },
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set({ company: "comp_a", user: null, token: "t" } as never);
    expect(events).toEqual([]);
    expect(session.key).toBe(sessionKey({ company: "comp_a", token: "t" }));
  });

  it("does not read its own token refresh as a new session", async () => {
    // Comparing token values would make every expiry look like a different
    // company and drop every loaded resource.
    let issued = 0;
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: async () => ({
          token: `t${++issued}`,
          expiresAt: new Date(Date.now() - 1),
        }),
      },
      fetch: fakeFetch().fetchImpl,
    });
    const listener = vi.fn();
    session.onChange(listener);

    await session.request("/probe");
    await session.request("/probe");
    await session.request("/probe");

    expect(issued).toBeGreaterThan(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("still refreshes a 401 when the host restates the same session", async () => {
    // The session object is new every render while the pair is not.
    // Comparing objects would hand the reader the 401 instead of retrying.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "t1"
        ? { status: 401, body: { error: "expired" } }
        : {},
    );
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    const request = session.request("/probe");
    // The re-render lands while the request is on the wire.
    session.set({ company: "comp_a", token: mint });
    await expect(request).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("keeps a resolved token through a restatement of the same session", async () => {
    // Same reason on the caching side: a resolution that lands after a
    // re-render still belongs to this session, and discarding it would ask
    // the token endpoint again on every render.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    const request = session.request("/probe");
    session.set({ company: "comp_a", token: mint });
    await request;
    await session.request("/probe");

    expect(issued).toBe(1);
    expect(tokens(calls)).toEqual(["t1", "t1"]);
  });

  it("abandons the retry when the session changes while the body drains", async () => {
    // The window between the 401 arriving and its body being read. Landing
    // the change from inside `text()` is what puts it there — stating it any
    // earlier takes the guard before this one.
    const sent: string[] = [];
    let session: SchematicSession | undefined;
    const fetchImpl = (async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      sent.push(init.headers["X-Schematic-Api-Key"]);
      const response = new Response(JSON.stringify({ error: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
      const text = response.text.bind(response);
      Object.defineProperty(response, "text", {
        value: async () => {
          const body = await text();
          session?.set({ company: "comp_b", token: "t_b" });
          return body;
        },
      });
      return response;
    }) as unknown as typeof fetch;
    session = new SchematicSession({
      session: { company: "comp_a", token: async () => "t_a" },
      fetch: fetchImpl,
    });

    // The 401 is what this request gets: its retry belonged to a session
    // that is no longer being read.
    const error = await session
      .request("/probe")
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 401, body: { error: "expired" } });
    expect(sent).toEqual(["t_a"]);
  });

  it("abandons the retry when the session changes while the token mints", async () => {
    // The other window: the forced refresh is a round trip to the host's own
    // token endpoint, and a reader can switch organizations during it.
    const sent: string[] = [];
    let session: SchematicSession | undefined;
    let minted = 0;
    const mint = async () => {
      if (++minted > 1) {
        session?.set({ company: "comp_b", token: "t_b" });
      }
      return `t_a${minted}`;
    };
    const fetchImpl = (async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      sent.push(init.headers["X-Schematic-Api-Key"]);
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    const error = await session
      .request("/probe")
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(sent).toEqual(["t_a1"]);
  });

  it("stops serving the token a 401 has already rejected", async () => {
    // A request resolving alongside a forced refresh would take the rejected
    // token from the cache, 401 in its turn, and force a refresh of its own.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "t1"
        ? { status: 401, body: { error: "expired" } }
        : {},
    );
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    await session.request("/probe");
    await session.request("/probe");
    expect(tokens(calls).filter((token) => token === "t1")).toHaveLength(1);
  });

  it("refreshes a 401 through the token the session says now", async () => {
    // A host whose token function closes over a value rather than minting on
    // each call restates the same pair to hand over a fresher one. `set`
    // keeps the session — only what the next resolution calls changed — so
    // the retry has to ask what it left, not the closure this request
    // captured, or it re-sends the token the API just rejected.
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "stale"
        ? { status: 401, body: { error: "expired" } }
        : {},
    );
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => "stale" },
      fetch: fetchImpl,
    });
    const request = session.request("/probe");
    session.set({ company: "comp_a", token: async () => "fresh" });

    await expect(request).resolves.toEqual({ ok: true });
    expect(tokens(calls)).toEqual(["stale", "fresh"]);
  });

  it("survives a logout landing mid-request", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      status: 401,
      body: { error: "expired" },
    }));
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => "t1" },
      fetch: fetchImpl,
    });
    const request = session.request("/probe");
    session.set(null);
    // The session ended while the token was minting, so the request is
    // abandoned rather than sent: a reader who signed out is owed no call
    // carrying the credential they signed out of.
    await expect(request).rejects.toThrow(
      "The session changed before this request was sent.",
    );
    expect(calls).toHaveLength(0);
  });

  it("abandons a request whose company changed while the token minted", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => "t_a" },
      fetch: fetchImpl,
    });
    const request = session.request("/probe");
    session.set({ company: "comp_b", token: async () => "t_b" });
    // Answering it would hand company B's rows back as the answer to a
    // question asked for company A.
    await expect(request).rejects.toThrow(
      "The session changed before this request was sent.",
    );
    expect(calls).toHaveLength(0);
  });

  it("does not answer with rows fetched for the pair being left", async () => {
    // The switch lands while the response is on the wire. Handed back, it is
    // one company's rows returned as the answer to a question asked for
    // another.
    let session: SchematicSession | undefined;
    const fetchImpl = (async () => {
      session?.set({ company: "comp_b", token: "t_b" });
      return new Response(JSON.stringify({ rows: "comp_a" }), { status: 200 });
    }) as unknown as typeof fetch;
    session = new SchematicSession({
      session: { company: "comp_a", token: "t_a" },
      fetch: fetchImpl,
    });

    await expect(session.request("/probe")).rejects.toThrow(
      "The session changed while this request was in flight.",
    );
  });

  it("does not answer with rows still downloading when the pair changes", async () => {
    // The body streams: the switch has as long to land as the download
    // takes, which for a page of invoices is not one packet.
    let session: SchematicSession | undefined;
    const fetchImpl = (async () => {
      const response = new Response(JSON.stringify({ rows: "comp_a" }), {
        status: 200,
      });
      const text = response.text.bind(response);
      Object.defineProperty(response, "text", {
        value: async () => {
          const body = await text();
          session?.set({ company: "comp_b", token: "t_b" });
          return body;
        },
      });
      return response;
    }) as unknown as typeof fetch;
    session = new SchematicSession({
      session: { company: "comp_a", token: "t_a" },
      fetch: fetchImpl,
    });

    await expect(session.request("/probe")).rejects.toThrow(
      "The session changed while this request was in flight.",
    );
  });

  it("releases the connection under a response it abandons", async () => {
    // A body nobody reads holds the socket until it is collected, and a
    // session switched repeatedly abandons one per switch.
    const cancel = vi.fn(async () => undefined);
    let session: SchematicSession | undefined;
    const fetchImpl = (async () => {
      const response = new Response(JSON.stringify({ rows: "comp_a" }), {
        status: 200,
      });
      Object.defineProperty(response, "body", { value: { cancel } });
      session?.set({ company: "comp_b", token: "t_b" });
      return response;
    }) as unknown as typeof fetch;
    session = new SchematicSession({
      session: { company: "comp_a", token: "t_a" },
      fetch: fetchImpl,
    });

    await expect(session.request("/probe")).rejects.toThrow(
      "The session changed while this request was in flight.",
    );
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("declines a token stamped for another session", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      // What a provider reading a session the client has not been told about
      // yet hands back: the next pair's token, stamped as its own.
      session: {
        company: "comp_a",
        token: async () => ({ token: "t_b", company: "comp_b" }),
      },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).rejects.toThrow(
      "token for a different session",
    );
    expect(calls).toHaveLength(0);
  });

  it("takes a token that names the user a company-wide session does not", async () => {
    // The host models sessions per company, so it names no user — while its
    // token endpoint, which knows who authenticated, says so. Read as a
    // disagreement, that fails every request such a host ever makes.
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: async () => ({
          token: "t_a",
          company: "comp_a",
          user: "user_1",
        }),
      },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(tokens(calls)).toEqual(["t_a"]);
  });

  it("declines a token stamped for another user of the same company", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        user: "user_1",
        token: async () => ({
          token: "t_2",
          company: "comp_a",
          user: "user_2",
        }),
      },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).rejects.toThrow(
      "token for a different session",
    );
    expect(calls).toHaveLength(0);
  });

  it("takes a token body the way a host actually returns one", async () => {
    // The documented usage is `(await fetch("/api/access-token")).json()`,
    // so `expiresAt` arrives as a JSON string rather than a `Date`.
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: async () => ({ token: "t1", expiresAt: "2099-01-01T00:00:00Z" }),
      },
      fetch: fetchImpl,
    });
    await session.request("/probe");
    await session.request("/probe");
    expect(tokens(calls)).toEqual(["t1", "t1"]);
  });

  it("treats an unreadable expiry as none rather than failing", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: async () => ({ token: "t1", expiresAt: "not a date" }),
      },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(tokens(calls)).toEqual(["t1", "t1"]);
  });

  it("reports a provider that returned no token", async () => {
    const { fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      // A body whose token is under another key: without a check this sends
      // `X-Schematic-Api-Key: undefined`.
      session: {
        company: "comp_a",
        token: async () => ({ accessToken: "t1" }) as never,
      },
      fetch: fetchImpl,
    });
    await expect(session.request("/probe")).rejects.toThrow(
      /did not return a token/,
    );
  });

  it("ends the session when the host says there is nobody", async () => {
    // Sign-out. The token prop may still be in hand and the endpoint behind
    // it may still mint for the company being left, so an ended session
    // reads nothing at all.
    const { fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t1" },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set(null);
    expect(events).toEqual(["ended"]);
    expect(session.status).toBe("ended");
    expect(session.key).toBeUndefined();
    await expect(session.request("/probe")).rejects.toThrow(/no session/);

    // Repeating it says nothing; there is nothing left to end.
    session.set(null);
    expect(events).toEqual(["ended"]);
  });

  it("ends a session the host never named, when auth resolves to nobody", () => {
    // Pending, then `null`: the shape an auth produces for a visitor who is
    // not signed in. Anything seeded for that page belongs to nobody.
    const session = new SchematicSession();
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set(null);
    expect(events).toEqual(["ended"]);
  });

  it("starts again when someone signs in after a sign-out", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: "t_a" },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    session.onChange((event) => events.push(event.type));

    session.set(null);
    session.set({ company: "comp_b", token: "t_b" });
    expect(events).toEqual(["ended", "started"]);
    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t_b");
  });

  it("reports a read with no session at all", async () => {
    const session = new SchematicSession();
    await expect(session.request("/probe")).rejects.toThrow(
      /session is required/,
    );
  });

  it("does not serve a resolution that belongs to the session being left", async () => {
    // A provider answering after the host moved on: its token was minted for
    // the company that has been left, and adopting it as this one's would
    // send it as the credential for the wrong company.
    let release: ((token: string) => void) | undefined;
    const slow = () =>
      new Promise<string>((resolve) => {
        release = resolve;
      });
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: slow },
      fetch: fetchImpl,
    });

    const first = session.request("/probe");
    // The provider runs on a microtask, so its release hook exists a tick in.
    await Promise.resolve();
    session.set({ company: "comp_b", token: "t_b" });
    release?.("t_a");
    await first.catch(() => undefined);

    await session.request("/probe");
    const sent = tokens(calls);
    expect(sent[sent.length - 1]).toBe("t_b");
  });

  it("asks the provider again on a 401 rather than reusing what it has", async () => {
    // The cached token is the one the API has just rejected, so the forced
    // resolution has to bypass both the cache and any resolution that
    // started before the rejection.
    let minted = 0;
    const provider = () => Promise.resolve(++minted === 1 ? "stale" : "fresh");
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "fresh"
        ? {}
        : { status: 401, body: { error: "expired" } },
    );
    const session = new SchematicSession({
      session: { company: "comp_a", token: provider },
      fetch: fetchImpl,
    });

    await expect(session.request("/probe")).resolves.toEqual({ ok: true });
    expect(minted).toBe(2);
    expect(tokens(calls)).toEqual(["stale", "fresh"]);
  });
});

describe("SchematicSession credential cache", () => {
  it("reads with the token already in hand when a reader comes back", async () => {
    // Switching between the organizations one person belongs to, and back.
    // Dropping the credential on the way out makes the return trip a round
    // trip to the host's token endpoint for a token this client still holds.
    const minted: string[] = [];
    const mint = (company: string) => async () => {
      minted.push(company);
      return `t_${company}`;
    };
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint("comp_a") },
      fetch: fetchImpl,
    });

    await session.request("/probe");
    session.set({ company: "comp_b", token: mint("comp_b") });
    await session.request("/probe");
    session.set({ company: "comp_a", token: mint("comp_a") });
    await session.request("/probe");

    expect(minted).toEqual(["comp_a", "comp_b"]);
    expect(tokens(calls)).toEqual(["t_comp_a", "t_comp_b", "t_comp_a"]);
  });

  it("holds one credential per pair, not per company", async () => {
    const minted: string[] = [];
    const mint = (who: string) => async () => {
      minted.push(who);
      return `t_${who}`;
    };
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", user: "user_1", token: mint("user_1") },
      fetch: fetchImpl,
    });

    await session.request("/probe");
    session.set({ company: "comp_a", user: "user_2", token: mint("user_2") });
    await session.request("/probe");
    session.set({ company: "comp_a", user: "user_1", token: mint("user_1") });
    await session.request("/probe");

    expect(minted).toEqual(["user_1", "user_2"]);
    expect(tokens(calls)).toEqual(["t_user_1", "t_user_2", "t_user_1"]);
  });

  it("does not serve a held credential past its expiry", async () => {
    let minted = 0;
    const mint = async () => ({
      token: `t_a${++minted}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    await session.request("/probe");
    session.set({ company: "comp_b", token: async () => "t_b" });
    await session.request("/probe");

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 120_000);
    try {
      session.set({ company: "comp_a", token: mint });
      await session.request("/probe");
    } finally {
      vi.useRealTimers();
    }

    expect(minted).toBe(2);
    expect(tokens(calls)).toEqual(["t_a1", "t_b", "t_a2"]);
  });

  it("keeps the cache bounded, evicting the session read longest ago", async () => {
    const minted: string[] = [];
    const mint = (company: string) => async () => {
      minted.push(company);
      return `t_${company}`;
    };
    const { fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_0", token: mint("comp_0") },
      fetch: fetchImpl,
    });
    await session.request("/probe");

    // One more session than the cache holds, so comp_0 is pushed out.
    for (let i = 1; i <= TOKEN_CACHE_SIZE; i++) {
      session.set({ company: `comp_${i}`, token: mint(`comp_${i}`) });
      await session.request("/probe");
    }
    session.set({ company: "comp_0", token: mint("comp_0") });
    await session.request("/probe");
    session.set({
      company: `comp_${TOKEN_CACHE_SIZE}`,
      token: mint(`comp_${TOKEN_CACHE_SIZE}`),
    });
    await session.request("/probe");

    expect(minted.filter((company) => company === "comp_0")).toHaveLength(2);
    expect(
      minted.filter((company) => company === `comp_${TOKEN_CACHE_SIZE}`),
    ).toHaveLength(1);
  });

  it("holds nothing a provider minted after the host moved on", async () => {
    // The documented provider mints for whoever the host's auth says now,
    // not for the pair it was asked for. Answering after a switch, its token
    // is the next pair's; kept under the pair that asked, it would be sent
    // as that pair's credential when the reader comes back.
    let release: ((token: string) => void) | undefined;
    const minted: string[] = [];
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: () =>
          new Promise<string>((resolve) => {
            release = resolve;
          }),
      },
      fetch: fetchImpl,
    });

    const abandoned = session.request("/probe");
    await Promise.resolve();
    session.set({ company: "comp_b", token: async () => "t_b" });
    // What the host's auth mints now that it reads comp_b.
    release?.("t_b");
    await abandoned.catch(() => undefined);

    session.set({
      company: "comp_a",
      token: async () => {
        minted.push("comp_a");
        return "t_a";
      },
    });
    await session.request("/probe");

    expect(minted).toEqual(["comp_a"]);
    expect(tokens(calls)).toEqual(["t_a"]);
  });

  it("does not settle for a resolution begun before the host moved on", async () => {
    // Switching away and back leaves the first mint in flight under the pair
    // that asked. Handed to a request made after the return, it is sent as
    // that pair's credential — the same token the cache above declines to
    // keep, for the same reason.
    let release: ((token: string) => void) | undefined;
    let minted = 0;
    const { calls, fetchImpl } = fakeFetch();
    const provider = () => {
      minted += 1;
      return minted === 1
        ? new Promise<string>((resolve) => {
            release = resolve;
          })
        : Promise.resolve("t_a");
    };
    const session = new SchematicSession({
      session: { company: "comp_a", token: provider },
      fetch: fetchImpl,
    });

    const abandoned = session.request("/probe");
    await Promise.resolve();
    session.set({ company: "comp_b", token: "t_b" });
    session.set({ company: "comp_a", token: provider });
    const afterReturn = session.request("/probe");
    // What the host's auth minted while it read comp_b.
    release?.("t_b_leaked");
    await abandoned.catch(() => undefined);
    await afterReturn;

    expect(minted).toBe(2);
    expect(tokens(calls)).toEqual(["t_a"]);
  });

  it("shares one resolution between requests made under one session", async () => {
    // The other side of it: without a switch, concurrent requests still wait
    // on one mint rather than asking the host's endpoint twice.
    let minted = 0;
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: async () => {
          minted += 1;
          return "t_a";
        },
      },
      fetch: fetchImpl,
    });

    await Promise.all([
      session.request("/probe"),
      session.request("/probe"),
      session.request("/probe"),
    ]);

    expect(minted).toBe(1);
    expect(tokens(calls)).toEqual(["t_a", "t_a", "t_a"]);
  });

  it("holds one a provider stamped, even minted across a switch", async () => {
    // Stamped, the pair is stated rather than assumed, and the check in
    // `asResolvedToken` has already confirmed it.
    let release:
      ((result: { token: string; company: string }) => void) | undefined;
    let minted = 0;
    const { calls, fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: {
        company: "comp_a",
        token: () => {
          minted += 1;
          return new Promise<{ token: string; company: string }>((resolve) => {
            release = resolve;
          });
        },
      },
      fetch: fetchImpl,
    });

    const abandoned = session.request("/probe");
    await Promise.resolve();
    session.set({ company: "comp_b", token: async () => "t_b" });
    release?.({ token: "t_a", company: "comp_a" });
    await abandoned.catch(() => undefined);

    session.set({ company: "comp_a", token: async () => "t_a2" });
    await session.request("/probe");

    expect(minted).toBe(1);
    expect(tokens(calls)).toEqual(["t_a"]);
  });

  it("holds no credential once the session ends", async () => {
    // A switch keeps them; a sign-out does not. The next person at this page
    // is somebody else, and nothing minted for the last one is theirs.
    const minted: string[] = [];
    const mint = async () => {
      minted.push("comp_a");
      return "t_a";
    };
    const { fetchImpl } = fakeFetch();
    const session = new SchematicSession({
      session: { company: "comp_a", token: mint },
      fetch: fetchImpl,
    });

    await session.request("/probe");
    session.set(null);
    session.set({ company: "comp_a", token: mint });
    await session.request("/probe");

    expect(minted).toHaveLength(2);
  });
});
