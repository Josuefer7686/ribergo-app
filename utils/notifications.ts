/**
 * RIBERGO NATIVE & IN-APP NOTIFICATION HELPER
 * Manages browser Notification.requestPermission() and native OS notifications.
 */

export const notifications = {
  /**
   * Check if Notification API is supported in current browser/device
   */
  isSupported: (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  /**
   * Get current notification permission status ('granted' | 'denied' | 'default')
   */
  getPermission: (): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Request native system notification permission
   */
  requestPermission: async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Error solicitando permiso de notificaciones:', e);
      return false;
    }
  },

  /**
   * Send a native browser system notification
   */
  sendNativeNotification: (title: string, body: string, icon?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'ribergo-message',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Notice: Native notification trigger fallback:', e);
      }
    }
  },
};
