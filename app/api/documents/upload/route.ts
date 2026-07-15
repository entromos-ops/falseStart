import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
  if (!blobConfigured()) return NextResponse.json({ error: "Private document storage is not connected yet." }, { status: 503 });
  const body = await request.json() as HandleUploadBody;
  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
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
        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ workspaceId, documentId: parsed.documentId })
        };
      },
      onUploadCompleted: async () => {
        // Metadata is committed by the encrypted household sync after the client receives the blob path.
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
