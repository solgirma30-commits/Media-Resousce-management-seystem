import { Request, Response } from 'express';
import { CollectionService } from '../services/collection.service';

export const CollectionController = {
  async list(req: Request, res: Response) {
    try {
      const collectionName = req.params.collection;
      const filters: Record<string, any> = {};
      
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('where_')) {
          const parts = key.split('_');
          if (parts.length >= 3) {
            const field = parts[1];
            try {
              filters[field] = JSON.parse(req.query[key] as string);
            } catch {
              filters[field] = req.query[key];
            }
          }
        }
      });
      
      const docs = await CollectionService.list(collectionName, filters);
      res.json(docs);
    } catch (error: any) {
      console.error(`Error listing documents:`, error);
      res.status(500).json({ success: false, message: 'Database operation failed.' });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const collectionName = req.params.collection;
      const id = req.params.id;
      
      let doc = await CollectionService.get(collectionName, id);
      
      if (collectionName === 'users' && !doc) {
        doc = await CollectionService.syncUser(id, (req as any).user);
      }
      
      if (!doc) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      res.json(doc);
    } catch (error: any) {
      console.error(`Error getting document:`, error);
      res.status(500).json({ success: false, message: 'Database operation failed.' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { id, data, merge } = req.body;
      const collectionName = req.params.collection;
      console.log(`[CollectionController] Creating in ${collectionName}:`, { id, merge });
      
      let doc;
      if (merge) {
        doc = await CollectionService.update(collectionName, id, data);
      } else {
        doc = await CollectionService.create(collectionName, id, data);
      }
      res.json({ success: true, data: doc });
    } catch (error: any) {
      console.error(`Error saving document:`, error);
      res.status(500).json({ success: false, message: 'Database operation failed.' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const collectionName = req.params.collection;
      const doc = await CollectionService.update(collectionName, req.params.id, req.body);
      res.json({ success: true, data: doc });
    } catch (error: any) {
      console.error(`Error updating document:`, error);
      res.status(500).json({ success: false, message: 'Database operation failed.' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const collectionName = req.params.collection;
      await CollectionService.delete(collectionName, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting document:`, error);
      res.status(500).json({ success: false, message: 'Database operation failed.' });
    }
  }
};
