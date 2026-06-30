import { GenericRepository } from '../repositories/generic.repository';

export const CollectionService = {
  async list(collectionName: string, filters: any) {
    return GenericRepository.listDocuments(collectionName, filters);
  },

  async get(collectionName: string, id: string) {
    return GenericRepository.getDocument(collectionName, id);
  },

  async create(collectionName: string, id: string | undefined, data: any) {
    return GenericRepository.createDocument(collectionName, id, data);
  },

  async update(collectionName: string, id: string, data: any) {
    return GenericRepository.createDocument(collectionName, id, data);
  },

  async delete(collectionName: string, id: string) {
    return GenericRepository.deleteDocument(collectionName, id);
  },

  async syncUser(uid: string, user: any) {
    let doc = await GenericRepository.getDocument('users', uid);
    if (!doc && user && user.uid === uid) {
      const isSystemAdmin = uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2';
      doc = {
        uid,
        email: user.email || '',
        displayName: user.name || 'FMC User',
        photoUrl: user.picture || '',
        role: isSystemAdmin ? 'SYSTEM_ADMIN' : 'NONE',
        approved: isSystemAdmin,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      await GenericRepository.createDocument('users', uid, doc);
      console.log(`[User Sync] Registered brand-new user ${uid} in PostgreSQL database.`);
    }
    return doc;
  }
};
