import { Request, Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

interface AuthedRequest extends Request {
  user: {
    app_id: string;
    corp_id: string;
    emp_id: string;
    name: string;
  };
}

interface SalaryInput {
  [key: string]: unknown;
}

interface SamplerRow {
  id: number;
  job_level: number;
}

interface SalaryRecordRow {
  actual_salary: number;
  payment_status: string;
  payment_date: string | null;
  notes: string | null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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

function toInteger(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function ratioRate(total: number, failed: number): number {
  if (total <= 0) return 100;
  return clamp(((total - failed) / total) * 100, 0, 100);
}

function scoreByThreshold(rate: number, thresholds: Array<[number, number]>): number {
  for (const [minimum, score] of thresholds) {
    if (rate >= minimum) return score;
  }
  return 0;
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

function getComplaintScore(count: number, scores: [number, number, number]): number {
  if (count <= 0) return scores[0];
  if (count === 1) return scores[1];
  if (count === 2) return scores[2];
  return 0;
}

function calculateScores(body: SalaryInput) {
  const internalComplaints = Math.max(toInteger(body.internal_complaints), 0);
  const externalComplaints = Math.max(toInteger(body.external_complaints), 0);
  const internalComplaintScore = getComplaintScore(internalComplaints, [15, 10, 5]);
  const externalComplaintScore = getComplaintScore(externalComplaints, [25, 15, 5]);

  const recordRequiredKeyItems = Math.max(toInteger(body.record_required_key_items, 4), 0);
  const recordRequiredGeneralItems = Math.max(toInteger(body.record_required_general_items, 6), 0);
  const recordMissingKeyItems = Math.max(toInteger(body.record_missing_key_items), 0);
  const recordMissingGeneralItems = Math.max(toInteger(body.record_missing_general_items), 0);
  const completenessTotal = recordRequiredKeyItems * 3 + recordRequiredGeneralItems;
  const completenessDeduction = recordMissingKeyItems * 3 + recordMissingGeneralItems;
  const recordCompletenessRate = completenessTotal > 0
    ? clamp(((completenessTotal - completenessDeduction) / completenessTotal) * 100, 0, 100)
    : 100;
  const recordCompletenessScore = scoreByThreshold(recordCompletenessRate, [
    [99, 30],
    [97, 25],
    [95, 20],
    [90, 10],
  ]);

  const recordAccuracyKeyItems = Math.max(toInteger(body.record_accuracy_key_items, 4), 0);
  const recordAccuracyGeneralItems = Math.max(toInteger(body.record_accuracy_general_items, 4), 0);
  const recordErrorKeyItems = Math.max(toInteger(body.record_error_key_items), 0);
  const recordErrorGeneralItems = Math.max(toInteger(body.record_error_general_items), 0);
  const accuracyTotal = recordAccuracyKeyItems * 3 + recordAccuracyGeneralItems;
  const accuracyDeduction = recordErrorKeyItems * 3 + recordErrorGeneralItems;
  const recordAccuracyRate = accuracyTotal > 0
    ? clamp(((accuracyTotal - accuracyDeduction) / accuracyTotal) * 100, 0, 100)
    : 100;
  const recordAccuracyScore = scoreByThreshold(recordAccuracyRate, [
    [99.5, 30],
    [98, 25],
    [96, 20],
    [93, 10],
  ]);

  const qualityScore = internalComplaintScore + externalComplaintScore + recordCompletenessScore + recordAccuracyScore;

  const punctualRequiredCount = Math.max(toInteger(body.punctual_required_count), 0);
  const lateCount = Math.max(toInteger(body.late_count), 0);
  const punctualityRate = ratioRate(punctualRequiredCount, lateCount);
  const punctualityScore = scoreByThreshold(punctualityRate, [
    [98, 50],
    [95, 45],
    [90, 35],
    [85, 20],
  ]);

  const handoverRequiredCount = Math.max(toInteger(body.handover_required_count), 0);
  const overdueCount = Math.max(toInteger(body.overdue_count), 0);
  const handoverTimelinessRate = ratioRate(handoverRequiredCount, overdueCount);
  const handoverTimelinessScore = scoreByThreshold(handoverTimelinessRate, [
    [98, 50],
    [95, 45],
    [90, 35],
    [85, 20],
  ]);
  const timelinessScore = punctualityScore + handoverTimelinessScore;

  const maintenanceCheckCount = Math.max(toInteger(body.maintenance_check_count), 0);
  const maintenanceFailCount = Math.max(toInteger(body.maintenance_fail_count), 0);
  const maintenanceScore = clamp(60 - maintenanceFailCount * 15, 0, 60);

  const consumableUsageCount = Math.max(toInteger(body.consumable_usage_count), 0);
  const consumableWasteCount = Math.max(toInteger(body.consumable_waste_count), 0);
  const consumableWasteRate = consumableUsageCount > 0
    ? clamp((consumableWasteCount / consumableUsageCount) * 100, 0, 100)
    : 0;
  const consumableWasteScore = consumableUsageCount <= 0
    ? 40
    : scoreByThreshold(100 - consumableWasteRate, [
      [99, 40],
      [98, 35],
      [97, 25],
      [95, 10],
    ]);
  const equipmentScore = maintenanceScore + consumableWasteScore;

  return {
    internalComplaints,
    internalComplaintScore,
    externalComplaints,
    externalComplaintScore,
    recordRequiredKeyItems,
    recordRequiredGeneralItems,
    recordMissingKeyItems,
    recordMissingGeneralItems,
    recordCompletenessRate: round(recordCompletenessRate),
    recordCompletenessScore,
    recordAccuracyKeyItems,
    recordAccuracyGeneralItems,
    recordErrorKeyItems,
    recordErrorGeneralItems,
    recordAccuracyRate: round(recordAccuracyRate),
    recordAccuracyScore,
    qualityScore: round(qualityScore),
    punctualRequiredCount,
    lateCount,
    punctualityRate: round(punctualityRate),
    punctualityScore,
    handoverRequiredCount,
    overdueCount,
    handoverTimelinessRate: round(handoverTimelinessRate),
    handoverTimelinessScore,
    timelinessScore: round(timelinessScore),
    maintenanceCheckCount,
    maintenanceFailCount,
    maintenanceScore,
    consumableUsageCount,
    consumableWasteCount,
    consumableWasteRate: round(consumableWasteRate),
    consumableWasteScore,
    equipmentScore: round(equipmentScore),
  };
}

router.get('/', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.corp_id = ? AND sr.is_deleted = 'n'
      ORDER BY sr.year_month DESC, sr.created_at DESC
    `).all(authedReq.user.corp_id);

    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to fetch salary records') });
  }
});

router.get('/:id', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.corp_id = ? AND sr.id = ? AND sr.is_deleted = 'n'
    `).get(authedReq.user.corp_id, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: 'Salary record not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to fetch salary record') });
  }
});

