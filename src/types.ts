import type { RNNotificationChannel, RNNotification } from '../specs/NativeRNForegroundService';

export type { RNNotificationChannel, RNNotification, RNSimpleNotif } from '../specs/NativeRNForegroundService';

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
 * Task configuration options
 */
export interface TaskOptions {
    /**
     * Delay before first execution (milliseconds)
     * @default 5000
     */
    delay?: number;

    /**
     * Whether task should repeat
     * @default true
     */
    onLoop?: boolean;

    /**
     * Unique task identifier
     * @default auto-generated
     */
    taskId?: string;
    taskName?: string;
    taskParam?: Record<string, string>;

    /**
     * Callback called when task completes successfully
     */
    onSuccess?: () => void;

    /**
     * Callback called when task encounters an error
     */
    onError?: (error: Error) => void;
}

export type TaskRunInfo = Pick<TaskOptions, 'taskId' | 'taskName' | 'taskParam'> & {
    // task tick count
    tickCount: number;
    // task caller to tell if runner called by foreground service or other process
    caller?: string;
};

export type TaskRunner = (taskInfo: TaskRunInfo) => Promise<void> | void;
/**
 * Internal task representation
 * @internal
 */
export interface Task extends TaskOptions {
    /**
     * Task function to execute
     */
    runner: TaskRunner;
    /**
     * Task run count
     */
    tickCount: number;
    /**
     * Next scheduled execution time (timestamp)
     * @internal
     */
    nextExecutionTime: number;
    /**
     * Actual delay used (rounded to sampling interval)
     * @internal
     */
    delay: number;
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
    id?: number;
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

/**
 * Channel configuration for hooks
 */
export type ChannelNotificationConfig = RNNotificationChannel & {
    defaultNotification?: Partial<Omit<RNNotification, 'channelId'>>;
};
