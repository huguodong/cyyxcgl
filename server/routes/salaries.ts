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

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getComprehensiveCoefficient(score: number, veto: boolean): number {
  if (veto) return 0;
  if (score >= 100) return 1.05;
  if (score >= 95) return 1;
  if (score >= 90) return 0.95;
  if (score >= 85) return 0.9;
  if (score >= 80) return 0.8;
  return 0.6;
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
    const basicSalaryStandard = configMap.basic_salary_standard ?? 2100;
    const localMinimumWage = configMap.local_minimum_wage ?? 2100;
    const performancePoolRatio = (configMap.performance_pool_ratio ?? 10) / 100;
    const equalShareRatio = (configMap.equal_share_ratio ?? 70) / 100;
    const differentialShareRatio = (configMap.differential_share_ratio ?? 30) / 100;
    const defaultRequiredAttendanceDays = configMap.default_required_attendance_days ?? 22;
    const jobLevel = Number.parseInt(sampler.job_level, 10) || 1;
    const positionSalary = configMap[`position_salary_level_${jobLevel}`] ?? ({ 1: 200, 2: 400, 3: 800, 4: 1600 }[jobLevel] || 0);

    const groupRevenue = toNumber(req.body.group_revenue);
    const distributionCount = Math.max(Number.parseInt(req.body.distribution_count, 10) || 1, 1);
    const workloadPoints = toNumber(req.body.workload_points);
    const groupWorkloadPoints = toNumber(req.body.group_workload_points);
    const attendanceDays = toNumber(req.body.attendance_days, defaultRequiredAttendanceDays);
    const requiredAttendanceDays = toNumber(req.body.required_attendance_days, defaultRequiredAttendanceDays);
    const qualityScore = clamp(toNumber(req.body.quality_score, 100), 0, 100);
    const timelinessScore = clamp(toNumber(req.body.timeliness_score, 100), 0, 100);
    const equipmentScore = clamp(toNumber(req.body.equipment_score, 100), 0, 100);
    const otherPay = toNumber(req.body.other_pay);
    const veto = Boolean(req.body.veto);

    const basicSalary = Math.max(basicSalaryStandard, localMinimumWage);
    const performancePool = groupRevenue * performancePoolRatio;
    const equalPerformance = performancePool * equalShareRatio / distributionCount;
    const workloadShare = groupWorkloadPoints > 0 ? workloadPoints / groupWorkloadPoints : 0;
    const differentialPerformance = performancePool * differentialShareRatio * workloadShare;
    const attendanceRate = requiredAttendanceDays > 0 ? clamp(attendanceDays / requiredAttendanceDays, 0, 1) : 1;
    const comprehensiveScore = Number((qualityScore * 0.5 + timelinessScore * 0.4 + equipmentScore * 0.1).toFixed(2));
    const comprehensiveCoefficient = getComprehensiveCoefficient(comprehensiveScore, veto);
    const performanceSalary = Number(((equalPerformance + differentialPerformance) * comprehensiveCoefficient * attendanceRate).toFixed(2));
    const totalSalary = Number((basicSalary + positionSalary + performanceSalary + otherPay).toFixed(2));
    const timestamp = getCurrentTimestamp();

    const result = db.prepare(`
      INSERT INTO salary_records (
        corp_id,
        app_id,
        emp_id,
        sampler_id,
        year_month,
        basic_salary,
        position_salary,
        group_revenue,
        performance_pool,
        equal_performance,
        differential_performance,
        workload_points,
        group_workload_points,
        workload_share,
        attendance_days,
        required_attendance_days,
        attendance_rate,
        quality_score,
        timeliness_score,
        equipment_score,
        comprehensive_score,
        comprehensive_coefficient,
        performance_salary,
        other_pay,
        veto,
        veto_reason,
        total_salary,
        actual_salary,
        payment_status,
        payment_date,
        notes,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', NULL, ?, 'n', ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      samplerId,
      yearMonth,
      basicSalary,
      positionSalary,
      groupRevenue,
      performancePool,
      equalPerformance,
      differentialPerformance,
      workloadPoints,
      groupWorkloadPoints,
      workloadShare,
      attendanceDays,
      requiredAttendanceDays,
      attendanceRate,
      qualityScore,
      timelinessScore,
      equipmentScore,
      comprehensiveScore,
      comprehensiveCoefficient,
      performanceSalary,
      otherPay,
      veto ? 1 : 0,
      req.body.veto_reason || null,
      totalSalary,
      totalSalary,
      req.body.notes || null,
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
        basic_salary = ?,
        position_salary = ?,
        performance_salary = ?,
        other_pay = ?,
        total_salary = ?,
        actual_salary = ?,
        payment_status = ?,
        payment_date = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.basic_salary ?? existing.basic_salary,
      req.body.position_salary ?? existing.position_salary,
      req.body.performance_salary ?? existing.performance_salary,
      req.body.other_pay ?? existing.other_pay,
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
