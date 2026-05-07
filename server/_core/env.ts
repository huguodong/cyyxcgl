import path from 'path';

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data', 'sampler-salary.sqlite');

export const ENV = {
  appId: process.env.APP_ID ?? 'internal-app',
  corpId: process.env.CORP_ID ?? 'internal',
  adminName: process.env.ADMIN_NAME ?? '系统管理员',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123456',
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  cookieName: process.env.SESSION_COOKIE_NAME ?? 'sampler_salary_session',
  databasePath,
  port: Number.parseInt(process.env.PORT ?? '3002', 10),
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
  sessionMaxAgeMs: Number.parseInt(process.env.SESSION_MAX_AGE_MS ?? `${7 * 24 * 60 * 60 * 1000}`, 10),
  sessionSecret: process.env.SESSION_SECRET ?? 'change-this-session-secret',
};
