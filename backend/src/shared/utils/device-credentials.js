import crypto from "node:crypto";

const DEVICE_CREDENTIAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEVICE_CREDENTIAL_BLOCKS = 9;
const DEVICE_CREDENTIAL_BLOCK_SIZE = 7;

function randomIndex(max) {
  return crypto.randomInt(0, max);
}

export function generateDeviceCredential() {
  const parts = [];

  for (let block = 0; block < DEVICE_CREDENTIAL_BLOCKS; block += 1) {
    let segment = "";

    for (let character = 0; character < DEVICE_CREDENTIAL_BLOCK_SIZE; character += 1) {
      segment += DEVICE_CREDENTIAL_ALPHABET[randomIndex(DEVICE_CREDENTIAL_ALPHABET.length)];
    }

    parts.push(segment);
  }

  return parts.join("-");
}

export function hashDeviceCredential(credential) {
  return crypto.createHash("sha256").update(String(credential || ""), "utf8").digest("hex");
}
