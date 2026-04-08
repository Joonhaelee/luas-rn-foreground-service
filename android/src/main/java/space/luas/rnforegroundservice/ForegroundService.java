package space.luas.rnforegroundservice;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Objects;

/**
 * Main foreground service implementation with Android 14 support
 * In Android development, a foreground service naturally behaves as a singleton
 * within a single application process; the system ensures only one instance of a given service class
 * runs at a time. Therefore, you don't typically need to implement a separate singleton pattern for the service itself.
 *
 * Features:
 * - Singleton pattern for easy access
 * - Internal start counter for multiple start/stop calls
 * - Android 14+ foreground service type handling
 * - Headless task execution support
 * - Proper lifecycle management and cleanup
 */
public class ForegroundService extends Service {

    private static final String TAG = "ForegroundService";
    private static boolean isRunning = false;
    public static boolean getIsRunning() { return isRunning; }
    private Handler handler;
    private Context context;
    private Runnable runnableCode;
    private Bundle taskConfig;

    @Override
    public void onCreate() {
        super.onCreate();
        context = this;
        handler = new Handler(Looper.getMainLooper());
        Log.d(TAG, "onCreate called");
    }

    @Override
    public void onDestroy() {
        if (ForegroundService.isRunning) {
            handleStopService();
        }
        Log.d(TAG, "onDestroy called");
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "onTaskRemoved called");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /**
     * when context.startForegroundService() called, onStartCommand() invoked.
     * and, we have to call startForeground() in 5 seconds
     * when context.startService() called, onStartCommand() invoked.
     * Android Service is singleton itself.
     * so multiple call of startService() will NOT create instance, just onStartCommand() invoked
     *
     */
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.w(TAG, "onStartCommand called with null intent");
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (action == null) {
            Log.w(TAG, "onStartCommand called with null action");
            return START_NOT_STICKY;
        }
        Log.d(TAG, "onStartCommand called with action: " + action);

