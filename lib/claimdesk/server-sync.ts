import { createHash, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";

export interface WorkspaceEnvelope {
  schemaVersion: 1;
  authHash: string;
  revision: number;
  updatedAt: string;
  payload: {
    iv: string;
    ciphertext: string;
  };
}

export function blobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export function validateWorkspaceId(value: string): string {
  if (!/^[A-Za-z0-9_-]{20,30}$/.test(value)) throw new Error("Invalid household id.");
  return value;
}

export function workspacePath(workspaceId: string): string {
  return `workspaces/${validateWorkspaceId(workspaceId)}/state.json`;
}

export function authTokenFromRequest(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{40,60})$/.exec(header);
  if (!match) throw new Error("Household authorization is required.");
  return match[1];
}

export function hashAuthToken(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function verifyAuthToken(envelope: WorkspaceEnvelope, token: string): boolean {
  const expected = Buffer.from(envelope.authHash);
  const actual = Buffer.from(hashAuthToken(token));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function readWorkspaceEnvelope(workspaceId: string): Promise<WorkspaceEnvelope | null> {
  const result = await get(workspacePath(workspaceId), { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  const parsed = JSON.parse(text) as WorkspaceEnvelope;
  if (parsed.schemaVersion !== 1 || typeof parsed.authHash !== "string" || typeof parsed.revision !== "number") {
    throw new Error("The shared household record is invalid.");
  }
  return parsed;
}

export async function authorizeWorkspace(request: Request, workspaceId: string): Promise<WorkspaceEnvelope> {
  const envelope = await readWorkspaceEnvelope(workspaceId);
  if (!envelope) throw new Error("Household not found.");
  if (!verifyAuthToken(envelope, authTokenFromRequest(request))) throw new Error("Household access was denied.");
  return envelope;
}

export function validateDocumentPath(workspaceId: string, pathname: string): string {
  const prefix = `workspaces/${validateWorkspaceId(workspaceId)}/documents/`;
  const documentName = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  if (!/^[A-Za-z0-9_-]+\.bin$/.test(documentName)) throw new Error("Invalid document path.");
  return pathname;
}
