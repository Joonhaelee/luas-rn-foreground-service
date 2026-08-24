import React from 'react';
import { generateRandomNotificationId, RNForegroundServiceManager } from './RNForegroundServiceManager';
import type {
    RNNotification,
    RNBaseNotif,
    NotificationClickEvent,
    ChannelNotificationConfig,
    TaskRunner,
    TaskOptions,
} from './types';

/**
 * hook for easy use of Foreground Service
 *
 * @param channelConfigs Notification channels and default notification properies.\n
 * using this configs, you can simplify updateServiceNotification() params.
 * @returns foreground service state and utility functions
 *
 */
export function useRNForegroundService(channelConfigs?: ChannelNotificationConfig[]) {
    /**
     * state of Foreground Service
     * will be updated if service running state changed.
     */
    const [isRunning, setIsRunning] = React.useState<boolean>(RNForegroundServiceManager.isRunning());
    // event listener to receive service state change event
    React.useEffect(() => {
        return RNForegroundServiceManager.addServiceStateChangeListener((e) => {
            setIsRunning(!!e.running);
            console.log(`RN foreground service state changed to ${!!e.running}`);
        });
    }, []);

    /**
     * add notification onPress callback.
     */
    const subscribeNotificationOnPress = React.useCallback((eventHandler: (e: NotificationClickEvent) => void) => {
        // subscribe and return unsubscribe()
        return RNForegroundServiceManager.subscribeNotificationOnPressEvent(eventHandler);
    }, []);

    /**
     * every notifcation has it own id.
     * if id not provided, hook will generate unique id
     */
    // const notificationSeq = React.useRef<number>(0);

    /**
     * Generate a sequential notification id.
     * @private
     * @returns number. may be unique in every month range
     */
    // const generateNotificationId = React.useCallback(() => {
    //     notificationSeq.current = notificationSeq.current + 1;
    //     const now = new Date();
    //     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    //     // get the total minutes from start of the month
    //     const minutes = Math.floor((now.getTime() - startOfMonth.getTime()) / (1000 * 60));
    //     return minutes + notificationSeq.current;
    // }, []);

    /**
     * Generate a notification object for native side.
     * notitication properies filled with channelConfigs and channelConfigs.defaultNotification,
     * then overwrite with given notification.
     * if notification.id not provided, will be generated
     * @private
     * @returns RNNotification.
     */
    const buildNotification = React.useCallback(
        (notif: RNBaseNotif): RNNotification => {
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
                    id: notif.id ?? channel.defaultNotification?.id ?? generateRandomNotificationId(),
                };
            } else {
                return notif.id !== undefined
                    ? notif
                    : {
                          ...notif,
                          id: generateRandomNotificationId(),
                      };
            }
        },
        [channelConfigs]
    );

    /** Start foreground service
     * before starting service, notification channel must be registered
     */
    const startService = React.useCallback(
        async (runner: TaskRunner, options: TaskOptions, notif: RNNotification): Promise<string | undefined> => {
            const notification = buildNotification(notif);
            const id = await RNForegroundServiceManager.startService(runner, options, notification);
            return id;
        },
        [buildNotification]
    );

    const stopService = React.useCallback(async () => {
        return await RNForegroundServiceManager.stopService(); //  .stopAll();
    }, []);

    /** Update notification which associated with foreground service
     */
    const updateServiceNotification = React.useCallback(
        async (notif: RNNotification): Promise<string> => {
            const notification = buildNotification(notif);
            const id = await RNForegroundServiceManager.updateServiceNotification(notification);
            return id;
        },
        [buildNotification]
    );

    const cancelNotification = React.useCallback(async (id: string) => {
        await RNForegroundServiceManager.cancelNotification(id);
    }, []);

    const cancelAllNotifications = React.useCallback(async () => {
        await RNForegroundServiceManager.cancelAllNotifications();
    }, []);

    return {
        isRunning,
        subscribeNotificationOnPress,
        startService,
        stopService,
        updateServiceNotification,
        cancelNotification,
        cancelAllNotifications,
    };
}
