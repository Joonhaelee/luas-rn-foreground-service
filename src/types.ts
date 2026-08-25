import type { RNNotificationChannel, RNNotification, RNHeadlessTaskConfig } from './NativeRNForegroundService';

export type { RNNotificationChannel, RNNotification, RNBaseNotif } from './NativeRNForegroundService';

/**
 * Service types for Android 14+ foreground services. 'dataSync' | 'location' | 'mediaPlayback';
 * 'location' need additional permissions
 */
export type ServiceType = RNNotification['serviceType'];

/**
 * Channel importance levels
 */
export type NotificationImportance = RNNotificationChannel['importance']; // 'none' | 'min' | 'low' | 'default' | 'high';

/**
 * Notification visibility levels. 'secret' | 'private' | 'public';
 * to popup and show on lock screen, "public" required
 */
export type NotificationVisibility = RNNotification['visibility'];

export type NotificationPriority = RNNotification['priority'];

/**
 * Headless Task configuration options
 */
export interface TaskOptions extends RNHeadlessTaskConfig {
    // taskId, taskName, interval, firstInterval, timeout defined at RNHeadlessTaskConfig
    taskParam?: Record<string, string> | string;
    // task caller to tell if runner called by foreground service or other process
    caller?: string;
}

export interface TaskInfo extends TaskOptions {
    startedAt: Date;
    tickCount: number;
}

export type TaskRunner = (taskInfo: TaskInfo, headlessTaskData?: any) => Promise<void> | void;
/**
 * Internal task representation
 * @internal
 */

export interface TaskRuntime {
    runner: TaskRunner;
    info: TaskInfo;
}

/**
 * Notification click event data
 */
export interface ForegroundServiceStateChangeEvent {
    running?: boolean;
}

/**
 * Notification click event data
 */
export interface NotificationClickEvent {
    /** notification id
     * if you want to clear notification on press callback(), call cancelNotification with id
     */
    id?: string;
    /**
     * the label of pressed
     */
    label?: string;
    /**
     * the value of pressed button.
     * notification.button1Value or notification.button2Value
     * if no values provided, the label will be used
     */
    value?: string;
}

/**
 * Event listener cleanup function
 */
export type EventListenerCleanup = () => void;
