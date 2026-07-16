"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { decryptDocument, decryptJson, deriveAuthToken, encryptDocument, encryptJson } from "./crypto";
import { parseState } from "./engine";
import type { ClaimDeskState, LocalSession } from "./types";

export interface CloudStatus {
  configured: boolean;
}

export async function getCloudStatus(): Promise<CloudStatus> {
  try {
    const response = await fetch("/api/sync/status", { cache: "no-store" });
    if (!response.ok) return { configured: false };
    return await response.json() as CloudStatus;
  } catch {
    return { configured: false };
  }
}

export class SyncConflictError extends Error {
  constructor(
    public revision: number,
    public payload: { iv: string; ciphertext: string }
  ) {
    super("The household changed on another device.");
  }
}

async function authorization(rootSecret: string): Promise<string> {
  return `Bearer ${await deriveAuthToken(rootSecret)}`;
}

export async function pullCloudState(session: LocalSession): Promise<{ state: ClaimDeskState; revision: number }> {
  const response = await fetch(`/api/sync/${encodeURIComponent(session.workspaceId)}`, {
    headers: { Authorization: await authorization(session.rootSecret) },
    cache: "no-store"
  });
  if (response.status === 404) throw new Error("That household has not been synced yet.");
  if (!response.ok) throw new Error((await readError(response)) || "Could not load the shared household.");
  const body = await response.json() as { payload: { iv: string; ciphertext: string }; revision: number };
  return { state: parseState(await decryptJson(body.payload, session.rootSecret)), revision: body.revision };
}

export async function pushCloudState(state: ClaimDeskState, session: LocalSession): Promise<number> {
  const payload = await encryptJson(state, session.rootSecret);
  const response = await fetch(`/api/sync/${encodeURIComponent(session.workspaceId)}`, {
    method: "PUT",
    headers: {
      Authorization: await authorization(session.rootSecret),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ payload, baseRevision: session.syncRevision, updatedAt: state.updatedAt })
  });
  if (response.status === 409) {
    const body = await response.json() as { revision: number; payload: { iv: string; ciphertext: string } };
    throw new SyncConflictError(body.revision, body.payload);
  }
  if (!response.ok) throw new Error((await readError(response)) || "Could not save the shared household.");
  const body = await response.json() as { revision: number };
  return body.revision;
}

export async function decryptConflict(error: SyncConflictError, rootSecret: string): Promise<ClaimDeskState> {
  return parseState(await decryptJson(error.payload, rootSecret));
}

export async function uploadCloudDocument(
  file: Blob,
  documentId: string,
  session: LocalSession
): Promise<{ pathname: string; iv: string }> {
  const authToken = await deriveAuthToken(session.rootSecret);
  const { encrypted, iv } = await encryptDocument(file, session.rootSecret);
  const pathname = `workspaces/${session.workspaceId}/documents/${documentId}.bin`;
  const result = await uploadPresigned(pathname, encrypted, {
    access: "private",
    handleUploadUrl: "/api/documents/upload",
    clientPayload: JSON.stringify({
      workspaceId: session.workspaceId,
      authToken,
      documentId
    })
  });
  return { pathname: result.pathname, iv };
}

export async function downloadCloudDocument(
  pathname: string,
  iv: string,
  mimeType: string,
  session: LocalSession
): Promise<Blob> {
  const search = new URLSearchParams({ workspaceId: session.workspaceId, pathname });
  const response = await fetch(`/api/documents?${search.toString()}`, {
    headers: { Authorization: await authorization(session.rootSecret) },
    cache: "no-store"
  });
  if (!response.ok) throw new Error((await readError(response)) || "Could not download that document.");
  return decryptDocument(await response.blob(), session.rootSecret, iv, mimeType);
}

export async function deleteCloudDocument(pathname: string, session: LocalSession): Promise<void> {
  const response = await fetch("/api/documents", {
    method: "DELETE",
    headers: {
      Authorization: await authorization(session.rootSecret),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ workspaceId: session.workspaceId, pathname })
  });
  if (!response.ok) throw new Error((await readError(response)) || "Could not delete that cloud document.");
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? "";
  } catch {
    return "";
  }
}
