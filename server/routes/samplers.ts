import { Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

router.get('/', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT *
      FROM samplers
      WHERE corp_id = ? AND is_deleted = 'n'
      ORDER BY created_at DESC
    `).all(req.user.corp_id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch samplers' });
  }
});

router.get('/:id', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT *
      FROM samplers
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: 'Sampler not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch sampler' });
  }
});

router.post('/', (req: any, res) => {
  try {
    const timestamp = getCurrentTimestamp();
    const result = db.prepare(`
      INSERT INTO samplers (
        corp_id,
        app_id,
        emp_id,
        name,
        employee_code,
        phone,
        entry_date,
        status,
        base_salary,
        skill_level,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'n', ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      req.body.name,
      req.body.employee_code || null,
      req.body.phone || null,
      req.body.entry_date || null,
      req.body.status || 'active',
      Number.parseFloat(req.body.base_salary) || 0,
      req.body.skill_level || null,
      timestamp,
      timestamp,
    );

    const data = db.prepare('SELECT * FROM samplers WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create sampler' });
  }
});

router.put('/:id', (req: any, res) => {
  try {
    const existing = db.prepare(`
      SELECT *
      FROM samplers
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Sampler not found' });
      return;
    }

    const timestamp = getCurrentTimestamp();
    db.prepare(`
      UPDATE samplers
      SET
        name = ?,
        employee_code = ?,
        phone = ?,
        entry_date = ?,
        status = ?,
        base_salary = ?,
        skill_level = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.name ?? existing.name,
      req.body.employee_code ?? existing.employee_code,
      req.body.phone ?? existing.phone,
      req.body.entry_date ?? existing.entry_date,
      req.body.status ?? existing.status,
      req.body.base_salary !== undefined ? Number.parseFloat(req.body.base_salary) || 0 : existing.base_salary,
      req.body.skill_level ?? existing.skill_level,
      timestamp,
      req.params.id,
      req.user.corp_id,
    );

    const data = db.prepare('SELECT * FROM samplers WHERE id = ?').get(req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update sampler' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE samplers
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete sampler' });
  }
});

export default router;
