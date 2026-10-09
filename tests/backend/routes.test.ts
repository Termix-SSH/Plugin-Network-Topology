import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startServer, type TestServer } from "./helpers";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

describe("GET /", () => {
  it("returns null when the user has no saved topology", async () => {
    const res = await server.request("GET", "/");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("returns the saved topology", async () => {
    await server.request("POST", "/", {
      body: { topology: { nodes: [{ data: { id: "host-1" } }], edges: [] } },
    });

    const res = await server.request("GET", "/");
    expect(res.body).toEqual({
      nodes: [{ data: { id: "host-1" } }],
      edges: [],
    });
  });

  it("keeps each user's topology separate", async () => {
    await server.request("POST", "/", {
      user: "user-1",
      body: { topology: { nodes: [{ data: { id: "a" } }], edges: [] } },
    });

    const res = await server.request("GET", "/", { user: "user-2" });
    expect(res.body).toBeNull();
  });
});

describe("POST /", () => {
  it("saves and overwrites the topology", async () => {
    const first = await server.request("POST", "/", {
      body: { topology: { nodes: [], edges: [] } },
    });
    expect(first.body).toEqual({ success: true });

    await server.request("POST", "/", {
      body: { topology: { nodes: [{ data: { id: "a" } }], edges: [] } },
    });

    const res = await server.request("GET", "/");
    expect(res.body).toEqual({ nodes: [{ data: { id: "a" } }], edges: [] });
  });

  it("accepts a topology sent as a JSON string", async () => {
    await server.request("POST", "/", {
      body: { topology: JSON.stringify({ nodes: [], edges: [] }) },
    });
    const res = await server.request("GET", "/");
    expect(res.body).toEqual({ nodes: [], edges: [] });
  });

  it("rejects a topology that is not a nodes and edges object", async () => {
    for (const topology of [
      "not json",
      [1, 2],
      { nodes: "x" },
      { nodes: [], edges: 5 },
    ]) {
      const res = await server.request("POST", "/", { body: { topology } });
      expect(res.status).toBe(400);
    }
    expect((await server.request("GET", "/")).body).toBeNull();
  });

  it("rejects a request with no topology", async () => {
    const res = await server.request("POST", "/", { body: {} });
    expect(res.status).toBe(400);
  });
});

describe("permissions", () => {
  it("refuses every route without network-topology.use", async () => {
    const denied = await startServer({ permissions: [] });
    try {
      expect((await denied.request("GET", "/")).status).toBe(403);
      expect(
        (
          await denied.request("POST", "/", {
            body: { topology: { nodes: [], edges: [] } },
          })
        ).status,
      ).toBe(403);
    } finally {
      await denied.close();
    }
  });
});
