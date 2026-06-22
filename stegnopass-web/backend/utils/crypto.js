const crypto = require("crypto");

const SALT_SIZE = 16;
const KEY_SIZE = 32;
const ITERATIONS = 100000;
const MAGIC = Buffer.from("SPVT", "utf8");

function deriveKey(passphrase, salt) {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_SIZE, "sha1");
}

function encryptVault(vault, passphrase) {
  const plaintext = Buffer.from(JSON.stringify(vault), "utf8");
  const salt = crypto.randomBytes(SALT_SIZE);
  const key = deriveKey(passphrase, salt);
  const nonce = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([MAGIC, salt, nonce, ct, tag]);
  return payload.toString("base64");
}

function decryptVault(payloadB64, passphrase) {
  const raw = Buffer.from(payloadB64, "base64");
  if (raw.subarray(0, 4).compare(MAGIC) !== 0) {
    throw new Error("Not a StegnoPass image (wrong magic bytes).");
  }
  const body = raw.subarray(4);
  const salt = body.subarray(0, SALT_SIZE);
  const nonce = body.subarray(SALT_SIZE, SALT_SIZE + 16);
  const tag = body.subarray(-16);
  const ct = body.subarray(SALT_SIZE + 16, -16);
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}

module.exports = { encryptVault, decryptVault };
