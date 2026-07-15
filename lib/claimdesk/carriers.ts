import type { DocumentKind } from "./types";

export interface CarrierProfile {
  key: string;
  name: string;
  filingWindowDays: number;
  appealWindowDays: number;
  portalUrl: string;
  firstClaimHistory: boolean;
  proofOfPayment: boolean;
  claimForm: boolean;
  guidance: string;
  sourceUrl: string;
}

export const CARRIER_PROFILES: CarrierProfile[] = [
  {
    key: "fetch",
    name: "Fetch",
    filingWindowDays: 90,
    appealWindowDays: 90,
    portalUrl: "https://www.fetchpet.com/claims/app",
    firstClaimHistory: true,
    proofOfPayment: true,
    claimForm: false,
    guidance: "A finalized paid invoice and detailed medical records are commonly requested.",
    sourceUrl: "https://www.fetchpet.com/claims/app"
  },
  {
    key: "pets-best",
    name: "Pets Best",
    filingWindowDays: 180,
    appealWindowDays: 90,
    portalUrl: "https://www.petsbest.com/claims",
    firstClaimHistory: true,
    proofOfPayment: true,
    claimForm: false,
    guidance: "Early accident and illness claims may trigger a complete medical-history review.",
    sourceUrl: "https://www.petsbest.com/claims"
  },
  {
    key: "embrace",
    name: "Embrace",
    filingWindowDays: 60,
    appealWindowDays: 60,
    portalUrl: "https://www.embracepetinsurance.com/claims",
    firstClaimHistory: true,
    proofOfPayment: false,
    claimForm: false,
    guidance: "Every page of the itemized invoice and the diagnosis or reason for visit should be included.",
    sourceUrl: "https://www.embracepetinsurance.com/claims"
  },
  {
    key: "healthy-paws",
    name: "Healthy Paws",
    filingWindowDays: 90,
    appealWindowDays: 90,
    portalUrl: "https://www.healthypawspetinsurance.com/pet-insurance-claims.html",
    firstClaimHistory: true,
    proofOfPayment: false,
    claimForm: false,
    guidance: "Complete records are typically needed for the first claim.",
    sourceUrl: "https://www.healthypawspetinsurance.com/pet-insurance-claims.html"
  },
  {
    key: "metlife",
    name: "MetLife",
    filingWindowDays: 90,
    appealWindowDays: 90,
    portalUrl: "https://www.metlifepetinsurance.com/claims/",
    firstClaimHistory: true,
    proofOfPayment: false,
    claimForm: true,
    guidance: "Appeals generally require a written explanation and supporting information.",
    sourceUrl: "https://www.metlifepetinsurance.com/claims/"
  },
  {
    key: "spot",
    name: "Spot",
    filingWindowDays: 270,
    appealWindowDays: 180,
    portalUrl: "https://spotpet.com/submitting-a-claim",
    firstClaimHistory: false,
    proofOfPayment: false,
    claimForm: true,
    guidance: "Medical records may be requested even when they are not required with the initial submission.",
    sourceUrl: "https://spotpet.com/submitting-a-claim"
  },
  {
    key: "lemonade",
    name: "Lemonade",
    filingWindowDays: 180,
    appealWindowDays: 90,
    portalUrl: "https://www.lemonade.com/pet/explained/how-to-file-a-pet-insurance-claim/",
    firstClaimHistory: true,
    proofOfPayment: true,
    claimForm: false,
    guidance: "Lemonade uses an app-only claim flow and may require a claimant video.",
    sourceUrl: "https://www.lemonade.com/pet/explained/how-to-file-a-pet-insurance-claim/"
  },
  {
    key: "trupanion",
    name: "Trupanion",
    filingWindowDays: 365,
    appealWindowDays: 90,
    portalUrl: "https://www.trupanion.com/claims",
    firstClaimHistory: false,
    proofOfPayment: false,
    claimForm: true,
    guidance: "Participating clinics may support direct pay; other claims use the member workflow.",
    sourceUrl: "https://www.trupanion.com/claims"
  },
  {
    key: "aspca",
    name: "ASPCA Pet Health Insurance",
    filingWindowDays: 270,
    appealWindowDays: 90,
    portalUrl: "https://www.aspcapetinsurance.com/customer-community/how-to-file-a-claim/",
    firstClaimHistory: false,
    proofOfPayment: false,
    claimForm: true,
    guidance: "Itemized invoices, treatment descriptions, and related notes help avoid follow-up requests.",
    sourceUrl: "https://www.aspcapetinsurance.com/customer-community/how-to-file-a-claim/"
  },
  {
    key: "nationwide",
    name: "Nationwide",
    filingWindowDays: 90,
    appealWindowDays: 90,
    portalUrl: "https://www.petinsurance.com/claims/",
    firstClaimHistory: false,
    proofOfPayment: false,
    claimForm: true,
    guidance: "Include an actual diagnosis where available and records for complex or unclear visits.",
    sourceUrl: "https://www.petinsurance.com/claims/"
  },
  {
    key: "other",
    name: "Other insurer",
    filingWindowDays: 90,
    appealWindowDays: 90,
    portalUrl: "",
    firstClaimHistory: false,
    proofOfPayment: true,
    claimForm: false,
    guidance: "This is a general checklist. Confirm the exact requirements and deadlines in your policy.",
    sourceUrl: ""
  }
];

export function carrierProfile(key: string): CarrierProfile {
  return CARRIER_PROFILES.find((profile) => profile.key === key) ?? CARRIER_PROFILES.at(-1)!;
}

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  invoice: "Finalized itemized invoice",
  receipt: "Proof of payment",
  "soap-notes": "SOAP / exam notes",
  "medical-history": "Medical history",
  "lab-result": "Laboratory report",
  imaging: "Imaging report",
  "discharge-notes": "Discharge instructions",
  policy: "Policy document",
  "claim-form": "Carrier claim form",
  "submission-confirmation": "Submission confirmation",
  "information-request": "Information request",
  eob: "Explanation of benefits",
  denial: "Denial letter",
  appeal: "Appeal document",
  correspondence: "Correspondence",
  other: "Other document"
};
