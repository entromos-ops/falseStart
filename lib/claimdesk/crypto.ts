const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function randomToken(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function createWorkspaceCredentials(): { workspaceId: string; rootSecret: string; shareCode: string } {
  const workspaceId = randomToken(16);
  const rootSecret = randomToken(32);
  return { workspaceId, rootSecret, shareCode: formatShareCode(workspaceId, rootSecret) };
}

export function formatShareCode(workspaceId: string, rootSecret: string): string {
  return `PCD1-${workspaceId}.${rootSecret}`;
}

export function parseShareCode(value: string): { workspaceId: string; rootSecret: string } {
  const normalized = value.trim().replace(/\s+/g, "");
  const match = /^PCD1-([A-Za-z0-9_-]{20,30})\.([A-Za-z0-9_-]{40,50})$/.exec(normalized);
  if (!match) throw new Error("That household code is not valid.");
  return { workspaceId: match[1], rootSecret: match[2] };
}

async function digest(label: string, rootSecret: string): Promise<Uint8Array> {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${label}:${rootSecret}`));
  return new Uint8Array(buffer);
}

export async function deriveAuthToken(rootSecret: string): Promise<string> {
  return bytesToBase64Url(await digest("pet-claim-desk-auth-v1", rootSecret));
}

export async function deriveEncryptionKey(rootSecret: string): Promise<CryptoKey> {
  const bytes = await digest("pet-claim-desk-encryption-v1", rootSecret);
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export async function encryptJson(value: unknown, rootSecret: string): Promise<EncryptedPayload> {
  const key = await deriveEncryptionKey(rootSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: bytesToBase64Url(iv), ciphertext: bytesToBase64Url(new Uint8Array(encrypted)) };
}

export async function decryptJson<T>(payload: EncryptedPayload, rootSecret: string): Promise<T> {
  const key = await deriveEncryptionKey(rootSecret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(payload.iv) },
    key,
    base64UrlToBytes(payload.ciphertext)
  );
  return JSON.parse(decoder.decode(decrypted)) as T;
}

export async function encryptDocument(blob: Blob, rootSecret: string): Promise<{ encrypted: Blob; iv: string }> {
  const key = await deriveEncryptionKey(rootSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { encrypted: new Blob([ciphertext], { type: "application/octet-stream" }), iv: bytesToBase64Url(iv) };
}

export async function decryptDocument(blob: Blob, rootSecret: string, iv: string, mimeType: string): Promise<Blob> {
  const key = await deriveEncryptionKey(rootSecret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(iv) },
    key,
    await blob.arrayBuffer()
  );
  return new Blob([decrypted], { type: mimeType || "application/octet-stream" });
}
