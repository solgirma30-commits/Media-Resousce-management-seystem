import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';

const router = Router();

router.get('/:collection', CollectionController.list);
router.get('/:collection/:id', CollectionController.get);
router.post('/:collection', CollectionController.create);
router.patch('/:collection/:id', CollectionController.update);
router.delete('/:collection/:id', CollectionController.delete);

export default router;
