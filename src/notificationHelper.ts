import NativeForegroundService from './NativeRNForegroundService';
import { postNotification as nativePostNotification } from './RNForegroundServiceManager';
import { RNForegroundServiceManager } from './RNForegroundServiceManager';
import type { RNNotification, NotificationClickEvent } from './types';
import { mergeDefaultNotification } from './utils';

export const notificationHelper = {
    postNotification: async (
        notif: RNNotification,
        defaultNotifications?: Record<string, Partial<Omit<RNNotification, 'channelId'>>>
    ): Promise<string> => {
        const notification = mergeDefaultNotification(notif, defaultNotifications);
        return await nativePostNotification(notification);
    },
    cancelNotification: async (id: string) => {
        await NativeForegroundService.cancelNotification(id);
    },
    cancelAllNotifications: async () => {
        await NativeForegroundService.cancelAllNotifications();
    },
    subscribeNotificationOnPress: (eventHandler: (e: NotificationClickEvent) => void) => {
        // subscribe and return unsubscribe()
        return RNForegroundServiceManager.subscribeNotificationOnPressEvent(eventHandler);
    },
};

// export function useRNNotification(
//     channelConfigs?: RNNotificationChannel[],
//     defaultNotifications?: Record<string, Partial<Omit<RNNotification, 'channelId'>>>
// ) {
//     const subscribeNotificationOnPress = React.useCallback((eventHandler: (e: NotificationClickEvent) => void) => {
//         // subscribe and return unsubscribe()
//         return RNForegroundServiceManager.subscribeNotificationOnPressEvent(eventHandler);
//     }, []);

//     const mergeDefaultNotification = React.useCallback(
//         (notif: RNBaseNotif): RNNotification => {
//             if (channelConfigs?.length) {
//                 const channel = channelConfigs.find((ch) => ch.channelId === notif.channelId);
//                 if (!channel) {
//                     throw new Error(
//                         `Notification channel id should be one of ${channelConfigs.map((ch) => ch.channelId).join(',')}`
//                     );
//                 }
//                 const def = defaultNotifications?.[channel.channelId];
//                 return {
//                     ...def,
//                     ...notif,
//                     id: notif.id ?? def?.id,
//                 };
//             } else {
//                 return notif;
//             }
//         },
//         [channelConfigs, defaultNotifications]
//     );

//     // for non-foreground service notification
//     const postNotification = React.useCallback(
//         async (notif: RNNotification): Promise<string> => {
//             const notification = mergeDefaultNotification(notif);
//             return await nativePostNotification(notification);
//         },
//         [mergeDefaultNotification]
//     );

//     const cancelNotification = React.useCallback(async (id: string) => {
//         await RNForegroundServiceManager.cancelNotification(id);
//     }, []);

//     const cancelAllNotifications = React.useCallback(async () => {
//         await RNForegroundServiceManager.cancelAllNotifications();
//     }, []);

//     return {
//         subscribeNotificationOnPress,
//         postNotification,
//         cancelNotification,
//         cancelAllNotifications,
//     };
// }
