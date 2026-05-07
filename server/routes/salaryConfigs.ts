import { Router } from 'express';
import { db, getCurrentTimestamp } from '../lib/db.js';

const router: Router = Router();

router.get('/', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT *
      FROM salary_configs
      WHERE corp_id = ? AND is_deleted = 'n'
      ORDER BY config_key
    `).all(req.user.corp_id);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch salary configs' });
  }
});

router.get('/:id', (req: any, res) => {
  try {
    const data = db.prepare(`
      SELECT *
      FROM salary_configs
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: 'Salary config not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch salary config' });
  }
});

router.post('/', (req: any, res) => {
  try {
    const timestamp = getCurrentTimestamp();
    const result = db.prepare(`
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'n', ?, ?, ?)
    `).run(
      req.user.corp_id,
      req.user.app_id,
      req.user.emp_id,
      req.body.config_type || 'salary',
      req.body.config_key,
      Number.parseFloat(req.body.config_value) || 0,
      req.body.effective_date || timestamp.slice(0, 10),
      req.body.is_active === false ? 0 : 1,
      req.body.description || null,
      timestamp,
      timestamp,
    );

    const data = db.prepare('SELECT * FROM salary_configs WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create salary config' });
  }
});

router.put('/:id', (req: any, res) => {
  try {
    const existing = db.prepare(`
      SELECT *
      FROM salary_configs
      WHERE corp_id = ? AND id = ? AND is_deleted = 'n'
    `).get(req.user.corp_id, req.params.id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: 'Salary config not found' });
      return;
    }

    db.prepare(`
      UPDATE salary_configs
      SET
        config_type = ?,
        config_key = ?,
        config_value = ?,
        effective_date = ?,
        is_active = ?,
        description = ?,
        updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(
      req.body.config_type ?? existing.config_type,
      req.body.config_key ?? existing.config_key,
      req.body.config_value !== undefined ? Number.parseFloat(req.body.config_value) || 0 : existing.config_value,
      req.body.effective_date ?? existing.effective_date,
      req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : existing.is_active,
      req.body.description ?? existing.description,
      getCurrentTimestamp(),
      req.params.id,
      req.user.corp_id,
    );

    const data = db.prepare('SELECT * FROM salary_configs WHERE id = ?').get(req.params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update salary config' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    db.prepare(`
      UPDATE salary_configs
      SET is_deleted = 'y', updated_at = ?
      WHERE id = ? AND corp_id = ?
    `).run(getCurrentTimestamp(), req.params.id, req.user.corp_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete salary config' });
  }
});

export default router;
