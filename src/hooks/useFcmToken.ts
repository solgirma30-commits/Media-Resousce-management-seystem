import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth } from '../lib/firebase';
import { notificationService } from '../services/notificationService';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;

    const registerToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Explicitly register the service worker for background push
          let registration;
          try {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('FCM Service Worker registered:', registration);
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
          } catch (swErr) {
            console.warn('Manual SW registration failed, falling back to auto:', swErr);
          }

          const fcmToken = await getToken(messaging, { 
            serviceWorkerRegistration: registration,
            vapidKey: 'BIj7C8x49zNn-5vJ29qM4n_R_0P3A6bV1J4S9E_f9s7n_v7O4r2Xn1n_qZ9A3vD4J1W7Qz1oX-o6L7K3j2V' 
          });
          
          if (fcmToken && auth.currentUser) {
            setToken(fcmToken);
            
            // 1. Directly save to Firestore from client-side SDK where the user context has security rule clearance
            try {
              const { doc, updateDoc } = await import('firebase/firestore');
              const { db } = await import('../lib/firebase');
              await updateDoc(doc(db, "users", auth.currentUser.uid), { fcmToken });
            } catch (dbErr) {
              console.warn("Could not save FCM token directly via client Firestore (expected if first launch):", dbErr);
            }

            // 2. Register on server side (handled gracefully without throwing unhandled exceptions if ADMIN DB is restricted)
            await fetch('/api/register-fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: auth.currentUser.uid, fcmToken }),
            });

            // 3. Set up foreground onMessage listener
            unsubscribeForeground = onMessage(messaging, (payload) => {
              console.log('FCM Foreground message received:', payload);
              if (payload.notification) {
                notificationService.notify(payload.notification.title || 'FMC Alert', {
                  body: payload.notification.body,
                  data: payload.data
                });
              }
            });
          }
        }
      } catch (e) {
        console.error('FCM Token error:', e);
      }
    };
    registerToken();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, []);

  return token;
}
