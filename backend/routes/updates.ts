import { Router } from 'express';
import pool from '../db';

const router = Router();

router.post('/department-updates', async (req, res) => {
  const { department, message, sender } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO department_updates (department, message, sender, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [department, message, sender]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error inserting department update:', error);
    res.status(500).json({ success: false, message: 'Failed to insert update' });
  }
});

export default router;
