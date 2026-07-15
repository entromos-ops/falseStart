import { describe, expect, it } from "vitest";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  createWorkspaceCredentials,
  decryptDocument,
  decryptJson,
  deriveAuthToken,
  encryptDocument,
  encryptJson,
  parseShareCode
} from "@/lib/claimdesk/crypto";
import { createExampleWorkspace } from "@/lib/claimdesk/engine";
import {
  base64ToBlob,
  createPortableBackup,
  fileToBase64,
  parsePortableBackup
} from "@/lib/claimdesk/repository";
import { validateDocumentPath } from "@/lib/claimdesk/server-sync";

const WORKSPACE_ID = "abcdefghijklmnopqrstuv";

describe("household sharing cryptography", () => {
  it("round-trips arbitrary bytes through URL-safe base64", () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    const encoded = bytesToBase64Url(bytes);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Array.from(base64UrlToBytes(encoded))).toEqual(Array.from(bytes));
  });

  it("creates a share code that parses back to the same credentials", () => {
    const credentials = createWorkspaceCredentials();
    expect(credentials.workspaceId).toMatch(/^[A-Za-z0-9_-]{20,30}$/);
    expect(credentials.rootSecret).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
    expect(parseShareCode(`  ${credentials.shareCode}  `)).toEqual({
      workspaceId: credentials.workspaceId,
      rootSecret: credentials.rootSecret
    });
    expect(() => parseShareCode("PCD1-not-a-real-code")).toThrow("not valid");
  });

  it("derives the same non-secret authentication token deterministically", async () => {
    const { rootSecret } = createWorkspaceCredentials();
    const first = await deriveAuthToken(rootSecret);
    const second = await deriveAuthToken(rootSecret);
    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
    expect(first).not.toBe(rootSecret);
  });

  it("encrypts and decrypts household JSON, rejecting the wrong secret", async () => {
    const first = createWorkspaceCredentials();
    const second = createWorkspaceCredentials();
    const source = { pet: "Bailey", amountCents: 84_236, privateNote: "follow-up labs" };
    const encrypted = await encryptJson(source, first.rootSecret);

    expect(encrypted.ciphertext).not.toContain("Bailey");
    expect(await decryptJson(encrypted, first.rootSecret)).toEqual(source);
    await expect(decryptJson(encrypted, second.rootSecret)).rejects.toThrow();
  });

  it("round-trips an encrypted document without changing bytes or MIME type", async () => {
    const { rootSecret } = createWorkspaceCredentials();
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 1, 2, 3, 255]);
    const source = new Blob([bytes], { type: "application/pdf" });
    const { encrypted, iv } = await encryptDocument(source, rootSecret);

    expect(encrypted.type).toBe("application/octet-stream");
    expect(new Uint8Array(await encrypted.arrayBuffer())).not.toEqual(bytes);

    const restored = await decryptDocument(encrypted, rootSecret, iv, source.type);
    expect(restored.type).toBe("application/pdf");
    expect(Array.from(new Uint8Array(await restored.arrayBuffer()))).toEqual(Array.from(bytes));
  });
});

describe("portable backups", () => {
  it("round-trips a document blob through ordinary base64", async () => {
    const source = new Blob([new Uint8Array([0, 10, 20, 30, 255])], { type: "application/octet-stream" });
    const encoded = await fileToBase64(source);
    const restored = base64ToBlob(encoded, source.type);

    expect(restored.type).toBe(source.type);
    expect(Array.from(new Uint8Array(await restored.arrayBuffer()))).toEqual([0, 10, 20, 30, 255]);
  });

  it("exports only available originals and parses the portable backup", async () => {
    const state = createExampleWorkspace(WORKSPACE_ID).state;
    const availableId = state.documents[0].id;
    const backup = await createPortableBackup(state, async (documentId) =>
      documentId === availableId ? new Blob(["invoice"], { type: "application/pdf" }) : null
    );

    expect(backup).toMatchObject({
      format: "pet-claim-desk-backup",
      version: 1,
      state
    });
    expect(backup.documents).toHaveLength(1);
    expect(backup.documents[0]).toMatchObject({ documentId: availableId, mimeType: "application/pdf" });
    expect(parsePortableBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it("rejects unsupported and incomplete backup envelopes", () => {
    expect(() => parsePortableBackup(JSON.stringify({ format: "hearthfolio-backup", version: 1 }))).toThrow(
      "not a supported Pet Claim Desk backup"
    );
    expect(() => parsePortableBackup(JSON.stringify({
      format: "pet-claim-desk-backup",
      version: 2,
      state: createExampleWorkspace(WORKSPACE_ID).state,
      documents: []
    }))).toThrow("not a supported Pet Claim Desk backup");
    expect(() => parsePortableBackup("not JSON")).toThrow();
  });
});

describe("private document paths", () => {
  it("accepts only one encrypted document key inside the authorized workspace", () => {
    const valid = `workspaces/${WORKSPACE_ID}/documents/document_1234-5678.bin`;
    expect(validateDocumentPath(WORKSPACE_ID, valid)).toBe(valid);
    expect(() => validateDocumentPath(WORKSPACE_ID, `workspaces/${WORKSPACE_ID}/documents/../state.json`)).toThrow("Invalid document path");
    expect(() => validateDocumentPath(WORKSPACE_ID, "workspaces/anotherworkspace123456/documents/document_1.bin")).toThrow("Invalid document path");
  });
});
