import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blobConfigured } from "@/lib/claimdesk/server-sync";

const credentialKeys = ["BLOB_READ_WRITE_TOKEN", "BLOB_STORE_ID", "VERCEL_OIDC_TOKEN"] as const;
const originalCredentials = new Map(credentialKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of credentialKeys) delete process.env[key];
});

afterEach(() => {
  for (const key of credentialKeys) {
    const original = originalCredentials.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe("Blob credential detection", () => {
  it("accepts a legacy read-write token", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "legacy-token";
    expect(blobConfigured()).toBe(true);
  });

  it("accepts an OIDC token delivered on the runtime request", () => {
    process.env.BLOB_STORE_ID = "store_example";
    const request = new Request("https://example.test/api/sync/status", {
      headers: { "x-vercel-oidc-token": "short-lived-token" }
    });
    expect(blobConfigured(request)).toBe(true);
  });

  it("accepts an OIDC token exposed during build or local development", () => {
    process.env.BLOB_STORE_ID = "store_example";
    process.env.VERCEL_OIDC_TOKEN = "local-token";
    expect(blobConfigured()).toBe(true);
  });

  it("requires both the store id and an OIDC token", () => {
    process.env.BLOB_STORE_ID = "store_example";
    expect(blobConfigured()).toBe(false);

    delete process.env.BLOB_STORE_ID;
    const request = new Request("https://example.test/api/sync/status", {
      headers: { "x-vercel-oidc-token": "short-lived-token" }
    });
    expect(blobConfigured(request)).toBe(false);
  });

  it("rejects blank credentials and does not replace a blank runtime token with a build token", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "   ";
    process.env.BLOB_STORE_ID = "store_example";
    process.env.VERCEL_OIDC_TOKEN = "build-token";
    const request = new Request("https://example.test/api/sync/status", {
      headers: { "x-vercel-oidc-token": "   " }
    });
    expect(blobConfigured(request)).toBe(false);
  });
});
