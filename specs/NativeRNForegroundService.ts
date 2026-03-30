import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface RNSimpleNotif {
    /** notification unique id
     * To post notification with ForegroundServiceManager.postNotification() or \n
     * ForegroundServiceManager.updateServiceNotification(), you MUST provided id on each notification.\n
     * If you use the useRNNotification hook, \n
     * you can set the unique id on hook parameter - channelConfigs.\n
     * or if    hookTo make it simif same id provided, the previous notification will be replaced by new one
     *
     */
    id?: number;
    channelId: string;
    title: string;
    /**
     * notification body(message)
     * if notification NOT expanded(default head up)\
     * - title and message will be shown. longMessage will NOT be shown\n
     * if notification expanded(pressed right chevron down)
     * - if longMessage provided, title and longMessage will be shown and message will NOT be shown
     * - if longMessage NOT provided, title and message will be shown
     */
    body: string;
    /**
     * notification long message.
     * if message is long
     * - title and message will be shown. longMessage will NOT be shown\n
     * if notification expanded(pressed right chevron down)
     * - if longMessage provided, title and longMessage will be shown and message will NOT be shown
     * - if longMessage NOT provided, title and message will be shown
     */
    longBody?: string;
}
export interface RNNotificationChannel {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    /**
     * Enable vibration for notification
     * @default true
     */
    vibration?: boolean;
    /**
     * Notification importance level
     * @default 'high'
     */
    importance?: 'none' | 'min' | 'low' | 'default' | 'high';
    /**
     * @default true
     */
    lights?: boolean;
    /**
     * @default true
     */
    showBadge?: boolean;
    /**
     * @default true
     */
    sound?: boolean;
}

/**
 * Notification configuration for foreground service
 */
export interface RNNotification extends RNSimpleNotif {
    // channelId, id, title, message came from SimpleNotif

    /**
     * Notification priority
     * channel.importance is applied with high priority.
     * if notification priority is lower than channel.importance, this will be applied
     * @default 'max'
     */
    priority?: 'default' | 'min' | 'low' | 'high' | 'max';
    /**
     * Channel, Notification visibility levels.
     * to popup and show on lock screen, "public" required
     * @default 'public'
     */
    visibility?: 'secret' | 'private' | 'public';
    /** icon for statusbar */
    icon?: string;
    /** icon for right side of notification */
    largeIcon?: string;
    badge?: number;
    button1?: {
        label: string;
        value?: string;
    };
    button2?: {
        label: string;
        value?: string;
    };
    progress?: {
        max: number;
        curr: number;
    };
    /**
     * user defined button1 label
     */
    button1Label?: string;
    /**
     * user defined button1 value
     */
    button1Value?: string;
    /**
     * user defined button2 label
     */
    button2Label?: string;
    /**
     * user defined button2 value
     */
    button2Value?: string;
    /**
     * to show progress, progressBarMax must > 0
     */
    progressBarMax?: number;
    progressBarCurr?: number;
    color?: string;
    /**
     * if true, successive notification which has same id will NOT be altered
     * @default false
     */
    setOnlyAlertOnce?: boolean;
    /** on new android version,
     * (bug?)left swipe out will close notification even you set ongoing to true
     * @default false
     */
    ongoing?: boolean;
    /** to make it work, notificationBuilder.contentIntent should be set properly
     * @default false
     */
    autoCancel?: boolean;

    /**
     * Service type for Android 14+ (API 34+)
     * Required for Android 14 and above
     * @default 'dataSync'
     */
    serviceType?: 'dataSync' | 'location' | 'mediaPlayback';
}

export interface RNTaskConfig {
    taskName: string;
    delay: number;
    loopDelay?: number;
    onLoop?: boolean;
    /**
     * Task timeout in milliseconds
     * @default 60000 (60 seconds)
     */
    timeout?: number;
}

