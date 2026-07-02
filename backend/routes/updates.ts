import { Router } from 'express';
import { listDocuments, createDocument } from '../db.ts';

const router = Router();

router.get('/department-updates', async (req, res) => {
  const { department } = req.query;
  try {
    const docs = await listDocuments('department_updates', { department: department as string });
    res.json(docs.slice(0, 20));
  } catch (error) {
    console.error('Error fetching department updates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch updates' });
  }
});

router.post('/department-updates', async (req, res) => {
  const { department, message, sender } = req.body;
  try {
    const id = Math.random().toString(36).substring(2, 15);
    const data = {
      department,
      message,
      sender,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };
    const created = await createDocument('department_updates', id, data);
    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Error inserting department update:', error);
    res.status(500).json({ success: false, message: 'Failed to insert update' });
  }
});

export default router;
