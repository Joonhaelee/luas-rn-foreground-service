import React from 'react';
import { RNForegroundServiceManager } from './RNForegroundServiceManager';
import type { RNNotification, RNSimpleNotif, NotificationClickEvent, ChannelNotificationConfig } from './types';

export function useRNNotification(channelConfigs?: ChannelNotificationConfig[]) {
    const addOnNotificationPress = React.useCallback((eventHandler: (e: NotificationClickEvent) => void) => {
        // subscribe and return unsubscribe()
        return RNForegroundServiceManager.addNotificationPressEventListener(eventHandler);
    }, []);

    const notificationSeq = React.useRef<number>(0);

    /**
     * Generate a sequential notification id.
     * the same notification id will replace the previous one.
     * @private
     * @returns number. may be unique in every month
     */
    const generateNotificationId = React.useCallback(() => {
        notificationSeq.current = notificationSeq.current + 1;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // get the total minutes from start of the month
        const minutes = Math.floor((now.getTime() - startOfMonth.getTime()) / (1000 * 60));
        return minutes + notificationSeq.current;
    }, []);

    const buildNotification = React.useCallback(
        (notif: RNSimpleNotif): RNNotification => {
            if (channelConfigs?.length) {
                const channel = channelConfigs.find((ch) => ch.channelId === notif.channelId);
                if (!channel) {
                    throw new Error(
                        `Notification channel id should be one of ${channelConfigs.map((ch) => ch.channelId).join(',')}`
                    );
                }
                return {
                    ...channel.defaultNotification,
                    ...notif,
                    id: notif.id ?? channel.defaultNotification?.id ?? generateNotificationId(),
                };
            } else {
                return notif.id !== undefined
                    ? notif
                    : {
                          ...notif,
                          id: generateNotificationId(),
                      };
            }
        },
        [channelConfigs, generateNotificationId]
    );

    // for non-foreground service notification
    const postNotification = React.useCallback(
        async (notif: RNNotification): Promise<number> => {
            const notification = buildNotification(notif);
            const id = await RNForegroundServiceManager.postNotification(notification);
            return id;
        },
        [buildNotification]
    );

    const cancelNotification = React.useCallback(async (id: number) => {
        await RNForegroundServiceManager.cancelNotification(id);
    }, []);

    const cancelAllNotifications = React.useCallback(async () => {
        await RNForegroundServiceManager.cancelAllNotifications();
    }, []);

    return {
        addOnNotificationPress,
        postNotification,
        cancelNotification,
        cancelAllNotifications,
    };
}
