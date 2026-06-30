import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingClient, auth } from '../lib/firebase';
import { notificationService } from '../services/notificationService';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const registerTokenPrerequisites = useCallback(async (explicitRequest = false) => {
    try {
      if (typeof Notification === 'undefined') return;

      let currentPermission = Notification.permission;
      if (explicitRequest) {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission === 'granted') {
        // Explicitly register the service worker for background push
        let registration;
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
          try {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('FCM Service Worker registered:', registration);
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
          } catch (swErr) {
            console.warn('Manual SW registration failed, falling back to auto:', swErr);
          }
        } else {
          console.warn('Service worker is not supported or available in this browser context');
        }

        const messagingClient = await getMessagingClient();
        if (!messagingClient) {
          console.warn('FCM not supported, skipping token retrieval');
          return null;
        }

        const fcmToken = await getToken(messagingClient, { 
          serviceWorkerRegistration: registration,
          vapidKey: 'BIj7C8x49zNn-5vJ29qM4n_R_0P3A6bV1J4S9E_f9s7n_v7O4r2Xn1n_qZ9A3vD4J1W7Qz1oX-o6L7K3j2V' 
        });
        
        if (fcmToken && auth.currentUser) {
          setToken(fcmToken);
          
          // 1. Directly save to Firestore from client-side SDK where the user context has security rule clearance
          try {
            const { doc, updateDoc, db } = await import('../lib/firebase');
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

          return fcmToken;
        }
      }
    } catch (e) {
      console.error('FCM Token registration error:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;

    // Only run registration automatically on mount if permission was already granted.
    // This avoids throwing uncoordinated and blocked permission popups on iOS/Safari page load.
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      registerTokenPrerequisites(false);
    }

    // Set up foreground listener regardless of whether we generated a new token this session
    const setupForegroundListener = async () => {
      try {
        const messagingClient = await getMessagingClient();
        if (messagingClient) {
          unsubscribeForeground = onMessage(messagingClient, (payload) => {
            console.log('FCM Foreground message received:', payload);
            if (payload.notification) {
              notificationService.notify(payload.notification.title || 'FMC Alert', {
                body: payload.notification.body,
                data: payload.data
              });
            }
          });
        }
      } catch (err) {
        console.warn('Foreground message hook registration restricted:', err);
      }
    };
    setupForegroundListener();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [registerTokenPrerequisites]);

  const requestNotificationPermission = useCallback(async () => {
    return await registerTokenPrerequisites(true);
  }, [registerTokenPrerequisites]);

  return { token, permission, requestNotificationPermission };
}
