import crypto from "crypto";
import Token from "../models/Token.js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0/I/1

export function randomCode(prefix = "INV", groups = 4, len = 4) {
  const bytes = crypto.randomBytes(groups * len);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  const parts = [];
  for (let i = 0; i < groups; i++)
    parts.push(chars.slice(i * len, (i + 1) * len).join(""));
  return `${prefix}-${parts.join("-")}`;
}

export function hashToken(plain) {
  const pepper = process.env.TOKEN_PEPPER || "pepper";
  return crypto.createHash("sha256").update(`${pepper}:${plain}`).digest("hex");
}

export const TYPE_TO_ROLE = {
  FAMILY_TOKEN: "Family",
  MANAGER_TOKEN: "Admin",
  STAFF_TOKEN: "GeneralCareStaff",
};

/**
 * Verify a human token string:
 * - hash it
 * - find Token by tokenHash
 * - ensure not revoked, not expired, uses < maxUses
 * Returns the Token mongoose doc (not lean) if valid; otherwise null.
 */
export async function verifyTokenString(plainToken) {
  if (!plainToken || typeof plainToken !== "string") return null;
  const tokenHash = hashToken(plainToken.trim());
  const doc = await Token.findOne({ tokenHash });
  if (!doc) return null;

  const now = new Date();
  if (doc.revoked) return null;
  if (doc.expiresAt && doc.expiresAt < now) return null;
  if (
    typeof doc.maxUses === "number" &&
    typeof doc.uses === "number" &&
    doc.uses >= doc.maxUses
  )
    return null;

  if (!doc.personIds || doc.personIds.length === 0) return null;

  return doc; // live doc so caller can increment uses later
}
