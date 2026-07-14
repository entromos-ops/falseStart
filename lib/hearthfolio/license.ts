import type { LicenseEntitlement } from "./types";

export const LICENSE_STORAGE_KEY = "hearthfolio:license:v1";
const API_ROOT = "https://api.lemonsqueezy.com/v1/licenses";
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const LICENSE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

type LicenseMeta = { store_id: number; product_id: number; variant_id: number };
type LicensePayload = {
  activated?: boolean;
  valid?: boolean;
  deactivated?: boolean;
  error?: string | null;
  license_key?: { status: "inactive" | "active" | "expired" | "disabled" };
  instance?: { id: string; name: string } | null;
  meta?: LicenseMeta;
};
type LicenseConfig = { storeId: number; productId: number; variantId: number };

function configFromEnv(): LicenseConfig | null {
  const storeId = Number(process.env.NEXT_PUBLIC_LEMON_STORE_ID);
  const productId = Number(process.env.NEXT_PUBLIC_LEMON_PRODUCT_ID);
  const variantId = Number(process.env.NEXT_PUBLIC_LEMON_VARIANT_ID);
  return storeId > 0 && productId > 0 && variantId > 0
    ? { storeId, productId, variantId }
    : null;
}

export function licenseSalesConfigured(): boolean {
  return Boolean(configFromEnv() && process.env.NEXT_PUBLIC_CHECKOUT_URL);
}

export function checkoutUrl(): string | null {
  return process.env.NEXT_PUBLIC_CHECKOUT_URL || null;
}

function matchesProduct(payload: LicensePayload, config: LicenseConfig): boolean {
  return Boolean(
    payload.meta &&
      payload.meta.store_id === config.storeId &&
      payload.meta.product_id === config.productId &&
      payload.meta.variant_id === config.variantId
  );
}

async function postLicense(
  path: "activate" | "validate" | "deactivate",
  fields: Record<string, string>
): Promise<LicensePayload> {
  const response = await fetch(`${API_ROOT}/${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(fields)
  });
  const payload = (await response.json()) as LicensePayload;
  if (response.status === 429 || response.status >= 500) {
    throw new Error("The license service is temporarily unavailable.");
  }
  if (!response.ok && !payload.error) throw new Error("The license service could not be reached.");
  return payload;
}

export async function activateLicense(key: string, instanceName: string): Promise<LicenseEntitlement> {
  const config = configFromEnv();
  if (!config) throw new Error("License activation has not been configured yet.");
  const payload = await postLicense("activate", {
    license_key: key.trim(),
    instance_name: instanceName
  });
  if (!payload.activated || payload.license_key?.status !== "active" || !payload.instance?.id) {
    throw new Error(payload.error || "That license could not be activated.");
  }
  if (!matchesProduct(payload, config)) {
    await postLicense("deactivate", {
      license_key: key.trim(),
      instance_id: payload.instance.id
    }).catch(() => undefined);
    throw new Error("That key belongs to a different product.");
  }
  return {
    key: key.trim(),
    instanceId: payload.instance.id,
    instanceName,
    lastValidatedAt: new Date().toISOString(),
    productId: config.productId,
    variantId: config.variantId,
    storeId: config.storeId
  };
}

export function parseEntitlement(value: unknown): LicenseEntitlement | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<LicenseEntitlement>;
  return typeof item.key === "string" &&
    typeof item.instanceId === "string" &&
    typeof item.instanceName === "string" &&
    typeof item.lastValidatedAt === "string" &&
    typeof item.productId === "number" &&
    typeof item.variantId === "number" &&
    typeof item.storeId === "number"
    ? (item as LicenseEntitlement)
    : null;
}

export function entitlementWithinGrace(entitlement: LicenseEntitlement, now = Date.now()): boolean {
  const validatedAt = Date.parse(entitlement.lastValidatedAt);
  return Number.isFinite(validatedAt) && now - validatedAt <= LICENSE_GRACE_MS;
}

export async function validateLicense(
  entitlement: LicenseEntitlement,
  force = false
): Promise<LicenseEntitlement | null> {
  const config = configFromEnv();
  if (!config) return null;
  const elapsed = Date.now() - Date.parse(entitlement.lastValidatedAt);
  if (!force && elapsed < VALIDATION_INTERVAL_MS) return entitlement;
  try {
    const payload = await postLicense("validate", {
      license_key: entitlement.key,
      instance_id: entitlement.instanceId
    });
    const valid =
      payload.valid === true &&
      payload.license_key?.status === "active" &&
      payload.instance?.id === entitlement.instanceId &&
      matchesProduct(payload, config);
    return valid ? { ...entitlement, lastValidatedAt: new Date().toISOString() } : null;
  } catch {
    return entitlementWithinGrace(entitlement) ? entitlement : null;
  }
}

export async function deactivateLicense(entitlement: LicenseEntitlement): Promise<void> {
  const payload = await postLicense("deactivate", {
    license_key: entitlement.key,
    instance_id: entitlement.instanceId
  });
  if (!payload.deactivated) throw new Error(payload.error || "This device could not be deactivated.");
}
