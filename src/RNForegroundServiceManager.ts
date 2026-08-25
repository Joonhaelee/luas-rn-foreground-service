import { NativeModules, NativeEventEmitter, AppRegistry, Platform } from 'react-native';
import NativeForegroundService from './NativeRNForegroundService';
import type {
    TaskOptions,
    NotificationClickEvent,
    EventListenerCleanup,
    RNNotification,
    TaskRunner,
    ForegroundServiceStateChangeEvent,
    TaskRuntime,
} from './types';
import { generateRandomId, mergeDefaultNotification } from './utils';

/**
 * await sleep()
 */
async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function waitUntil(startTimestamp: number, timeoutMs: number, until: () => boolean) {
    await sleep(30);
    const prove = until();
    if (prove) {
        return true;
    } else {
        if (new Date().getTime() - startTimestamp >= timeoutMs) {
            return false;
        }
        return waitUntil(startTimestamp, timeoutMs, until);
    }
}

export const RNFS_HEADLESS_TASK_KEY = 'rnfs.headless.task.key';

/**
 * post the notification
 * - this method does not related with foreground service. just handle notification itself
 */
export async function postNotification(notif: RNNotification): Promise<string> {
    if (Platform.OS !== 'android') {
        throw new Error('ForegroundService is only supported on Android');
    }
    const noti = notif.id ? notif : { ...notif, id: generateRandomId() };
    await NativeForegroundService.postNotification(noti);
    console.log(`Notification posted`, noti);
    return noti.id!;
}

/**
 * High-level manager for React Native Foreground Service
 */

export class RNForegroundServiceManager {
    private static defaultNotifications?: Record<string, Partial<Omit<RNNotification, 'channelId'>>>;

    public static setDefaults(defaultNotifications?: Record<string, Partial<Omit<RNNotification, 'channelId'>>>) {
        this.defaultNotifications = defaultNotifications;
    }
    private static task: TaskRuntime | undefined;
    public static getTaskRuntime() {
        return this.task;
    }
    // Prevent race conditions
    private static serviceStarting = false;
    private static eventEmitter = new NativeEventEmitter(NativeModules.NativeRNForegroundService);

    /**
     * Register the foreground service task runner     *
     * - MUST be called before start(), typically in your index.js/index.ts entry file.
     * @example
     * ```typescript
     * RNForegroundServiceManager.registerHeadlessTask();
     * AppRegistry.registerComponent('MyApp', () => App);
     * ```
     */
    static registerHeadlessTask(): void {
        AppRegistry.registerHeadlessTask(RNFS_HEADLESS_TASK_KEY, () => this.headlessTaskRunner);
    }

    /**
     * Start the foreground service with a notification
     *
     * @param notif Service and notification configuration
     * @throws Error if POST_NOTIFICATIONS permission is not granted (Android 13+)
     * @throws Error if passed notif invalid. eg) service type is invalid or missing (Android 14+)
     *
     * @example
     * ```typescript
     * await ForegroundService.start({
     *   channelId: 'myChannel',
     *   id: 1,
     *   title: 'My Service',
     *   message: 'Running in background',
     *   serviceType: 'dataSync' // Required for Android 14+
     * });
     * ```
     */

