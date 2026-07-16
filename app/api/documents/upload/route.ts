import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  blobConfigured,
  readWorkspaceEnvelope,
  validateDocumentPath,
  validateWorkspaceId,
  verifyAuthToken
} from "@/lib/claimdesk/server-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!blobConfigured(request)) return NextResponse.json({ error: "Private document storage is not connected yet." }, { status: 503 });
  const body = await request.json() as HandleUploadPresignedBody;
  try {
    const response = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
        if (!clientPayload) throw new Error("Household upload authorization is missing.");
        const parsed = JSON.parse(clientPayload) as {
          workspaceId?: string;
          authToken?: string;
          documentId?: string;
        };
        const workspaceId = validateWorkspaceId(parsed.workspaceId ?? "");
        validateDocumentPath(workspaceId, pathname);
        const envelope = await readWorkspaceEnvelope(workspaceId);
        if (!envelope || !parsed.authToken || !verifyAuthToken(envelope, parsed.authToken)) throw new Error("Household access was denied.");
        if (!parsed.documentId || !pathname.endsWith(`/${parsed.documentId}.bin`)) throw new Error("Invalid document upload.");
        // Web Crypto appends a 16-byte AES-GCM authentication tag to the encrypted file.
        const maximumSizeInBytes = 50 * 1024 * 1024 + 16;
        const validUntil = Date.now() + 60 * 60 * 1000;
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ["application/octet-stream"],
            maximumSizeInBytes,
            validUntil
          }),
          urlOptions: {
            allowedContentTypes: ["application/octet-stream"],
            maximumSizeInBytes,
            validUntil,
            addRandomSuffix: false,
            allowOverwrite: false
          }
        };
      }
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document upload failed." },
      { status: 400 }
    );
  }
}
