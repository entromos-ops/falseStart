import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  authTokenFromRequest,
  blobConfigured,
  hashAuthToken,
  readWorkspaceEnvelope,
  validateWorkspaceId,
  verifyAuthToken,
  workspacePath,
  type WorkspaceEnvelope
} from "@/lib/claimdesk/server-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}
function errorResponse(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The shared household request failed." },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: Request, context: RouteContext) {
  if (!blobConfigured(request)) return errorResponse(new Error("Private household storage is not connected yet."), 503);
  try {
    const { workspaceId: rawId } = await context.params;
    const workspaceId = validateWorkspaceId(rawId);
    const envelope = await readWorkspaceEnvelope(workspaceId);
    if (!envelope) return errorResponse(new Error("Household not found."), 404);
    if (!verifyAuthToken(envelope, authTokenFromRequest(request))) return errorResponse(new Error("Household access was denied."), 401);
    return NextResponse.json(
      { payload: envelope.payload, revision: envelope.revision, updatedAt: envelope.updatedAt },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error, 400);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  if (!blobConfigured(request)) return errorResponse(new Error("Private household storage is not connected yet."), 503);
  try {
    const { workspaceId: rawId } = await context.params;
    const workspaceId = validateWorkspaceId(rawId);
    const authToken = authTokenFromRequest(request);
    const rawText = await request.text();
    if (rawText.length > 2_000_000) throw new Error("The household index is too large to sync.");
    const body = JSON.parse(rawText) as {
      payload?: { iv?: string; ciphertext?: string };
      baseRevision?: number;
      updatedAt?: string;
    };
    if (!body.payload || typeof body.payload.iv !== "string" || typeof body.payload.ciphertext !== "string") {
      throw new Error("The encrypted household payload is incomplete.");
    }
    if (!Number.isInteger(body.baseRevision) || (body.baseRevision ?? 0) < 0) throw new Error("Invalid household revision.");

    const current = await readWorkspaceEnvelope(workspaceId);
    if (current && !verifyAuthToken(current, authToken)) return errorResponse(new Error("Household access was denied."), 401);
    if (current && current.revision !== body.baseRevision) {
      return NextResponse.json(
        { revision: current.revision, payload: current.payload, updatedAt: current.updatedAt },
        { status: 409, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    if (!current && body.baseRevision !== 0) return errorResponse(new Error("Household not found."), 404);

    const envelope: WorkspaceEnvelope = {
      schemaVersion: 1,
      authHash: current?.authHash ?? hashAuthToken(authToken),
      revision: (current?.revision ?? 0) + 1,
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
      payload: { iv: body.payload.iv, ciphertext: body.payload.ciphertext }
    };
    await put(workspacePath(workspaceId), JSON.stringify(envelope), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
    return NextResponse.json(
      { revision: envelope.revision, updatedAt: envelope.updatedAt },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error, 400);
  }
}
