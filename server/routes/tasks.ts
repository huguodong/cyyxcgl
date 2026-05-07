import { Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

router.get('/', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT
        t.*,
        s.name AS sampler_name
      FROM sampling_tasks t
      LEFT JOIN samplers s ON s.id = t.sampler_id
      WHERE t.corp_id = ? AND t.is_deleted = 'n'
      ORDER BY t.created_at DESC
    `).all(req.user.corp_id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tasks' });
  }
});

router.get('/:id', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT
        t.*,
        s.name AS sampler_name
      FROM sampling_tasks t
      LEFT JOIN samplers s ON s.id = t.sampler_id
      WHERE t.corp_id = ? AND t.id = ? AND t.is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch task' });
  }
});

router.post('/', (req: any, res) => {
  try {
    const timestamp = getCurrentTimestamp();
    const result = db.prepare(`
      INSERT INTO sampling_tasks (
        corp_id,
        app_id,
        emp_id,
        task_code,
        task_type,
        location,
        sampler_id,
        start_time,
        end_time,
        status,
        sample_count,
        difficulty_level,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'n', ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      req.body.task_code || null,
      req.body.task_type,
      req.body.location || null,
      req.body.sampler_id || null,
      req.body.start_time || null,
      req.body.end_time || null,
      req.body.status || 'pending',
      Number.parseInt(req.body.sample_count, 10) || 0,
      Number.parseFloat(req.body.difficulty_level) || 1,
      timestamp,
      timestamp,
    );

    const data = db.prepare(`
      SELECT
        t.*,
        s.name AS sampler_name
      FROM sampling_tasks t
      LEFT JOIN samplers s ON s.id = t.sampler_id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

router.put('/:id', (req: any, res) => {
  try {
    const existing = db.prepare(`
      SELECT *
      FROM sampling_tasks
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    db.prepare(`
      UPDATE sampling_tasks
      SET
        task_code = ?,
        task_type = ?,
        location = ?,
        sampler_id = ?,
        start_time = ?,
        end_time = ?,
        status = ?,
        sample_count = ?,
        difficulty_level = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.task_code ?? existing.task_code,
      req.body.task_type ?? existing.task_type,
      req.body.location ?? existing.location,
      req.body.sampler_id ?? existing.sampler_id,
      req.body.start_time ?? existing.start_time,
      req.body.end_time ?? existing.end_time,
      req.body.status ?? existing.status,
      req.body.sample_count !== undefined ? Number.parseInt(req.body.sample_count, 10) || 0 : existing.sample_count,
      req.body.difficulty_level !== undefined ? Number.parseFloat(req.body.difficulty_level) || 1 : existing.difficulty_level,
      getCurrentTimestamp(),
      req.params.id,
      req.user.corp_id,
    );

    const data = db.prepare(`
      SELECT
        t.*,
        s.name AS sampler_name
      FROM sampling_tasks t
      LEFT JOIN samplers s ON s.id = t.sampler_id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update task' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE sampling_tasks
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete task' });
  }
});

router.post('/:id/complete', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE sampling_tasks
      SET
        status = 'completed',
        end_time = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), getCurrentTimestamp(), req.params.id, req.user.corp_id);

    const data = db.prepare(`
      SELECT
        t.*,
        s.name AS sampler_name
      FROM sampling_tasks t
      LEFT JOIN samplers s ON s.id = t.sampler_id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to complete task' });
  }
});

export default router;
