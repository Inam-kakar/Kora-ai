import { describe, expect, it, vi } from "vitest";

import {
  createVertexGoogleAuthOptions,
  VertexCliFallbackAuthClient,
} from "@/lib/vertex-auth";

describe("VertexCliFallbackAuthClient", () => {
  it("prefers ADC token when available", async () => {
    const getAdcAccessToken = vi.fn().mockResolvedValue("adc-token");
    const getGcloudAccessToken = vi.fn().mockReturnValue("gcloud-token");

    const client = new VertexCliFallbackAuthClient({
      getAdcAccessToken,
      getGcloudAccessToken,
    });

    await expect(client.getAccessToken()).resolves.toEqual({
      token: "adc-token",
    });
    expect(getGcloudAccessToken).not.toHaveBeenCalled();
  });

  it("falls back to gcloud token when ADC is unavailable", async () => {
    const client = new VertexCliFallbackAuthClient({
      getAdcAccessToken: vi.fn().mockResolvedValue(null),
      getGcloudAccessToken: vi.fn().mockReturnValue("gcloud-token"),
    });

    await expect(client.getAccessToken()).resolves.toEqual({
      token: "gcloud-token",
    });

    const headers = await client.getRequestHeaders();
    expect(headers.get("authorization")).toBe("Bearer gcloud-token");
  });

  it("caches the gcloud token until TTL expires", async () => {
    let now = 1_000;
    const getGcloudAccessToken = vi.fn().mockReturnValue("gcloud-token");

    const client = new VertexCliFallbackAuthClient({
      getAdcAccessToken: vi.fn().mockResolvedValue(null),
      getGcloudAccessToken,
      now: () => now,
      gcloudTokenTtlMs: 1_000,
    });

    await client.getAccessToken();

    now += 500;
    await client.getAccessToken();

    now += 600;
    await client.getAccessToken();

    expect(getGcloudAccessToken).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error when no token source is available", async () => {
    const client = new VertexCliFallbackAuthClient({
      getAdcAccessToken: vi.fn().mockResolvedValue(null),
      getGcloudAccessToken: vi.fn().mockReturnValue(undefined),
    });

    await expect(client.getAccessToken()).rejects.toThrow(
      "Google Vertex authentication failed"
    );
  });
});

describe("createVertexGoogleAuthOptions", () => {
  it("returns GoogleAuth options with the fallback auth client", () => {
    const options = createVertexGoogleAuthOptions("project-123");

    expect(options.projectId).toBe("project-123");
    expect(options.authClient).toBeInstanceOf(VertexCliFallbackAuthClient);
  });
});
