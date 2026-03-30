import type { ChannelNotificationConfig } from 'luas-rn-foreground-service';

export const serviceNotificationChannel: ChannelNotificationConfig = {
    channelId: 'foregroundService',
    channelName: 'ForegroundService',
    channelDescription: 'ForegroundService description',
    defaultNotification: {
        id: 9876,
        serviceType: 'dataSync',
        icon: 'notification_icon',
    },
};

export const miscNotificationChannel: ChannelNotificationConfig = {
    channelId: 'misc',
    channelName: 'Misc',
    channelDescription: 'Misc description',
    defaultNotification: {
        icon: 'notification_icon',
    },
};

export const notificationChannels: ChannelNotificationConfig[] = [serviceNotificationChannel, miscNotificationChannel];
