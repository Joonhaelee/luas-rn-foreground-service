import type { RNNotification, RNNotificationChannel } from '@luas/rn-foreground-service';

export const serviceNotificationChannel: RNNotificationChannel = {
    channelId: 'foregroundService',
    channelName: 'ForegroundService',
    channelDescription: 'ForegroundService description',
};

export const miscNotificationChannel: RNNotificationChannel = {
    channelId: 'misc',
    channelName: 'Misc',
    channelDescription: 'Misc description',
};

export const defaultNotifications: Record<string, Partial<Omit<RNNotification, 'channelId'>>> = {
    foregroundService: {
        id: 'rnfs.notification.id',
        serviceType: 'location',
        icon: 'notification_icon',
    },
    misc: {
        icon: 'notification_icon',
    },
};

export const notificationChannels: RNNotificationChannel[] = [serviceNotificationChannel, miscNotificationChannel];
