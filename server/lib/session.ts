import crypto from 'crypto';
import { ENV } from '../_core/env.js';

interface SessionPayload {
  exp: number;
  userId: number;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', ENV.sessionSecret).update(payload).digest('base64url');
}

export function createSessionToken(userId: number): string {
  const payload: SessionPayload = {
    exp: Date.now() + ENV.sessionMaxAgeMs,
    userId,
  };
  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(serializedPayload);

  return `${serializedPayload}.${signature}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [serializedPayload, signature] = token.split('.');
  if (!serializedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(serializedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(serializedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
