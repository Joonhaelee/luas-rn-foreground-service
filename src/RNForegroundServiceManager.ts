import { NativeModules, NativeEventEmitter, AppRegistry, Platform } from 'react-native';
import NativeForegroundService from './NativeRNForegroundService';
import type {
    TaskOptions,
    NotificationClickEvent,
    EventListenerCleanup,
    RNNotificationChannel,
    RNNotification,
    TaskRunner,
    ForegroundServiceStateChangeEvent,
    TaskInfo,
    TaskRuntime,
} from './types';

/**
 * High-level manager for React Native Foreground Service
 *
 * Provides a simple, developer-friendly API for managing foreground services
 * with task management, notification customization, and event handling.
 *
 * Features:
 * - Task management system with parallel execution
 * - 500ms sampling interval for efficient task scheduling
 * - Android 13+ POST_NOTIFICATIONS permission checking
 * - Android 14+ service type validation
 * - Event handling for notification interactions
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

export const DEF_FOREGROUND_SERVICE_NOTIF_ID = 'rnfs.notification.id';
export const RNFS_HEADLESS_TASK_KEY = 'RNForegroundServiceHeadlessTask';

const CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateRandomNotificationId(): string {
    let newId = '';
    for (let i = 0; i < 20; i++) {
        newId += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }
    return newId;
}

/** validate if passed notification. will throw error if not valid */
function isServiceNotification(notif: RNNotification): notif is Omit<RNNotification, 'id'> & { id: string } {
    return Boolean(notif.id && notif.serviceType);
}

export class RNForegroundServiceManager {
    public static debug: boolean = true;
    private static task: TaskRuntime | undefined;
    // Prevent race conditions
    private static serviceStarting = false;
    // headless task loop interval(ms) should be 500 or 1000. this is different than task interval
    // private static samplingInterval = 1000;
    private static eventEmitter = new NativeEventEmitter(NativeModules.NativeRNForegroundService);

    /** get, create, delete, check notification channel */
    static async getNotificationChannels(channelId?: string) {
        return await NativeForegroundService.getNotificationChannels(channelId);
    }

    static async createNotificationChannel(config: RNNotificationChannel) {
        await NativeForegroundService.createNotificationChannel(config);
        if (this.debug) {
            console.log('notifcation channel created', config);
        }
    }
    static async deleteNotificationChannel(channelId: string) {
        await NativeForegroundService.deleteNotificationChannel(channelId);
        if (this.debug) {
            console.log(`notifcation channel deleted. channelId=${channelId}`);
        }
    }
    static async notificationChannelExist(channelId: string) {
        return await NativeForegroundService.notificationChannelExist(channelId);
    }
    /**
     * Register the foreground service task runner
     *
     * MUST be called before start(), typically in your index.js/index.ts entry file.
     *
     * @example
     * ```typescript
     * // index.ts
     * import { RNForegroundServiceManager } from '@luas/rn-foreground-service';
     * import { AppRegistry } from 'react-native';
     * import App from './App';
     *
     * RNForegroundServiceManager.registerHeadlessTask();
     * AppRegistry.registerComponent('MyApp', () => App);
     * ```
     */
    static registerHeadlessTask(): void {
        if (!NativeForegroundService.isRunning()) {
            AppRegistry.registerHeadlessTask(RNFS_HEADLESS_TASK_KEY, () => this.headlessTaskRunner);
        }
    }

    /** validate if passed notification. will throw error if not valid */
    // private static validateNotification(notif: RNNotification, forService?: boolean) {
    //     if (notif.id === undefined) {
    //         throw new Error('Notification invalid. id must be set');
    //     }
    //     if (forService && !notif.serviceType) {
    //         throw new Error('Service notification invalid. serviceType must be set');
    //     }
    // }

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
        // if (!isServiceNotification(notif)) {

