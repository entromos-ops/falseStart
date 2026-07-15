import { parseState, SESSION_STORAGE_KEY, STATE_STORAGE_KEY } from "./engine";
import type { ClaimDeskState, LocalSession, PortableBackup, PortableDocument } from "./types";

const DB_NAME = "pet-claim-desk";
const DB_VERSION = 1;
const DOCUMENT_STORE = "documents";

export function loadLocalState(): ClaimDeskState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalState(state: ClaimDeskState): void {
  window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState(): void {
  window.localStorage.removeItem(STATE_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function loadSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalSession;
    if (parsed.schemaVersion !== 1 || !parsed.workspaceId || !parsed.rootSecret || !parsed.memberId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: LocalSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) database.createObjectStore(DOCUMENT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local document storage."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, mode);
    const request = action(transaction.objectStore(DOCUMENT_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local document storage failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local document storage failed."));
  });
}

export async function putLocalDocument(id: string, blob: Blob): Promise<void> {
  await withStore("readwrite", (store) => store.put(blob, id));
}

export async function getLocalDocument(id: string): Promise<Blob | null> {
  const result = await withStore<Blob | undefined>("readonly", (store) => store.get(id));
  return result ?? null;
}

export async function deleteLocalDocument(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearLocalDocuments(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}

export async function fileToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }
  return btoa(chunks.join(""));
}

export function base64ToBlob(value: string, mimeType: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export async function createPortableBackup(
  state: ClaimDeskState,
  readDocument: (documentId: string) => Promise<Blob | null>
): Promise<PortableBackup> {
  const documents: PortableDocument[] = [];
  const omittedDocumentIds: string[] = [];
  for (const record of state.documents) {
    const blob = await readDocument(record.id);
    if (!blob) {
      omittedDocumentIds.push(record.id);
      continue;
    }
    documents.push({
      documentId: record.id,
      mimeType: record.mimeType,
      base64: await fileToBase64(blob)
    });
  }
  return {
    format: "pet-claim-desk-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
    documents,
    omittedDocumentIds
  };
}

export function parsePortableBackup(text: string): PortableBackup {
  if (text.length > 160 * 1024 * 1024) throw new Error("That backup is too large to restore in the browser.");
  const parsed = JSON.parse(text) as Partial<PortableBackup>;
  if (parsed.format !== "pet-claim-desk-backup" || parsed.version !== 1 || !parsed.state || !Array.isArray(parsed.documents)) {
    throw new Error("That is not a supported Pet Claim Desk backup.");
  }
  return {
    ...parsed,
    state: parseState(parsed.state),
    omittedDocumentIds: Array.isArray(parsed.omittedDocumentIds) ? parsed.omittedDocumentIds : []
  } as PortableBackup;
}

export async function restorePortableDocuments(backup: PortableBackup): Promise<ClaimDeskState> {
  const available = new Set(backup.documents.map((document) => document.documentId));
  for (const document of backup.documents) {
    await putLocalDocument(document.documentId, base64ToBlob(document.base64, document.mimeType));
  }
  return {
    ...backup.state,
    documents: backup.state.documents.map((record) => ({
      ...record,
      storage: "local" as const,
      localBlobId: available.has(record.id) ? record.id : record.localBlobId,
      blobPathname: undefined,
      encryptionIv: undefined
    }))
  };
}
