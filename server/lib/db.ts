import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { ENV } from '../_core/env.js';
import { hashPassword } from './passwords.js';

export interface LocalUserRow {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  corp_id: string;
  app_id: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

function ensureDatabaseDirectory() {
  const directory = path.dirname(ENV.databasePath);
  fs.mkdirSync(directory, { recursive: true });
}

ensureDatabaseDirectory();

export const db = new Database(ENV.databasePath);

function now(): string {
  return new Date().toISOString();
}

function seedDefaultAdmin() {
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: number } | undefined;
  if (existingUser) {
    return;
  }

  const timestamp = now();
  db.prepare(`
    INSERT INTO users (
      username,
      password_hash,
      name,
      role,
      corp_id,
      app_id,
      avatar,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ENV.adminUsername,
    hashPassword(ENV.adminPassword),
    ENV.adminName,
    'admin',
    ENV.corpId,
    ENV.appId,
    null,
    timestamp,
    timestamp,
  );
}

function seedSalaryConfigs() {
  const existingConfigCount = db.prepare('SELECT COUNT(1) AS count FROM salary_configs WHERE is_deleted = ?').get('n') as { count: number };
  if (existingConfigCount.count > 0) {
    return;
  }

  const timestamp = now();
  const seedConfigs: Array<[string, string, number, string]> = [
    ['salary', 'piece_rate_base', 50, '每个样本的基础计件工资'],
    ['salary', 'hourly_rate', 30, '正常工时每小时工资'],
    ['salary', 'overtime_multiplier', 1.5, '工作日加班工资倍数'],
    ['salary', 'weekend_multiplier', 2, '周末工时工资倍数'],
    ['salary', 'holiday_multiplier', 3, '节假日工时工资倍数'],
    ['salary', 'performance_ratio', 10, '绩效奖金占基础工资比例'],
    ['salary', 'tax_rate', 0, '税率，当前不参与计算'],
    ['salary', 'social_security_ratio', 0, '社保比例，当前不参与计算'],
  ];

  const insertStatement = db.prepare(`
    INSERT INTO salary_configs (
      corp_id,
      app_id,
      emp_id,
      config_type,
      config_key,
      config_value,
      effective_date,
      is_active,
      is_deleted,
      description,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((configs: Array<[string, string, number, string]>) => {
    configs.forEach(([configType, configKey, configValue, description]) => {
      insertStatement.run(
        ENV.corpId,
        ENV.appId,
        'system',
        configType,
        configKey,
        configValue,
        timestamp.slice(0, 10),
        1,
        'n',
        description,
        timestamp,
        timestamp,
      );
    });
  });

  insertMany(seedConfigs);
}

export function initDatabase() {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS samplers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      name TEXT NOT NULL,
      employee_code TEXT,
      phone TEXT,
      entry_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      base_salary REAL NOT NULL DEFAULT 0,
      skill_level TEXT,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sampling_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      task_code TEXT,
      task_type TEXT NOT NULL,
      location TEXT,
      sampler_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sample_count INTEGER NOT NULL DEFAULT 0,
      difficulty_level REAL NOT NULL DEFAULT 1,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sampler_id) REFERENCES samplers(id)
    );

    CREATE TABLE IF NOT EXISTS work_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      sampler_id INTEGER,
      work_date TEXT NOT NULL,
      regular_hours REAL NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      weekend_hours REAL NOT NULL DEFAULT 0,
      holiday_hours REAL NOT NULL DEFAULT 0,
      total_hours REAL NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sampler_id) REFERENCES samplers(id)
    );

    CREATE TABLE IF NOT EXISTS salary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      sampler_id INTEGER,
      year_month TEXT NOT NULL,
      base_salary REAL NOT NULL DEFAULT 0,
      piece_rate_salary REAL NOT NULL DEFAULT 0,
      hourly_salary REAL NOT NULL DEFAULT 0,
      overtime_pay REAL NOT NULL DEFAULT 0,
      performance_bonus REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      total_salary REAL NOT NULL DEFAULT 0,
      actual_salary REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_date TEXT,
      notes TEXT,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (sampler_id) REFERENCES samplers(id)
    );

    CREATE TABLE IF NOT EXISTS salary_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      config_type TEXT NOT NULL,
      config_key TEXT NOT NULL,
      config_value REAL NOT NULL,
      effective_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  seedDefaultAdmin();
  seedSalaryConfigs();
}

export function getCurrentTimestamp(): string {
  return now();
}
