import crypto from 'crypto';

const HASH_KEY_LENGTH = 64;
const HASH_SEPARATOR = ':';
const HASH_ITERATIONS = 16_384;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, HASH_KEY_LENGTH, {
    N: HASH_ITERATIONS,
  });

  return `${salt}${HASH_SEPARATOR}${hash.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(HASH_SEPARATOR);
  if (!salt || !expectedHash) {
    return false;
  }

  const derivedHash = crypto.scryptSync(password, salt, HASH_KEY_LENGTH, {
    N: HASH_ITERATIONS,
  });
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (expectedBuffer.length !== derivedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedHash);
}