        switch (action) {
            case Constants.ACTION_FOREGROUND_SERVICE_START:
                handleStartService(intent);
                break;
            case Constants.ACTION_FOREGROUND_SERVICE_STOP:
                handleStopService();
                break;
            case Constants.ACTION_UPDATE_NOTIFICATION:
                handleUpdateNotification(intent);
                break;
            case Constants.ACTION_RUN_HEADLESS_TASK:
                handleRunHeadlessTask(intent);
                break;
            default:
                Log.w(TAG, "Unknown action: " + action);
        }
        // Service will NOT restart automatically if it's killed
        return START_NOT_STICKY;
        // Service should restart automatically if it's killed
        // return START_REDELIVER_INTENT;
    }

    /**
     * Start the foreground service with notification
     *
     * @param notificationConfig Bundle containing notification configuration
     */
    private void runStartForeground(Bundle notificationConfig) {
        try {
            int id = (int) notificationConfig.getDouble("id");
            NotificationHelper helper = new NotificationHelper(context);
            Notification notification = helper
                .buildNotification(notificationConfig);

            if (notification == null) {
                Log.e(TAG, "Failed to build notification");
                return;
            }

            // Android 14+ requires explicit service type
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                String serviceType = notificationConfig.getString("serviceType", "dataSync");
                int serviceTypeFlag = ServiceTypeManager.getServiceTypeFlag(serviceType);
                Log.d(TAG, String.format(
                    "Starting foreground service with type: %s (flag: %d)",
                    serviceType, serviceTypeFlag
                ));
                startForeground(id, notification, serviceTypeFlag);
            } else {
                startForeground(id, notification);
            }

            ForegroundService.isRunning = true;
            sendServiceStateChangeEventToReactNative();
            Log.d(TAG, "Foreground service started successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service", e);
        }
    }


    /**
     * Handle ACTION_FOREGROUND_SERVICE_START
     */
    private void handleStartService(Intent intent) {
        if (intent.getExtras() != null && intent.getExtras().containsKey(Constants.NOTIFICATION_CONFIG)) {
            Bundle notificationConfig = intent.getExtras().getBundle(Constants.NOTIFICATION_CONFIG);
            if (notificationConfig != null) {
                runStartForeground(notificationConfig);
            }
        }
    }

    /**
     * Handle ACTION_FOREGROUND_SERVICE_STOP
     */
    private void handleStopService() {
        Log.d(TAG, "Force stopping foreground service");
        cleanupResources();
        ForegroundService.isRunning = false;
        sendServiceStateChangeEventToReactNative();
        stopSelf();
    }

    /**
     * Handle ACTION_UPDATE_NOTIFICATION
     */
    private void handleUpdateNotification(Intent intent) {
        if (intent.getExtras() == null || !intent.getExtras().containsKey(Constants.NOTIFICATION_CONFIG)) {
            return;
        }

        Bundle notificationConfig = intent.getExtras().getBundle(Constants.NOTIFICATION_CONFIG);
        if (notificationConfig == null) {
            return;
        }

        if (!ForegroundService.isRunning) {
            Log.w(TAG, "Can not update notification. service is not running");
            return;
            // runStartForeground(notificationConfig);
        }
        try {
            int id = (int) notificationConfig.getDouble("id");
            Notification notification = new NotificationHelper(context)
                .buildNotification(notificationConfig);

            if (notification != null) {
                NotificationManager mNotificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (mNotificationManager != null) {
                    mNotificationManager.notify(id, notification);
                    Log.d(TAG, "Notification updated successfully");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to update notification", e);
        }

    }

    /**
     * Handle ACTION_RUN_HEADLESS_TASK
     */
    private void handleRunHeadlessTask(Intent intent) {
        if (intent.getExtras() == null || !intent.getExtras().containsKey(Constants.HEADLESS_TASK_CONFIG)) {
            Log.w(TAG, "Run task called without task config");
            return;
        }
        // Try to restart service if it was killed
        if (!ForegroundService.isRunning) {
            Log.w(TAG, "Can not run task. service is not running");
            return;
        }
        taskConfig = intent.getExtras().getBundle(Constants.HEADLESS_TASK_CONFIG);
        if (taskConfig == null) {
            Log.w(TAG, "Task config bundle is null");
            return;
        }
        Log.d(TAG, "starting handleRunTask()...");

        try {
            boolean onLoop = taskConfig.getBoolean("onLoop", false);

            if (onLoop) {
                // Start looping task runner
                initializeRepeatableTaskRunner();
                if (runnableCode != null) {
                    handler.post(runnableCode);
                    Log.d(TAG, "Started looping task runner");
                }
            } else {
                // Execute one-time task
                runOneTimeHeadlessTask(taskConfig);
                Log.d(TAG, "Executed one-time headless task");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start task", e);
        }
    }

    /**
     * Clean up all resources (handler callbacks, tasks, etc.)
     */
    private void cleanupResources() {
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
            Log.d(TAG, "Handler callbacks cleared");
        }
        if (runnableCode != null) {
            runnableCode = null;
        }
        taskConfig = null;
    }



    /**
     * Initialize the looping task runner
     */
    private void initializeRepeatableTaskRunner() {
        runnableCode = new Runnable() {
            @Override
            public void run() {
                if (!ForegroundService.isRunning) {
                    Log.d(TAG, "Task runner stopped - service not running");
                    return;
                }
                try {
                    final Intent service = new Intent(context, ForegroundServiceHeadlessTask.class);
                    service.putExtras(taskConfig);
                    context.startService(service);

                    // as default, js pass loopDelay to 1000
                    int loopDelay = (int) taskConfig.getDouble("loopDelay", 5000);
                    handler.postDelayed(this, loopDelay);
                    Log.d(TAG, "Repeatable task runner posted delayed loop");
                } catch (Exception e) {
                    Log.e(TAG, "Error in task runner", e);
                }
            }
        };
    }

    /**
     * Run a one-time headless task with optional delay
     *
     * @param bundle Task configuration bundle
     */
    private void runOneTimeHeadlessTask(Bundle bundle) {
        final Intent service = new Intent(context, ForegroundServiceHeadlessTask.class);
        service.putExtras(bundle);

        int delay = (int) bundle.getDouble("delay", 0);

        if (delay <= 0) {
            // Execute immediately
            context.startService(service);
        } else {
            // Execute after delay
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (!ForegroundService.isRunning) {
                        Log.d(TAG, "Service stopped before delayed task could execute");
                        return;
                    }
                    try {
                        context.startService(service);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to start delayed headless task", e);
                    }
                }
            }, delay);
        }
    }

    /**
     * Send event to React Native via DeviceEventEmitter
     */
    private void sendServiceStateChangeEventToReactNative() {
        try {
            WritableMap eventData = Arguments.createMap();
            eventData.putBoolean("running", ForegroundService.isRunning);

            ReactApplication reactApplication = (ReactApplication) context.getApplicationContext();
            ReactContext reactContext = Objects.requireNonNull(reactApplication.getReactHost()).getCurrentReactContext();
            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onServiceStateChanged", eventData);
                // on turbo module, WritableMap can be serialized only once and deallocated from memory.
                // so, we can not access eventData any more
                Log.d(TAG, "Service state event sent to React Native");
            } else {
                Log.w(TAG, "React Native context not available, Service state event not sent");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send service state event to React Native", e);
        }
    }
}
