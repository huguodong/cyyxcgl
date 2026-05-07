import type { Response } from 'express';
import { ENV } from './env.js';
import { db, type LocalUserRow } from '../lib/db.js';
import { UserContext } from '../lib/user-context.js';
import { createSessionToken, verifySessionToken } from '../lib/session.js';

function findUserById(userId: number): LocalUserRow | undefined {
  return db.prepare(`
    SELECT
      id,
      username,
      password_hash,
      name,
      role,
      corp_id,
      app_id,
      avatar,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
  `).get(userId) as LocalUserRow | undefined;
}

export function setSessionCookie(res: Response, userId: number) {
  res.cookie(ENV.cookieName, createSessionToken(userId), {
    httpOnly: true,
    maxAge: ENV.sessionMaxAgeMs,
    path: '/',
    sameSite: 'lax',
    secure: ENV.sessionCookieSecure,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(ENV.cookieName, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: ENV.sessionCookieSecure,
  });
}

export function getAuthenticatedUser(req: any): LocalUserRow | null {
  const token = req.cookies?.[ENV.cookieName] as string | undefined;
  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = findUserById(payload.userId);
  return user ?? null;
}

export function need_login(req: any, res: any, next: any) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  req.authUser = user;
  req.user = new UserContext({
    app_id: user.app_id,
    avatar: user.avatar ?? '',
    corp_id: user.corp_id,
    emp_id: String(user.id),
    name: user.name,
  });
  next();
}