/**
 * Native Foreground Service TurboModule Specification
 *
 * This module provides Android foreground service capabilities with:
 * - Persistent notification management
 * - Headless task execution
 * - Android 13+ POST_NOTIFICATIONS permission handling
 * - Android 14+ foreground service type support
 */
export interface Spec extends TurboModule {
    /**
     * Start the foreground service with a notification
     *
     * @param config Notification configuration
     * @returns Promise that resolves when service starts successfully
     * @throws Error if configuration is invalid or permissions are missing
     *
     * @example
     * ```typescript
     * await ForegroundService.startService({
     *   id: 1,
     *   title: 'My Service',
     *   message: 'Running...',
     *   serviceType: 'dataSync' // Required for Android 14+
     * });
     * ```
     */

    getNotificationChannels(channelId?: string): Promise<RNNotificationChannel[]>;
    createNotificationChannel(config: RNNotificationChannel): Promise<void>;
    deleteNotificationChannel(channelId: string): Promise<void>;
    notificationChannelExist(channelId: string): Promise<boolean>;

    /**
     * Start the foreground service with a notification
     *
     * @param config Notification configuration
     * @returns Promise that resolves when service starts successfully
     * @throws Error if configuration is invalid or permissions are missing
     *
     * @example
     * ```typescript
     * await ForegroundService.startService({
     *   id: 1,
     *   title: 'My Service',
     *   message: 'Running...',
     *   serviceType: 'dataSync' // Required for Android 14+
     * });
     * ```
     */
    startService(config: RNNotification): Promise<void>;

    /**
     * Stop the foreground service (decrements internal counter)
     *
     * @returns Promise that resolves when service stops
     *
     * @note If start() was called multiple times, stop() must be called
     * the same number of times to fully stop the service
     */
    stopService(): boolean;

    /**
     * Update the notification of a running service
     *
     * @param config Updated notification configuration
     * @returns Promise that resolves when notification is updated
     * @throws Error if service is not running
     *
     * @example
     * ```typescript
     * await ForegroundService.updateNotification({
     *   id: 1,
     *   title: 'Updated Title',
     *   message: 'Progress: 50%',
     *   progressBar: true,
     *   progressBarMax: 100,
     *   progressBarCurr: 50
     * });
     * ```
     */
    updateServiceNotification(config: RNNotification): Promise<void>;

    // /**
    //  * Force stop the foreground service regardless of start counter
    //  *
    //  * @returns Promise that resolves when service is forcefully stopped
    //  */
    // stopServiceAll(): Promise<void>;

    /**
     * post local notification
     *
     * @returns Promise that resolves when service is forcefully stopped
     */
    postNotification(config: RNNotification): Promise<void>;

    /**
     * Check if the foreground service is currently running
     *
     * @returns Promise that resolves to the number of active service instances
     */
    isRunning(): boolean;

    /**
     * Run a headless task in the background
     *
     * @param config Task configuration
     * @returns Promise that resolves when task is queued
     *
     * @note Tasks registered via AppRegistry.registerHeadlessTask must be
     * registered before calling this method
     */
    runHeadlessTask(config: RNTaskConfig): Promise<void>;

    /**
     * Cancel a specific notification by ID
     *
     * @param id Notification ID to cancel
     * @returns Promise that resolves when notification is cancelled
     *
     * @note Useful for dismissing secondary notifications while keeping
     * the foreground service running
     */
    cancelNotification(id: number): Promise<void>;
    cancelAllNotifications(): Promise<void>;

    /**
     * Check if POST_NOTIFICATIONS permission is granted (Android 13+)
     *
     * @returns Promise that resolves to true if permission is granted,
     * false otherwise. Always returns true for Android < 13
     *
     * @example
     * ```typescript
     * const hasPermission = await ForegroundService.checkPostNotificationsPermission();
     * if (!hasPermission) {
     *   // Request permission from user
     *   await PermissionsAndroid.request(
     *     PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
     *   );
     * }
     * ```
     */
    checkPostNotificationsPermission(): Promise<boolean>;

    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeRNForegroundService');
