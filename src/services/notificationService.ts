import { toast } from 'react-hot-toast';

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  public async notify(title: string, options?: NotificationOptions) {
    // 1. Show in-app toast always
    toast(title, {
      icon: '🔔',
      duration: 4000,
      position: 'top-center',
    });

    // 2. Show browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && this.permission === 'granted') {
      try {
        const notificationOptions: any = {
          icon: '/pwa-512x512.png',
          badge: '/pwa-512x512.png',
          // Strong vibrating wake-up sequence for phone sleep states [vib, gap, vib, gap, ...]
          vibrate: [300, 110, 300, 110, 450, 110, 600],
          tag: 'fmc-notification-urgent',
          renotify: true,
          // requireInteraction prevents the notification from disappearing on Android/iOS sleep screens
          requireInteraction: true,
          ...options
        };

        // Prefer service worker for better mobile support
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, notificationOptions);
        } else {
          // Fallback to legacy Notification API
          const n = new Notification(title, notificationOptions);
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      } catch (err) {
        console.error('Failed to show browser notification', err);
      }
    }
  }

  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export const notificationService = NotificationService.getInstance();
