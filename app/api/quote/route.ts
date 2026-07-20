import { NextResponse } from "next/server";

export const runtime = "nodejs";
const TO_EMAIL = process.env.QUOTE_TO_EMAIL ?? "partpatch@proton.me";
const FROM_EMAIL = process.env.QUOTE_FROM_EMAIL ?? "PartPatch <onboarding@resend.dev>";
const MAX_TOTAL_PHOTO_BYTES = 4 * 1024 * 1024;

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  const form = await request.formData();
  const name = clean(form.get("name"), 120);
  const contact = clean(form.get("contact"), 200);
  const itemLink = clean(form.get("itemLink"), 1_500);
  const details = clean(form.get("details"), 5_000);
  if (!name || !contact || !details) return NextResponse.json({ error: "Missing required details." }, { status: 400 });
  const photos = form.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const totalPhotoBytes = photos.reduce((total, photo) => total + photo.size, 0);
  if (totalPhotoBytes > MAX_TOTAL_PHOTO_BYTES) return NextResponse.json({ error: "Photos must be 4 MB or less in total." }, { status: 413 });
  const replyTo = contact.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? contact : undefined;
  const payload = { from: FROM_EMAIL, to: [TO_EMAIL], subject: `New PartPatch quote request — ${name}`, ...(replyTo ? { reply_to: replyTo } : {}), html: `<h2>New quote request</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Contact:</strong> ${escapeHtml(contact)}</p><p><strong>Item link:</strong> ${itemLink ? `<a href="${escapeHtml(itemLink)}">${escapeHtml(itemLink)}</a>` : "Not provided"}</p><p><strong>What they need:</strong><br/>${escapeHtml(details).replace(/\n/g, "<br/>")}</p>`, attachments: await Promise.all(photos.map(async (photo) => ({ filename: photo.name, content: Buffer.from(await photo.arrayBuffer()).toString("base64") }))) };
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "User-Agent": "PartPatch quote form" }, body: JSON.stringify(payload) });
  if (!response.ok) { console.error("Quote email failed", response.status, await response.text()); return NextResponse.json({ error: "Email delivery failed." }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}
