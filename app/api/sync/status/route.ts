import { NextResponse } from "next/server";
import { blobConfigured } from "@/lib/claimdesk/server-sync";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { configured: blobConfigured() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
