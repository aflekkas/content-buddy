import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export type EncryptedBlob = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
};

function getMasterKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BYOK_ENCRYPTION_KEY env var is required");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `BYOK_ENCRYPTION_KEY must decode to 32 bytes; got ${key.length}`,
    );
  }
  return key;
}

export function encrypt(plaintext: string): EncryptedBlob {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

export function decrypt(blob: EncryptedBlob): string {
  const key = getMasterKey();
  const decipher = createDecipheriv("aes-256-gcm", key, blob.iv);
  decipher.setAuthTag(blob.authTag);
  const plaintext = Buffer.concat([
    decipher.update(blob.ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
