import type { RNNotification, RNNotificationChannel } from './types';

const CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateRandomId(length: number = 20): string {
    let newId = '';
    for (let i = 0; i < length; i++) {
        newId += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }
    return newId;
}

export function mergeDefaultNotification(
    notif: RNNotification,
    defaultNotifications?: Record<string, Partial<Omit<RNNotification, 'channelId'>>>
): RNNotification {
    const def = defaultNotifications?.[notif.channelId];
    return def
        ? {
              ...def,
              ...notif,
          }
        : notif;
}
