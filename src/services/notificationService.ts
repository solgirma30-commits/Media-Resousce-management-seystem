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

  public notify(title: string, options?: NotificationOptions) {
    // 1. Show in-app toast always
    toast(title, {
      icon: '🔔',
      duration: 4000,
      position: 'top-center',
    });

    // 2. Show browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && this.permission === 'granted') {
      try {
        const n = new Notification(title, {
          icon: '/logo192.png', // Fallback icon path
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          ...options
        });

        n.onclick = () => {
          window.focus();
          n.close();
        };
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
