import { Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

function computeTotalHours(body: any): number {
  return (
    (Number.parseFloat(body.regular_hours) || 0) +
    (Number.parseFloat(body.overtime_hours) || 0) +
    (Number.parseFloat(body.weekend_hours) || 0) +
    (Number.parseFloat(body.holiday_hours) || 0)
  );
}

router.get('/', (req: any, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        w.*,
        s.name AS sampler_name
      FROM work_hours w
      LEFT JOIN samplers s ON s.id = w.sampler_id
      WHERE w.corp_id = ? AND w.is_deleted = 'n'
      ORDER BY w.work_date DESC, w.created_at DESC
    `).all(req.user.corp_id) as any[];

    const data = rows.map((row) => ({
      ...row,
      is_approved: Boolean(row.is_approved),
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch work hours' });
  }
});

router.get('/:id', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT
        w.*,
        s.name AS sampler_name
      FROM work_hours w
      LEFT JOIN samplers s ON s.id = w.sampler_id
      WHERE w.corp_id = ? AND w.id = ? AND w.is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!data) {
      res.status(404).json({ success: false, error: 'Work hour not found' });
      return;
    }

    res.json({ success: true, data: { ...data, is_approved: Boolean(data.is_approved) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch work hour' });
  }
});

router.post('/', (req: any, res) => {
  try {
    const totalHours = computeTotalHours(req.body);
    const timestamp = getCurrentTimestamp();
    const result = db.prepare(`
      INSERT INTO work_hours (
        corp_id,
        app_id,
        emp_id,
        sampler_id,
        work_date,
        regular_hours,
        overtime_hours,
        weekend_hours,
        holiday_hours,
        total_hours,
        is_approved,
        approved_by,
        approved_at,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'n', ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      req.body.sampler_id || null,
      req.body.work_date,
      Number.parseFloat(req.body.regular_hours) || 0,
      Number.parseFloat(req.body.overtime_hours) || 0,
      Number.parseFloat(req.body.weekend_hours) || 0,
      Number.parseFloat(req.body.holiday_hours) || 0,
      totalHours,
      timestamp,
      timestamp,
    );

    const data = db.prepare(`
      SELECT
        w.*,
        s.name AS sampler_name
      FROM work_hours w
      LEFT JOIN samplers s ON s.id = w.sampler_id
      WHERE w.id = ?
    `).get(result.lastInsertRowid) as any;

    res.json({ success: true, data: { ...data, is_approved: Boolean(data.is_approved) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create work hour' });
  }
});

router.put('/:id', (req: any, res) => {
  try {
    const existing = db.prepare(`
      SELECT *
      FROM work_hours
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Work hour not found' });
      return;
    }

    const merged = {
      holiday_hours: req.body.holiday_hours ?? existing.holiday_hours,
      overtime_hours: req.body.overtime_hours ?? existing.overtime_hours,
      regular_hours: req.body.regular_hours ?? existing.regular_hours,
      weekend_hours: req.body.weekend_hours ?? existing.weekend_hours,
    };
    const totalHours = computeTotalHours(merged);

    db.prepare(`
      UPDATE work_hours
      SET
        sampler_id = ?,
        work_date = ?,
        regular_hours = ?,
        overtime_hours = ?,
        weekend_hours = ?,
        holiday_hours = ?,
        total_hours = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.sampler_id ?? existing.sampler_id,
      req.body.work_date ?? existing.work_date,
      Number.parseFloat(merged.regular_hours) || 0,
      Number.parseFloat(merged.overtime_hours) || 0,
      Number.parseFloat(merged.weekend_hours) || 0,
      Number.parseFloat(merged.holiday_hours) || 0,
      totalHours,
      getCurrentTimestamp(),
      req.params.id,
      req.user.corp_id,
    );

    const data = db.prepare(`
      SELECT
        w.*,
        s.name AS sampler_name
      FROM work_hours w
      LEFT JOIN samplers s ON s.id = w.sampler_id
      WHERE w.id = ?
    `).get(req.params.id) as any;

    res.json({ success: true, data: { ...data, is_approved: Boolean(data.is_approved) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update work hour' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE work_hours
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete work hour' });
  }
});

router.post('/:id/approve', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE work_hours
      SET
        is_approved = 1,
        approved_by = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(req.user.name, getCurrentTimestamp(), getCurrentTimestamp(), req.params.id, req.user.corp_id);

    const data = db.prepare(`
      SELECT
        w.*,
        s.name AS sampler_name
      FROM work_hours w
      LEFT JOIN samplers s ON s.id = w.sampler_id
      WHERE w.id = ?
    `).get(req.params.id) as any;

    res.json({ success: true, data: { ...data, is_approved: Boolean(data.is_approved) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to approve work hour' });
  }
});

export default router;