    static async startService(
        runner: TaskRunner,
        taskOptions: TaskOptions,
        notif: RNNotification
    ): Promise<string | undefined> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }

        // Check POST_NOTIFICATIONS permission (Android 13+)
        const hasPermission = await NativeForegroundService.checkPostNotificationsPermission();
        if (!hasPermission) {
            throw new Error(
                'POST_NOTIFICATIONS permission not granted. ' +
                    'Please request this permission before starting the service:\n\n' +
                    'import { PermissionsAndroid, Platform } from "react-native";\n' +
                    'if (Platform.OS === "android" && Platform.Version >= 33) {\n' +
                    '  await PermissionsAndroid.request(\n' +
                    '    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS\n' +
                    '  );\n' +
                    '}'
            );
        }

        // Prevent race condition: Check if already starting
        if (this.serviceStarting) {
            throw new Error('Service is already starting, please try later...');
        }

        // Check native service state to sync with actual state
        if (NativeForegroundService.isRunning()) {
            throw new Error('Foreground service is already running.');
        }

        try {
            this.serviceStarting = true;
            const noti = mergeDefaultNotification(notif, this.defaultNotifications);
            this.task = {
                runner,
                info: {
                    ...taskOptions,
                    startedAt: new Date(),
                    tickCount: 0,
                },
            };
            await NativeForegroundService.startService(noti);
            await NativeForegroundService.runHeadlessTask({
                // must be fixed. must be same with registerHeadlessTask()
                headlessTaskKey: RNFS_HEADLESS_TASK_KEY,
                // native java 에서 사용하는 headless task 반복 interval
                interval: taskOptions.interval,
                firstInterval: taskOptions.firstInterval,
                // js task must be completed in this timeout
                timeout: taskOptions.timeout ?? Math.round(taskOptions.interval * 0.8),
            });

            /* NativeForegroundService.startService() does not update NativeForegroundService.isRunning() immediately
             * since it use broadcast receiver internally.
             * so, here we wait until NativeForegroundService.isRunning() updated to true while 1500ms
             * then NativeForegroundService.isRunning() should return true if service started successfully
             */
            const rt = await waitUntil(Date.now(), 3000, () => NativeForegroundService.isRunning());
            return rt ? noti.id : undefined;
        } finally {
            this.serviceStarting = false;
        }
    }

    /**
     * Update the notification of a running service
     * Then notification will be alerted regardless service is running or not.
     * but if service is not running, notification will not be associated with service!!.
     * therefore, will not be cleared even the service stopped later
     * Foreground service associated with only one primary notification.
     * We can post notification with different ids, but must clear/dismiss it manually
     *
     * @param notif Updated notification configuration
     *
     * @example
     * ```typescript
     * await ForegroundService.updateServiceNotification({
     *   channelId: 'myServiceChannel',
     *   id: 1,
     *   title: 'Download Progress',
     *   message: '50% complete',
     *   progress: { max: 100, curr: 50 }
     * });
     * ```
     */
    static async updateServiceNotification(notif: RNNotification): Promise<string> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }
        const noti = mergeDefaultNotification(notif, this.defaultNotifications);
        await NativeForegroundService.updateServiceNotification(noti);
        return noti.id!;
    }

    /**
     * Stop the foreground service
     *
     * If start() was called multiple times, stop() must be called the same
     * number of times to fully stop the service.
     *
     * @param options Optional configuration
     * @param options.clearTasks Whether to clear all tasks (default: false)
     */
    static async stopService(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }
        if (!NativeForegroundService.isRunning()) {
            throw new Error(`can not stopService(), NativeForegroundService is not running`);
        }
        await NativeForegroundService.stopService();
        this.task = undefined;
        /* NativeForegroundService.stopService() may not update NativeForegroundService.isRunning() immediately
         * so, here we wait until NativeForegroundService.isRunning() updated to false while 1000ms
         * NativeForegroundService.isRunning() should be false if service stopped successfully.
         */

        return await waitUntil(Date.now(), 3000, () => !NativeForegroundService.isRunning());
    }

    /**
     * Check if the foreground service is currently running
     *
     * @returns true if service is running, false otherwise
     */
    static isRunning(): boolean {
        return NativeForegroundService.isRunning();
    }

    /**
     * Cancel a specific notification by ID
     *
     * Useful for dismissing secondary notifications while keeping the service running.
     *
     * @param id Notification ID to cancel
     */
    static async cancelNotification(id: string) {
        if (Platform.OS !== 'android') {
            return;
        }
        await NativeForegroundService.cancelNotification(id);
    }

    /**
     * Cancel all notifications
     */
    static async cancelAllNotifications() {
        if (Platform.OS !== 'android') {
            return;
        }
        await NativeForegroundService.cancelAllNotifications();
    }

    /**
     * Listen for notification click events
     *
     * @param callback Function called when notification or buttons are tapped
     * @returns Cleanup function to remove the listener
     */
    static subscribeServiceStateChange(
        callback: (event: ForegroundServiceStateChangeEvent) => void
    ): EventListenerCleanup {
        const subscription = this.eventEmitter.addListener('onServiceStateChanged', callback);
        return () => subscription.remove();
    }

    static subscribeNotificationOnPressEvent(callback: (event: NotificationClickEvent) => void): EventListenerCleanup {
        const subscription = this.eventEmitter.addListener('onNotificationPress', callback);
        return () => subscription.remove();
    }

    /**
     * Internal task runner - executes tasks at their scheduled times
     * @private
     */
    private static headlessTaskRunner = async (headlessTaskData: any): Promise<void> => {
        try {
            if (!NativeForegroundService.isRunning()) {
                return;
            }
            if (this.task) {
                this.task.info.tickCount = (this.task.info.tickCount ?? 0) + 1;
                await this.task.runner(this.task.info, headlessTaskData);
            }
        } catch (error) {
            console.error('Error while running headless task.', error);
        }
    };
}
