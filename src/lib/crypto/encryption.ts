import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function key() {
  return createHash("sha256").update(env.encryptionKey()).digest();
}

export function encryptText(plainText: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptText(cipherText: string) {
  const [ivRaw, tagRaw, encryptedRaw] = cipherText.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted value.");
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
