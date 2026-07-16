import { del, get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import {
  authTokenFromRequest,
  authorizeWorkspace,
  blobConfigured,
  validateDocumentPath,
  validateWorkspaceId
} from "@/lib/claimdesk/server-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!blobConfigured(request)) return NextResponse.json({ error: "Private document storage is not connected yet." }, { status: 503 });
  try {
    const workspaceId = validateWorkspaceId(request.nextUrl.searchParams.get("workspaceId") ?? "");
    const pathname = validateDocumentPath(workspaceId, request.nextUrl.searchParams.get("pathname") ?? "");
    await authorizeWorkspace(request, workspaceId);
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document download failed." }, { status: 400 });
  }
}
export async function DELETE(request: Request) {
  if (!blobConfigured(request)) return NextResponse.json({ error: "Private document storage is not connected yet." }, { status: 503 });
  try {
    const body = await request.json() as { workspaceId?: string; pathname?: string };
    const workspaceId = validateWorkspaceId(body.workspaceId ?? "");
    const pathname = validateDocumentPath(workspaceId, body.pathname ?? "");
    const authToken = authTokenFromRequest(request);
    const authRequest = new Request(request.url, { headers: { Authorization: `Bearer ${authToken}` } });
    await authorizeWorkspace(authRequest, workspaceId);
    await del(pathname);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document deletion failed." }, { status: 400 });
  }
}