router.post('/calculate', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    const samplerId = Number.parseInt(req.body.sampler_id, 10);
    const yearMonth = String(req.body.year_month ?? '');
    const sampler = db.prepare(`
      SELECT *
      FROM samplers
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(authedReq.user.corp_id, samplerId) as SamplerRow | undefined;

    if (!sampler) {
      res.status(404).json({ success: false, error: 'Sampler not found' });
      return;
    }

    const configMap = getConfigMap(authedReq.user.corp_id);
    const basicSalaryStandard = configMap.basic_salary_standard ?? 2100;
    const localMinimumWage = configMap.local_minimum_wage ?? 2100;
    const performancePoolRatio = (configMap.performance_pool_ratio ?? 10) / 100;
    const equalShareRatio = (configMap.equal_share_ratio ?? 70) / 100;
    const differentialShareRatio = (configMap.differential_share_ratio ?? 30) / 100;
    const defaultRequiredAttendanceDays = configMap.default_required_attendance_days ?? 22;
    const jobLevel = Number(sampler.job_level) || 1;
    const defaultPositionSalary = { 1: 200, 2: 400, 3: 800, 4: 1600 }[jobLevel as 1 | 2 | 3 | 4] || 0;
    const positionSalary = configMap[`position_salary_level_${jobLevel}`] ?? defaultPositionSalary;

    const groupRevenue = Math.max(toNumber(req.body.group_revenue), 0);
    const distributionCount = Math.max(toInteger(req.body.distribution_count, 4), 1);
    const workloadPoints = Math.max(toNumber(req.body.workload_points), 0);
    const groupWorkloadPoints = Math.max(toNumber(req.body.group_workload_points), 0);
    const attendanceDays = Math.max(toNumber(req.body.attendance_days, defaultRequiredAttendanceDays), 0);
    const requiredAttendanceDays = Math.max(toNumber(req.body.required_attendance_days, defaultRequiredAttendanceDays), 0);
    const otherPay = toNumber(req.body.other_pay);
    const veto = Boolean(req.body.veto);
    const scores = calculateScores(req.body);

    const basicSalary = Math.max(basicSalaryStandard, localMinimumWage);
    const performancePool = round(groupRevenue * performancePoolRatio);
    const equalPerformance = round(performancePool * equalShareRatio / distributionCount);
    const workloadShare = groupWorkloadPoints > 0 ? workloadPoints / groupWorkloadPoints : 0;
    const differentialPerformance = round(performancePool * differentialShareRatio * workloadShare);
    const attendanceRate = requiredAttendanceDays > 0 ? clamp(attendanceDays / requiredAttendanceDays, 0, 1) : 1;
    const comprehensiveScore = round(scores.qualityScore * 0.5 + scores.timelinessScore * 0.4 + scores.equipmentScore * 0.1);
    const comprehensiveCoefficient = getComprehensiveCoefficient(comprehensiveScore, veto);
    const performanceSalary = round((equalPerformance + differentialPerformance) * comprehensiveCoefficient * attendanceRate);
    const totalSalary = round(basicSalary + positionSalary + performanceSalary + otherPay);
    const timestamp = getCurrentTimestamp();

    const result = db.prepare(`
      INSERT INTO salary_records (
        corp_id, app_id, emp_id, sampler_id, year_month,
        basic_salary, position_salary, group_revenue, distribution_count,
        performance_pool, equal_performance, differential_performance,
        workload_points, group_workload_points, workload_share,
        attendance_days, required_attendance_days, attendance_rate,
        quality_score, internal_complaints, internal_complaint_score,
        external_complaints, external_complaint_score,
        record_required_key_items, record_required_general_items,
        record_missing_key_items, record_missing_general_items,
        record_completeness_rate, record_completeness_score,
        record_accuracy_key_items, record_accuracy_general_items,
        record_error_key_items, record_error_general_items,
        record_accuracy_rate, record_accuracy_score,
        timeliness_score, punctual_required_count, late_count,
        punctuality_rate, punctuality_score, handover_required_count,
        overdue_count, handover_timeliness_rate, handover_timeliness_score,
        equipment_score, maintenance_check_count, maintenance_fail_count,
        maintenance_score, consumable_usage_count, consumable_waste_count,
        consumable_waste_rate, consumable_waste_score,
        comprehensive_score, comprehensive_coefficient, performance_salary,
        other_pay, veto, veto_reason, total_salary, actual_salary,
        payment_status, payment_date, notes, is_deleted, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        'unpaid', NULL, ?, 'n', ?, ?
      )
    `).run(
      authedReq.user.corp_id,
      authedReq.user.app_id,
      authedReq.user.emp_id,
      samplerId,
      yearMonth,
      basicSalary,
      positionSalary,
      groupRevenue,
      distributionCount,
      performancePool,
      equalPerformance,
      differentialPerformance,
      workloadPoints,
      groupWorkloadPoints,
      round(workloadShare, 4),
      attendanceDays,
      requiredAttendanceDays,
      round(attendanceRate, 4),
      scores.qualityScore,
      scores.internalComplaints,
      scores.internalComplaintScore,
      scores.externalComplaints,
      scores.externalComplaintScore,
      scores.recordRequiredKeyItems,
      scores.recordRequiredGeneralItems,
      scores.recordMissingKeyItems,
      scores.recordMissingGeneralItems,
      scores.recordCompletenessRate,
      scores.recordCompletenessScore,
      scores.recordAccuracyKeyItems,
      scores.recordAccuracyGeneralItems,
      scores.recordErrorKeyItems,
      scores.recordErrorGeneralItems,
      scores.recordAccuracyRate,
      scores.recordAccuracyScore,
      scores.timelinessScore,
      scores.punctualRequiredCount,
      scores.lateCount,
      scores.punctualityRate,
      scores.punctualityScore,
      scores.handoverRequiredCount,
      scores.overdueCount,
      scores.handoverTimelinessRate,
      scores.handoverTimelinessScore,
      scores.equipmentScore,
      scores.maintenanceCheckCount,
      scores.maintenanceFailCount,
      scores.maintenanceScore,
      scores.consumableUsageCount,
      scores.consumableWasteCount,
      scores.consumableWasteRate,
      scores.consumableWasteScore,
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to calculate salary') });
  }
});

router.put('/:id', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    const existing = db.prepare(`
      SELECT *
      FROM salary_records
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(authedReq.user.corp_id, req.params.id) as SalaryRecordRow | undefined;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Salary record not found' });
      return;
    }

    db.prepare(`
      UPDATE salary_records
      SET
        actual_salary = ?,
        payment_status = ?,
        payment_date = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.actual_salary ?? existing.actual_salary,
      req.body.payment_status ?? existing.payment_status,
      req.body.payment_date ?? existing.payment_date,
      req.body.notes ?? existing.notes,
      getCurrentTimestamp(),
      req.params.id,
      authedReq.user.corp_id,
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
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to update salary record') });
  }
});

router.delete('/:id', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    db.prepare(`
      UPDATE salary_records
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, authedReq.user.corp_id);

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to delete salary record') });
  }
});

router.post('/:id/pay', (req, res) => {
  const authedReq = req as unknown as AuthedRequest;
  try {
    db.prepare(`
      UPDATE salary_records
      SET
        payment_status = 'paid',
        payment_date = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp().slice(0, 10), getCurrentTimestamp(), req.params.id, authedReq.user.corp_id);

    const data = db.prepare(`
      SELECT
        sr.*,
        s.name AS sampler_name
      FROM salary_records sr
      LEFT JOIN samplers s ON s.id = sr.sampler_id
      WHERE sr.id = ?
    `).get(req.params.id);

    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: errorMessage(error, 'Failed to mark as paid') });
  }
});

export default router;
