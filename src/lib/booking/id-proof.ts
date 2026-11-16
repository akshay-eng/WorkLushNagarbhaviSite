// Government ID rules shared by the checkout form and the API.
//
// Aadhaar handling follows UIDAI guidance for entities that are not
// authorised to store Aadhaar numbers: the full number is validated, then
// only a masked form (last four digits) and a salted hash are kept. The
// uploaded image is stored privately for front-desk verification.

export const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar card", placeholder: "1234 5678 9012", hint: "12 digits. We keep only the last four." },
  { value: "pan", label: "PAN card", placeholder: "ABCDE1234F", hint: "10 characters: 5 letters, 4 digits, 1 letter." },
  { value: "passport", label: "Passport", placeholder: "N1234567", hint: "1 letter followed by 7 digits." },
  { value: "dl", label: "Driving licence", placeholder: "KA01 20230012345", hint: "State code, RTO code, year and number." },
  { value: "voter", label: "Voter ID", placeholder: "ABC1234567", hint: "3 letters followed by 7 digits." },
] as const;

export type IdType = (typeof ID_TYPES)[number]["value"];

export const ID_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const ID_FILE_MAX_BYTES = 5 * 1024 * 1024;

// Verhoeff checksum, which every valid Aadhaar number satisfies.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const arr = digits.split("").reverse().map(Number);
  for (let i = 0; i < arr.length; i++) c = D[c][P[i % 8][arr[i]]];
  return c === 0;
}

export function normaliseId(type: IdType, raw: string): string {
  const up = raw.toUpperCase().replace(/[\s-]/g, "");
  return type === "aadhaar" ? up.replace(/\D/g, "") : up;
}

export function validateId(type: IdType, raw: string): string | null {
  const v = normaliseId(type, raw);
  switch (type) {
    case "aadhaar":
      if (!/^\d{12}$/.test(v)) return "Aadhaar numbers have 12 digits.";
      if (/^[01]/.test(v)) return "Aadhaar numbers don't start with 0 or 1.";
      if (!verhoeffValid(v)) return "That Aadhaar number doesn't pass the checksum. Check for a typo.";
      return null;
    case "pan":
      return /^[A-Z]{5}\d{4}[A-Z]$/.test(v) ? null : "PAN looks like ABCDE1234F.";
    case "passport":
      return /^[A-Z]\d{7}$/.test(v) ? null : "Indian passport numbers are 1 letter and 7 digits.";
    case "dl":
      return /^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(v) || /^[A-Z]{2}\d{13}$/.test(v)
        ? null
        : "Use the 15-character format, e.g. KA0120230012345.";
    case "voter":
      return /^[A-Z]{3}\d{7}$/.test(v) ? null : "Voter ID (EPIC) is 3 letters and 7 digits.";
  }
}

export function maskId(type: IdType, raw: string): string {
  const v = normaliseId(type, raw);
  const last4 = v.slice(-4);
  if (type === "aadhaar") return `XXXX XXXX ${last4}`;
  return `${"•".repeat(Math.max(0, v.length - 4))}${last4}`;
}

/** Live formatting while typing an Aadhaar number: 1234 5678 9012. */
export function formatAadhaarInput(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}
