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

import java.util.ArrayList;
import java.util.List;
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
    public static boolean getIsRunning() {
        return isRunning;
    }
    private String primaryNotificationId = null;
    private final List<String> additionalNotificationIds = new ArrayList<>();

    private Handler handler;
    private Context context;
    private Runnable runnableCode;
    private Bundle taskConfig;

    @Override
    public void onCreate() {
        super.onCreate();
        context = this;
        handler = new Handler(Looper.getMainLooper());
        Log.d(TAG, "ForegroundService created");
    }

    @Override
    public void onDestroy() {
        if (ForegroundService.isRunning) {
            doStopService();
        }
        Log.d(TAG, "ForegroundService destroyed");
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "ForegroundService onTaskRemoved() called");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /**
     * when context.startForegroundService() called, onStartCommand() invoked.
     * and, we have to call startForeground() in 5 seconds
     * also when context.startService() called, onStartCommand() invoked.
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
                doStartService(intent);
                break;
            case Constants.ACTION_FOREGROUND_SERVICE_STOP:
                doStopService();
                break;
            case Constants.ACTION_UPDATE_NOTIFICATION:
                doUpdateNotification(intent);
                break;
            case Constants.ACTION_RUN_HEADLESS_TASK:
                doRunHeadlessTask(intent);
                break;
            case Constants.ACTION_NOTIFICATION_DISMISSED:
                doRepostNotification(intent);
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
//    private void runStartForeground(Bundle notificationConfig) {
//        try {
//            String id = notificationConfig.getString("id");
//            assert id != null : "notification id can not be null";
//
//            NotificationHelper helper = new NotificationHelper(context);
//            Notification notification = helper
//                .buildNotification(notificationConfig);
//
//            if (notification == null) {
//                Log.e(TAG, "Failed to build notification");
//                return;
//            }
//
//            // Android 14+ requires explicit service type
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
//                String serviceType = notificationConfig.getString("serviceType", "dataSync");
//                int serviceTypeFlag = ServiceTypeManager.getServiceTypeFlag(serviceType);
//                Log.d(TAG, String.format(
//                    "Starting foreground service with type: %s (flag: %d)",
//                    serviceType, serviceTypeFlag
//                ));
//                startForeground(id.hashCode(), notification, serviceTypeFlag);
//            } else {
//                startForeground(id.hashCode(), notification);
//            }
//
//            ForegroundService.isRunning = true;
//            sendServiceStateChangeEventToReactNative();
//            Log.d(TAG, "Foreground service started successfully.");
//        } catch (Exception e) {
//            Log.e(TAG, "Failed to start foreground service", e);
//        }
//    }


    /**
     * Handle ACTION_FOREGROUND_SERVICE_START
     */
    private void doStartService(Intent intent) {
        if (intent.getExtras() != null && intent.getExtras().containsKey(Constants.NOTIFICATION_CONFIG)) {
            Bundle notificationConfig = intent.getExtras().getBundle(Constants.NOTIFICATION_CONFIG);
            if (notificationConfig != null) {
                try {
                    String id = notificationConfig.getString("id");
                    assert id != null : "notification id can not be null";
                    NotificationHelper helper = new NotificationHelper(context);
                    Notification notification = helper
                        .buildServiceNotification(this, notificationConfig);

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
                        startForeground(id.hashCode(), notification, serviceTypeFlag);
                    } else {
                        startForeground(id.hashCode(), notification);
                    }
                    primaryNotificationId = id;
                    ForegroundService.isRunning = true;
                    sendServiceStateChangeEventToReactNative();
                    Log.d(TAG, "Foreground service started successfully.");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start foreground service", e);
                }

            }
        }
    }

    /**
     * Handle ACTION_FOREGROUND_SERVICE_STOP
     */
    private void doStopService() {
        Log.d(TAG, "Force stopping foreground service");
        cancelAdditionalNotifications();
        stopForeground(STOP_FOREGROUND_REMOVE);
        primaryNotificationId = null;
        cleanupResources();
        ForegroundService.isRunning = false;
        sendServiceStateChangeEventToReactNative();
        stopSelf();
    }

    private void cancelAdditionalNotifications() {
        if (!additionalNotificationIds.isEmpty()) {
            NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                for (String id : additionalNotificationIds) {
                    notificationManager.cancel(id.hashCode());
                }
                Log.d(TAG, "Additional notifications cleared");
            }
        }
    }

    /**
     * Handle ACTION_UPDATE_NOTIFICATION
     */
    private void doUpdateNotification(Intent intent) {
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
            String id = notificationConfig.getString("id");
            assert id != null : "notification id can not be null";
            Notification notification = new NotificationHelper(context)
                .buildServiceNotification(this, notificationConfig);

            if (notification != null) {
                NotificationManager notificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.notify(id.hashCode(), notification);
                    if (!id.equals(primaryNotificationId)) {
                        additionalNotificationIds.add(id);
                    }
                    Log.d(TAG, "Notification updated successfully");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to update notification", e);
        }

    }

    private void doRepostNotification(Intent intent) {
        if (intent.getExtras() == null || !intent.getExtras().containsKey(Constants.NOTIFICATION_CONFIG)) {
            return;
        }
        Bundle notificationConfig = intent.getExtras().getBundle(Constants.NOTIFICATION_CONFIG);
        if (notificationConfig == null) {
            return;
        }
        if (!ForegroundService.isRunning) {
            Log.w(TAG, "doRepostNotification(). can not update notification. service is not running");
            return;
        }
        try {
            String id = notificationConfig.getString("id");
            if (id != null && id.equals(primaryNotificationId)) {
                Notification notification = new NotificationHelper(context)
                    .buildServiceNotification(this, notificationConfig);

                if (notification != null) {
                    // Android 14+ requires explicit service type
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        String serviceType = notificationConfig.getString("serviceType", "dataSync");
                        int serviceTypeFlag = ServiceTypeManager.getServiceTypeFlag(serviceType);
                        Log.d(TAG, String.format(
                            "doRepostNotification(). calling startForeground() again with type: %s (flag: %d)",
                            serviceType, serviceTypeFlag
                        ));
                        startForeground(id.hashCode(), notification, serviceTypeFlag);
                    } else {
                        startForeground(id.hashCode(), notification);
                    }
//
//                    NotificationManager notificationManager =
//                        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
//                    if (notificationManager != null) {
//                        notificationManager.notify(id.hashCode(), notification);
//                        Log.d(TAG, "Notification reposted successfully");
//                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to repost notification", e);
        }
    }


    /**
     * Handle ACTION_RUN_HEADLESS_TASK
     */
    private void doRunHeadlessTask(Intent intent) {
        if (intent.getExtras() == null || !intent.getExtras().containsKey(Constants.HEADLESS_TASK_CONFIG)) {
            Log.w(TAG, "handleRunHeadlessTask(). intent extra has not task config");
            return;
        }
        if (!ForegroundService.isRunning) {
            Log.w(TAG, "handleRunHeadlessTask(). Foreground service is not running");
            return;
        }
        taskConfig = intent.getExtras().getBundle(Constants.HEADLESS_TASK_CONFIG);
        if (taskConfig == null) {
            Log.w(TAG, "handleRunHeadlessTask(). task config is null");
            return;
        }
        try {
            int firstInterval = (int) taskConfig.getDouble("firstInterval", 0);
            int interval = firstInterval > 0 ? firstInterval : (int) taskConfig.getDouble("interval",  Constants.HEADLESS_TASK_DEFAULT_INTERVAL);
            // Start looping task runner
            createRunnableCodeForHeadlessTaskLoop();
            if (runnableCode != null) {
                // post the first loop
                handler.postDelayed(runnableCode, interval);
                Log.d(TAG, "handleRunHeadlessTask(). runnable looper started for headlessTaskService. first interval=" + interval);
            }
            else {
                Log.w(TAG, "handleRunHeadlessTask(). runnableCode was not created");
            }
        } catch (Exception e) {
            Log.e(TAG, "handleRunHeadlessTask(). error", e);
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
    private void createRunnableCodeForHeadlessTaskLoop() {
        runnableCode = new Runnable() {
            @Override
            public void run() {
                if (!ForegroundService.isRunning) {
                    Log.d(TAG, "RunnableCode: headless task looper stopped. service not running");
                    return;
                }
                try {
                    final Intent headlessServiceIntent = new Intent(context, HeadlessTaskService.class);
                    headlessServiceIntent.putExtras(taskConfig);
                    context.startService(headlessServiceIntent);

                    // as default, js pass interval to 10000
                    int interval = (int) taskConfig.getDouble("interval", Constants.HEADLESS_TASK_DEFAULT_INTERVAL);
                    handler.postDelayed(this, interval);
                    Log.d(TAG, "RunnableCode: headless task looper posted. interval=" + interval);
                } catch (Exception e) {
                    Log.e(TAG, "RunnableCode: error", e);
                }
            }
        };
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
                // so, we can not access eventData anymore
                Log.d(TAG, "Service state event sent to React Native");
            } else {
                Log.w(TAG, "React Native context not available, Service state event not sent");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send service state event to React Native", e);
        }
    }
}
