import { NativeModules, NativeEventEmitter, AppRegistry, Platform } from 'react-native';
import NativeForegroundService from '../specs/NativeRNForegroundService';
import type {
    Task,
    TaskOptions,
    NotificationClickEvent,
    EventListenerCleanup,
    RNNotificationChannel,
    RNNotification,
    TaskRunner,
    ForegroundServiceStateChangeEvent,
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
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(start: Date, timeoutMs: number, until: () => boolean) {
    await sleep(30);
    const prove = until();
    if (prove) {
        return true;
    } else {
        if (new Date().getTime() - start.getTime() >= timeoutMs) {
            return false;
        }
        return waitUntil(start, timeoutMs, until);
    }
}

export class RNForegroundServiceManager {
    public static debug: boolean = true;
    public static readonly headlessTaskName = 'RNForegroundServiceHeadlessTask';
    private static tasks: Task[] = [];
    // Prevent race conditions
    private static serviceStarting = false;
    // headless task loop interval(ms) should be 500 or 1000. this is different than task interval
    private static samplingInterval = 1000;
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
            AppRegistry.registerHeadlessTask(this.headlessTaskName, () => this.headlessTaskRunner);
        }
    }

    /** validate if passed notification. will throw error if not valid */
    private static validateNotification(notif: RNNotification, forService?: boolean) {
        if (notif.id === undefined) {
            throw new Error('Notification invalid. id must be set');
        }
        if (forService && !notif.serviceType) {
            throw new Error('Service notification invalid. serviceType must be set');
        }
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

    static async startService(notif: RNNotification): Promise<number | undefined> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }
        this.validateNotification(notif, true);

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
            await NativeForegroundService.startService(notif);

            /* Start headless task runner
             * android looper repeated on every samplingInterval(1s)
             * then, on headlessTaskRunner(), it will apply task interval
             */
            await NativeForegroundService.runHeadlessTask({
                taskName: this.headlessTaskName,
                // onetime task 에 사용되는 delay
                delay: this.samplingInterval,
                // repeatable task 에 사용되는 delay
                loopDelay: this.samplingInterval,
                onLoop: true,
            });

            /* NativeForegroundService.startService() does not update NativeForegroundService.isRunning() immediately
             * since it use broadcast receiver internally.
             * so, here we wait until NativeForegroundService.isRunning() updated to true while 1500ms
             * then NativeForegroundService.isRunning() should return true if service started successfully
             */
            const rt = await waitUntil(new Date(), 1500, () => NativeForegroundService.isRunning());
            if (!rt) {
                console.log(`startService() done. but awaited NativeForegroundService.isRunning()=false`);
                return undefined;
            }
            if (this.debug) {
                console.log(`Foreground service started. NativeForegroundService.isRunning()=${rt}`, notif);
            }
            return notif.id as number;
        } finally {
            this.serviceStarting = false;
        }
    }

    /**
     * Update the notification of a running service
     * Then notification will be alerted regardless service is running or not.
     * but if service is not running, notification will not be associated with service!!.
     * therefore, will not be cleared even the service stopped later
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
    static async updateServiceNotification(notif: RNNotification): Promise<number> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }
        this.validateNotification(notif, true);
        await NativeForegroundService.postNotification(notif);
        if (this.debug) {
            console.log(`Foreground service notification updated`, notif);
        }
        return notif.id as number;
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
    static async postNotification(notif: RNNotification): Promise<number> {
        if (Platform.OS !== 'android') {
            throw new Error('ForegroundService is only supported on Android');
        }
        this.validateNotification(notif);
        await NativeForegroundService.postNotification(notif);
        if (this.debug) {
            console.log(`Notification posted`, notif);
        }
        return notif.id as number;
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
            console.warn(`can not stopService(), NativeForegroundService is not running`);
            return true;
        }
        const stopped = NativeForegroundService.stopService();
        this.tasks = [];
        /* NativeForegroundService.stopService() may not update NativeForegroundService.isRunning() immediately
         * so, here we wait until NativeForegroundService.isRunning() updated to false while 1000ms
         * NativeForegroundService.isRunning() should be false if service stopped successfully.
         */
        if (stopped) {
            const rt = await waitUntil(new Date(), 1000, () => !NativeForegroundService.isRunning());
            if (!rt) {
                console.warn(`stopService() done. but awaited NativeForegroundService.isRunning() is still true`);
            } else if (this.debug) {
                console.log(`Foreground service stopped. NativeForegroundService.isRunning()=${rt}`);
            }
        }
        return stopped;
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
    static async cancelNotification(id: number) {
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

    static addNotificationPressEventListener(callback: (event: NotificationClickEvent) => void): EventListenerCleanup {
        const subscription = this.eventEmitter.addListener('onNotificationPress', callback);
        return () => subscription.remove();
    }

    /**
     * Internal task runner - executes tasks at their scheduled times
     * @private
     */
    private static headlessTaskRunner = async (): Promise<void> => {
        try {
            if (!NativeForegroundService.isRunning()) {
                return;
            }
            const now = Date.now();
            const promises: Promise<void>[] = [];
            this.tasks = this.tasks
                .map((task) => {
                    if (now >= task.nextExecutionTime) {
                        task.tickCount = task.tickCount + 1;
                        promises.push(
                            Promise.resolve(task.runner(task))
                                .then(() => task.onSuccess?.())
                                .catch((error) => task.onError?.(error))
                        );
                        if (task.repeat) {
                            task.nextExecutionTime = now + task.interval;
                            return task;
                        } else {
                            return undefined;
                        }
                    } else {
                        return task;
                    }
                })
                .filter(Boolean) as Task[];

            await Promise.all(promises);
        } catch (error) {
            console.error('Error in ForegroundService taskRunner:', error);
        }
    };

    /**
     * Add a task to the execution queue
     *
     * @param runner Function to execute (can be async)
     * @param options Task configuration options
     * @returns Task ID string for managing the task
     *
     * @example
     * ```typescript
     * const taskId = ForegroundService.add_task(
     *   async () => {
     *     const data = await fetchData();
     *     processData(data);
     *   },
     *   {
     *     delay: 5000,      // Run every 5 seconds
     *     onLoop: true,     // Repeat indefinitely
     *     taskId: 'my-task',
     *     onError: (error) => console.error('Task failed:', error)
     *   }
     * );
     * ```
     */
    static addTask(runner: TaskRunner, options: TaskOptions = {}): string {
        if (!NativeForegroundService.isRunning()) {
            throw new Error('task can not be added. service is not running');
        }
        const task: Task = {
            ...options,
            runner,
            interval: Math.ceil((options.interval || 10000) / this.samplingInterval) * this.samplingInterval,
            repeat: options.repeat ?? true,
            taskId: options.taskId || this.generateTaskId(),
            startedAt: new Date(),
            tickCount: 0,
            nextExecutionTime: Date.now(),
            caller: options.caller ?? 'service',
        };
        if (this.tasks.find((t) => t.taskId === task.taskId) === undefined) {
            this.tasks = [task, ...this.tasks];
            if (this.debug) {
                console.log(`task added.`, task);
            }
        } else {
            console.log(`can not add task. same taskId "${task.taskId}" already exist.`);
        }
        return task.taskId as string;
    }

    /**
     * Update an existing task
     *
     * @param runner Updated task function
     * @param options Task configuration options (must include taskId)
     * @returns Task ID string
     */
    static updateTask(runner: TaskRunner, options: TaskOptions & { taskId: string }) {
        let found = false;
        this.tasks = this.tasks.map((task) => {
            if (task.taskId === options.taskId) {
                found = true;
                const interval = options.interval ?? task.interval ?? 10000;
                const repeat = options.repeat ?? task.repeat ?? true;
                if (this.debug) {
                    console.log(`task updated. taskId=${options.taskId}, interval=${interval}, onLoop=${repeat}`);
                }
                return {
                    ...task,
                    runner,
                    interval: Math.ceil(interval / this.samplingInterval) * this.samplingInterval,
                    repeat,
                    taskParam: options.taskParam ?? task.taskParam,
                    onSuccess: options.onSuccess ?? task.onSuccess,
                    onError: options.onError ?? task.onError,
                    nextExecutionTime: Date.now(),
                };
            } else {
                return task;
            }
        });
        if (!found) {
            console.log(`can not update task. taskId=${options.taskId} not found`);
        }
    }

    /**
     * Remove a task from the execution queue
     *
     * @param taskId Task ID to remove
     */
    static removeTask(taskId: string) {
        this.tasks = this.tasks.filter((t) => t.taskId !== taskId);
    }

    /**
     * Check if a task is currently in the queue
     *
     * @param taskId Task ID to check
     * @returns true if task exists, false otherwise
     */
    static isTaskRunning(taskId: string): boolean {
        return this.tasks.find((t) => t.taskId === taskId) !== undefined;
    }

    /**
     * Remove all tasks from the execution queue
     */
    static removeAllTasks(): void {
        this.tasks = [];
        if (this.debug) {
            console.log(`all tasks cleared`);
        }
    }

    /**
     * Get a task by ID
     *
     * @param taskId Task ID
     * @returns Task object or undefined if not found
     */
    static getTask(taskId: string): Task | undefined {
        return this.tasks.find((t) => t.taskId === taskId);
    }

    /**
     * Get all tasks in the execution queue
     *
     * @returns Object containing all tasks
     */
    static getAllTasks(): Task[] {
        return this.tasks;
    }

    /**
     * Generate a random task ID
     * @private
     */
    private static generateTaskId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 9);
        return `task_${timestamp}_${randomPart}`;
    }
}
