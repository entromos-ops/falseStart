import { NextResponse } from "next/server";
import { blobConfigured } from "@/lib/claimdesk/server-sync";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.json(
    { configured: blobConfigured(request) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
