import { Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

function getConfigMap(corpId: string): Record<string, number> {
  const rows = db.prepare(`
    SELECT config_key, config_value
    FROM salary_configs
    WHERE corp_id = ? AND is_deleted = 'n' AND is_active = 1
  `).all(corpId) as Array<{ config_key: string; config_value: number }>;

  return rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.config_key] = row.config_value;
    return accumulator;
  }, {});
}

router.get('/', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.corp_id = ? AND sr.is_deleted = 'n'
      ORDER BY sr.year_month DESC, sr.created_at DESC
    `).all(req.user.corp_id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch salary records' });
  }
});

router.get('/:id', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.corp_id = ? AND sr.id = ? AND sr.is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: 'Salary record not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch salary record' });
  }
});

router.post('/calculate', (req: any, res) => {
  try {
    const samplerId = Number.parseInt(req.body.sampler_id, 10);
    const yearMonth = String(req.body.year_month ?? '');
    const sampler = db.prepare(`
      SELECT *
      FROM samplers
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, samplerId) as any;

    if (!sampler) {
      res.status(404).json({ success: false, error: 'Sampler not found' });
      return;
    }

    const configMap = getConfigMap(req.user.corp_id);
    const pieceRateBase = configMap.piece_rate_base ?? 50;
    const hourlyRate = configMap.hourly_rate ?? 30;
    const overtimeMultiplier = configMap.overtime_multiplier ?? 1.5;
    const weekendMultiplier = configMap.weekend_multiplier ?? 2;
    const holidayMultiplier = configMap.holiday_multiplier ?? 3;
    const performanceRatio = (configMap.performance_ratio ?? 10) / 100;

    const tasks = db.prepare(`
      SELECT *
      FROM sampling_tasks
      WHERE corp_id = ? AND sampler_id = ? AND status = 'completed' AND is_deleted = 'n'
        AND substr(COALESCE(start_time, created_at), 1, 7) = ?
    `).all(req.user.corp_id, samplerId, yearMonth) as any[];

    const workHours = db.prepare(`
      SELECT *
      FROM work_hours
      WHERE corp_id = ? AND sampler_id = ? AND is_approved = 1 AND is_deleted = 'n'
        AND substr(work_date, 1, 7) = ?
    `).all(req.user.corp_id, samplerId, yearMonth) as any[];

    const pieceRateSalary = tasks.reduce((sum, task) => {
      return sum + pieceRateBase * (task.sample_count || 0) * (task.difficulty_level || 1);
    }, 0);

    let hourlySalary = 0;
    let overtimePay = 0;
    workHours.forEach((workHour) => {
      hourlySalary += (Number.parseFloat(workHour.regular_hours) || 0) * hourlyRate;
      hourlySalary += (Number.parseFloat(workHour.weekend_hours) || 0) * hourlyRate * weekendMultiplier;
      hourlySalary += (Number.parseFloat(workHour.holiday_hours) || 0) * hourlyRate * holidayMultiplier;
      overtimePay += (Number.parseFloat(workHour.overtime_hours) || 0) * hourlyRate * overtimeMultiplier;
    });

    const baseSalary = Number.parseFloat(sampler.base_salary) || 0;
    const performanceBonus = baseSalary * performanceRatio;
    const deductions = 0;
    const totalSalary = baseSalary + pieceRateSalary + hourlySalary + overtimePay + performanceBonus - deductions;
    const timestamp = getCurrentTimestamp();

    const result = db.prepare(`
      INSERT INTO salary_records (
        corp_id,
        app_id,
        emp_id,
        sampler_id,
        year_month,
        base_salary,
        piece_rate_salary,
        hourly_salary,
        overtime_pay,
        performance_bonus,
        deductions,
        total_salary,
        actual_salary,
        payment_status,
        payment_date,
        notes,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', NULL, NULL, 'n', ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      samplerId,
      yearMonth,
      baseSalary,
      pieceRateSalary,
      hourlySalary,
      overtimePay,
      performanceBonus,
      deductions,
      totalSalary,
      totalSalary,
      timestamp,
      timestamp,
    );

    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to calculate salary' });
  }
});

router.put('/:id', (req: any, res) => {
  try {
    const existing = db.prepare(`
      SELECT *
      FROM salary_records
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Salary record not found' });
      return;
    }

    db.prepare(`
      UPDATE salary_records
      SET
        base_salary = ?,
        piece_rate_salary = ?,
        hourly_salary = ?,
        overtime_pay = ?,
        performance_bonus = ?,
        deductions = ?,
        total_salary = ?,
        actual_salary = ?,
        payment_status = ?,
        payment_date = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.base_salary ?? existing.base_salary,
      req.body.piece_rate_salary ?? existing.piece_rate_salary,
      req.body.hourly_salary ?? existing.hourly_salary,
      req.body.overtime_pay ?? existing.overtime_pay,
      req.body.performance_bonus ?? existing.performance_bonus,
      req.body.deductions ?? existing.deductions,
      req.body.total_salary ?? existing.total_salary,
      req.body.actual_salary ?? existing.actual_salary,
      req.body.payment_status ?? existing.payment_status,
      req.body.payment_date ?? existing.payment_date,
      req.body.notes ?? existing.notes,
      getCurrentTimestamp(),
      req.params.id,
      req.user.corp_id,
    );

    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.id = ?
    `).get(req.params.id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update salary record' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE salary_records
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete salary record' });
  }
});

router.post('/:id/pay', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE salary_records
      SET
        payment_status = 'paid',
        payment_date = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp().slice(0, 10), getCurrentTimestamp(), req.params.id, req.user.corp_id);

    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.id = ?
    `).get(req.params.id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to mark as paid' });
  }
});

export default router;
