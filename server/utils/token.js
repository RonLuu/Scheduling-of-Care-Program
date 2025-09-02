import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0/I/1
export function randomCode(prefix = "INV", groups = 4, len = 4) {
  const bytes = crypto.randomBytes(groups * len);
  const chars = [...bytes].map(b => ALPHABET[b % ALPHABET.length]);
  const parts = [];
  for (let i = 0; i < groups; i++) parts.push(chars.slice(i * len, (i + 1) * len).join(""));
  return `${prefix}-${parts.join("-")}`;
}
export function hashToken(plain) {
  const pepper = process.env.TOKEN_PEPPER || "pepper";
  return crypto.createHash("sha256").update(`${pepper}:${plain}`).digest("hex");
}
export const TYPE_TO_ROLE = {
  FAMILY_TOKEN: "Family",
  MANAGER_TOKEN: "Admin",
  STAFF_INVITE: "GeneralCareStaff"
};