        // }
        // this.validateNotification(notif, true);

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
            if (this.debug) {
                console.log('Service is already starting, please wait...');
            }
            return undefined;
        }

        // Check native service state to sync with actual state
        if (NativeForegroundService.isRunning()) {
            if (this.debug) {
                console.log('Foreground service is already running.');
            }
            // fixme
            // return undefined;
        }

        try {
            this.serviceStarting = true;
            const noti = notif.id ? notif : { ...notif, id: DEF_FOREGROUND_SERVICE_NOTIF_ID };
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
            if (!rt) {
                console.log(`startService() done. but awaited NativeForegroundService.isRunning()=false`);
                return undefined;
            }
            if (this.debug) {
                console.log(`Foreground service started. NativeForegroundService.isRunning()=${rt}`, noti);
            }
            return noti.id;
        } finally {
            this.serviceStarting = false;
        }
    }

    // static async runAssociatedHeadlessTask() {
    //     /* Start headless task runner
    //      * android looper repeated on every samplingInterval(1s)
    //      * then, on headlessTaskRunner(), it will apply task interval
    //      */
    //     await NativeForegroundService.runHeadlessTask({
    //         taskName: this.headlessTaskName,
    //         // onetime task 에 사용되는 delay
    //         delay: this.samplingInterval,
    //         // repeatable task 에 사용되는 delay
    //         loopDelay: this.samplingInterval,
    //         onLoop: true,
    //     });
    // }

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
        const noti = notif.id ? notif : { ...notif, id: DEF_FOREGROUND_SERVICE_NOTIF_ID };
        // this.validateNotification(notif, true);
        await NativeForegroundService.updateServiceNotification(noti);
        if (this.debug) {
            console.log(`Foreground service notification updated`, noti);
        }
        return noti.id!;
    }

    /**
     * post the notification
     * this method does not related with foreground service.
     * just handle notification itself
     *
     * @param notif posted notification
     *
     * @example
     * ```typescript
     * await ForegroundService.postNotification({
     *   channelId: 'myChannel',
     *   id: 1,
     *   title: 'Download Progress',
     *   message: '50% complete',
     *   progress: { max: 100, curr: 50 }
     * });
     * ```
     */
    static async postNotification(notif: RNNotification): Promise<string> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }
        // this.validateNotification(notif);
        const noti = notif.id ? notif : { ...notif, id: generateRandomNotificationId() };
        await NativeForegroundService.postNotification(noti);
        if (this.debug) {
            console.log(`Notification posted`, noti);
        }
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
            console.info(`can not stopService(), NativeForegroundService is not running`);
            return true;
        }
        await NativeForegroundService.stopService();
        this.task = undefined;
        /* NativeForegroundService.stopService() may not update NativeForegroundService.isRunning() immediately
         * so, here we wait until NativeForegroundService.isRunning() updated to false while 1000ms
         * NativeForegroundService.isRunning() should be false if service stopped successfully.
         */

        const rt = await waitUntil(Date.now(), 3000, () => !NativeForegroundService.isRunning());
        if (!rt) {
            console.warn(`stopService() done. but awaited NativeForegroundService.isRunning() is still true`);
        } else if (this.debug) {
            console.log(
                `Foreground service stopped. NativeForegroundService.isRunning()=${NativeForegroundService.isRunning()}`
            );
        }
        return true;
    }

    /**
     * Force stop the foreground service regardless of start counter
     *
     * This will also clear all tasks and reset state
     */
    // static async stopAll(): Promise<void> {
    //     if (Platform.OS !== 'android') {
    //         return;
    //     }
    //     await NativeForegroundService.stopServiceAll();
    //     this.serviceStarting = false;
    //     // Clear all tasks immediately
    //     this.tasks = {};
    //     if (this.debug) {
    //         console.log('Service force stopped and all tasks cleared');
    //     }
    // }

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
        if (this.debug) {
            console.log(`notification "${id}" cancelled`);
        }
    }

    /**
     * Cancel all notifications
     */
    static async cancelAllNotifications() {
        if (Platform.OS !== 'android') {
            return;
        }
        await NativeForegroundService.cancelAllNotifications();
        if (this.debug) {
            console.log(`all notifications cancelled`);
        }
    }

    /**
     * Listen for notification click events
     *
     * @param callback Function called when notification or buttons are tapped
     * @returns Cleanup function to remove the listener
     *
     * @example
     * ```typescript
     * useEffect(() => {
     *   const cleanup = ForegroundService.eventListener((event) => {
     *     if (event.main) {
     *       // Main notification tapped
     *       navigation.navigate('Home');
     *     }
     *     if (event.button === 'pause') {
     *       // Pause button tapped
     *       handlePause();
     *     }
     *   });
     *
     *   return cleanup; // Cleanup on unmount
     * }, []);
     * ```
     */
    static addServiceStateChangeListener(
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
    private static headlessTaskRunner = async (taskData: any): Promise<void> => {
        try {
            console.log('starting js headlessTaskRunner() tick', taskData);
            if (!NativeForegroundService.isRunning()) {
                return;
            }
            if (!this.task) {
                console.log('no js tasks found');
                return;
            }
            this.task.info.tickCount = (this.task.info.tickCount ?? 0) + 1;
            await this.task.runner(this.task.info);
        } catch (error) {
            console.error('Error in ForegroundService taskRunner:', error);
        }
    };

    /**
     * Generate a random task ID
     * @private
     */
    private static generateTaskId(): string {
        return generateRandomNotificationId();
    }
}
