import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function seedWorkforce() {
  const techniciansCount = 30;
  const cameramenCount = 45;
  const driversCount = 50;

  const roles = [
    { prefix: 'TECH', role: 'TECHNICIAN', count: techniciansCount, namePrefix: 'Tech' },
    { prefix: 'CAM', role: 'CAMERAMAN', count: cameramenCount, namePrefix: 'Cameraman' },
    { prefix: 'DRV', role: 'DRIVER', count: driversCount, namePrefix: 'Driver' }
  ];

  let totalAdded = 0;

  for (const group of roles) {
    for (let i = 1; i <= group.count; i++) {
      const uid = `seeded_${group.prefix}_${i}`;
      const name = `${group.namePrefix} ${i}`;
      // Generate some dummy but plausible phone numbers
      const phone = `+2519${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      
      await setDoc(doc(db, 'users', uid), {
        uid,
        displayName: name,
        phoneNumber: phone,
        role: group.role,
        isPlaceholder: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      totalAdded++;
    }
  }

  return totalAdded;
}
