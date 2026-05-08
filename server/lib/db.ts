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
  const timestamp = now();
  const seedConfigs: Array<[string, string, number, string]> = [
    ['salary', 'basic_salary_standard', 2100, '制度基本工资标准；适用地最低工资更高时按更高标准执行'],
    ['salary', 'local_minimum_wage', 2100, '适用地现行最低工资标准'],
    ['salary', 'performance_pool_ratio', 10, '小组绩效工资池提取比例，即小组有效业绩的 10%'],
    ['salary', 'equal_share_ratio', 70, '绩效工资池均分比例'],
    ['salary', 'differential_share_ratio', 30, '绩效工资池按工作量差异分配比例'],
    ['salary', 'default_required_attendance_days', 22, '默认月度应出勤天数'],
    ['position', 'position_salary_level_1', 200, '一级岗位工资'],
    ['position', 'position_salary_level_2', 400, '二级岗位工资'],
    ['position', 'position_salary_level_3', 800, '三级岗位工资'],
    ['position', 'position_salary_level_4', 1600, '四级岗位工资'],
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
      const existing = db.prepare(`
        SELECT id
        FROM salary_configs
        WHERE corp_id = ? AND config_key = ? AND is_deleted = 'n'
      `).get(ENV.corpId, configKey) as { id: number } | undefined;

      if (existing) {
        return;
      }

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

function retireLegacySalaryConfigs() {
  const legacyKeys = [
    'piece_rate_base',
    'hourly_rate',
    'overtime_multiplier',
    'weekend_multiplier',
    'holiday_multiplier',
    'performance_ratio',
    'tax_rate',
    'social_security_ratio',
  ];

  const placeholders = legacyKeys.map(() => '?').join(', ');
  db.prepare(`
    UPDATE salary_configs
    SET is_deleted = 'y', is_active = 0, updated_at = ?
    WHERE config_key IN (${placeholders}) AND is_deleted = 'n'
  `).run(now(), ...legacyKeys);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function initDatabase() {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    DROP TABLE IF EXISTS sampling_tasks;
    DROP TABLE IF EXISTS work_hours;

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
      job_level INTEGER NOT NULL DEFAULT 1,
      is_deleted TEXT NOT NULL DEFAULT 'n',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS salary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      emp_id TEXT NOT NULL,
      sampler_id INTEGER,
      year_month TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      position_salary REAL NOT NULL DEFAULT 0,
      group_revenue REAL NOT NULL DEFAULT 0,
      distribution_count INTEGER NOT NULL DEFAULT 4,
      performance_pool REAL NOT NULL DEFAULT 0,
      equal_performance REAL NOT NULL DEFAULT 0,
      differential_performance REAL NOT NULL DEFAULT 0,
      workload_points REAL NOT NULL DEFAULT 0,
      group_workload_points REAL NOT NULL DEFAULT 0,
      workload_share REAL NOT NULL DEFAULT 0,
      attendance_days REAL NOT NULL DEFAULT 0,
      required_attendance_days REAL NOT NULL DEFAULT 0,
      attendance_rate REAL NOT NULL DEFAULT 1,
      quality_score REAL NOT NULL DEFAULT 100,
      internal_complaints INTEGER NOT NULL DEFAULT 0,
      internal_complaint_score REAL NOT NULL DEFAULT 15,
      external_complaints INTEGER NOT NULL DEFAULT 0,
      external_complaint_score REAL NOT NULL DEFAULT 25,
      record_required_key_items INTEGER NOT NULL DEFAULT 4,
      record_required_general_items INTEGER NOT NULL DEFAULT 6,
      record_missing_key_items INTEGER NOT NULL DEFAULT 0,
      record_missing_general_items INTEGER NOT NULL DEFAULT 0,
      record_completeness_rate REAL NOT NULL DEFAULT 100,
      record_completeness_score REAL NOT NULL DEFAULT 30,
      record_accuracy_key_items INTEGER NOT NULL DEFAULT 4,
      record_accuracy_general_items INTEGER NOT NULL DEFAULT 4,
      record_error_key_items INTEGER NOT NULL DEFAULT 0,
      record_error_general_items INTEGER NOT NULL DEFAULT 0,
      record_accuracy_rate REAL NOT NULL DEFAULT 100,
      record_accuracy_score REAL NOT NULL DEFAULT 30,
      timeliness_score REAL NOT NULL DEFAULT 100,
      punctual_required_count INTEGER NOT NULL DEFAULT 0,
      late_count INTEGER NOT NULL DEFAULT 0,
      punctuality_rate REAL NOT NULL DEFAULT 100,
      punctuality_score REAL NOT NULL DEFAULT 50,
      handover_required_count INTEGER NOT NULL DEFAULT 0,
      overdue_count INTEGER NOT NULL DEFAULT 0,
      handover_timeliness_rate REAL NOT NULL DEFAULT 100,
      handover_timeliness_score REAL NOT NULL DEFAULT 50,
      equipment_score REAL NOT NULL DEFAULT 100,
      maintenance_check_count INTEGER NOT NULL DEFAULT 0,
      maintenance_fail_count INTEGER NOT NULL DEFAULT 0,
      maintenance_score REAL NOT NULL DEFAULT 60,
      consumable_usage_count INTEGER NOT NULL DEFAULT 0,
      consumable_waste_count INTEGER NOT NULL DEFAULT 0,
      consumable_waste_rate REAL NOT NULL DEFAULT 0,
      consumable_waste_score REAL NOT NULL DEFAULT 40,
      comprehensive_score REAL NOT NULL DEFAULT 100,
      comprehensive_coefficient REAL NOT NULL DEFAULT 1,
      performance_salary REAL NOT NULL DEFAULT 0,
      other_pay REAL NOT NULL DEFAULT 0,
      veto INTEGER NOT NULL DEFAULT 0,
      veto_reason TEXT,
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

  ensureColumn('samplers', 'job_level', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('salary_records', 'basic_salary', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'position_salary', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'group_revenue', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'distribution_count', 'INTEGER NOT NULL DEFAULT 4');
  ensureColumn('salary_records', 'performance_pool', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'equal_performance', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'differential_performance', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'workload_points', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'group_workload_points', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'workload_share', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'attendance_days', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'required_attendance_days', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'attendance_rate', 'REAL NOT NULL DEFAULT 1');
  ensureColumn('salary_records', 'quality_score', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'internal_complaints', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'internal_complaint_score', 'REAL NOT NULL DEFAULT 15');
  ensureColumn('salary_records', 'external_complaints', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'external_complaint_score', 'REAL NOT NULL DEFAULT 25');
  ensureColumn('salary_records', 'record_required_key_items', 'INTEGER NOT NULL DEFAULT 4');
  ensureColumn('salary_records', 'record_required_general_items', 'INTEGER NOT NULL DEFAULT 6');
  ensureColumn('salary_records', 'record_missing_key_items', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'record_missing_general_items', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'record_completeness_rate', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'record_completeness_score', 'REAL NOT NULL DEFAULT 30');
  ensureColumn('salary_records', 'record_accuracy_key_items', 'INTEGER NOT NULL DEFAULT 4');
  ensureColumn('salary_records', 'record_accuracy_general_items', 'INTEGER NOT NULL DEFAULT 4');
  ensureColumn('salary_records', 'record_error_key_items', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'record_error_general_items', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'record_accuracy_rate', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'record_accuracy_score', 'REAL NOT NULL DEFAULT 30');
  ensureColumn('salary_records', 'timeliness_score', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'punctual_required_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'late_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'punctuality_rate', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'punctuality_score', 'REAL NOT NULL DEFAULT 50');
  ensureColumn('salary_records', 'handover_required_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'overdue_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'handover_timeliness_rate', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'handover_timeliness_score', 'REAL NOT NULL DEFAULT 50');
  ensureColumn('salary_records', 'equipment_score', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'maintenance_check_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'maintenance_fail_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'maintenance_score', 'REAL NOT NULL DEFAULT 60');
  ensureColumn('salary_records', 'consumable_usage_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'consumable_waste_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'consumable_waste_rate', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'consumable_waste_score', 'REAL NOT NULL DEFAULT 40');
  ensureColumn('salary_records', 'comprehensive_score', 'REAL NOT NULL DEFAULT 100');
  ensureColumn('salary_records', 'comprehensive_coefficient', 'REAL NOT NULL DEFAULT 1');
  ensureColumn('salary_records', 'performance_salary', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'other_pay', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'veto', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('salary_records', 'veto_reason', 'TEXT');

  seedDefaultAdmin();
  seedSalaryConfigs();
  retireLegacySalaryConfigs();
}

export function getCurrentTimestamp(): string {
  return now();
}
