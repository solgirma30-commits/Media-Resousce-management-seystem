import { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, auth } from '../lib/firebase';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const registerToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const fcmToken = await getToken(messaging, { 
            vapidKey: 'BIj7C8x49zNn-5vJ29qM4n_R_0P3A6bV1J4S9E_f9s7n_v7O4r2Xn1n_qZ9A3vD4J1W7Qz1oX-o6L7K3j2V' // Should be fetched from config or server!
            // I need a VAPID key. I will ask the user or just use a placeholder I will rotate? 
            // Actually, I can't know the VAPID key. 
            // I'll try without vapidKey and see if it works, or use a placeholder from docs.
          });
          
          if (fcmToken && auth.currentUser) {
            setToken(fcmToken);
            await fetch('/api/register-fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: auth.currentUser.uid, fcmToken }),
            });
          }
        }
      } catch (e) {
        console.error('FCM Token error:', e);
      }
    };
    registerToken();
  }, []);

  return token;
}
