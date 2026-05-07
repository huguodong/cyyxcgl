import { Router } from 'express';
import { clearSessionCookie, getAuthenticatedUser, setSessionCookie } from '../_core/auth.js';
import { db, type LocalUserRow } from '../lib/db.js';
import { verifyPassword } from '../lib/passwords.js';

const router: Router = Router();

function sanitizeUser(user: LocalUserRow) {
  return {
    app_id: user.app_id,
    corp_id: user.corp_id,
    id: user.id,
    name: user.name,
    role: user.role,
    username: user.username,
  };
}

router.post('/login', (req: any, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: '用户名和密码不能为空',
    });
    return;
  }

  const user = db.prepare(`
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
    WHERE username = ?
  `).get(username) as LocalUserRow | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({
      success: false,
      error: '用户名或密码错误',
    });
    return;
  }

  setSessionCookie(res, user.id);
  res.json({
    success: true,
    data: sanitizeUser(user),
  });
});

router.post('/logout', (_req: any, res) => {
  clearSessionCookie(res);
  res.json({
    success: true,
  });
});

router.get('/me', (req: any, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  res.json({
    success: true,
    data: sanitizeUser(user),
  });
});

export default router;
