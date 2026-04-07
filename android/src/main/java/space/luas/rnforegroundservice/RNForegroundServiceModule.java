package space.luas.rnforegroundservice;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.util.List;

import javax.annotation.Nullable;

/**
 * TurboModule implementation for Foreground Service
 *
 * This module bridges JavaScript to Android native foreground service functionality. Implements the
 * Spec interface defined in NativeForegroundService.ts
 *
 * Key features: - Android 13+ POST_NOTIFICATIONS permission checking - Android 14+ foreground
 * service type validation - Full error handling and validation - TurboModule architecture for React
 * Native New Architecture
 */
@ReactModule(name = RNForegroundServiceModule.NAME)
public class RNForegroundServiceModule extends NativeRNForegroundServiceSpec {
    // defined in NativeRNForegroundServiceSpec
    public static final String NAME = NativeRNForegroundServiceSpec.NAME; // "NativeRNForegroundService";

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    private static final String TAG = "ForegroundServiceModule";

    private final ReactApplicationContext reactContext;
    private final PermissionChecker permissionChecker;

    public RNForegroundServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.permissionChecker = new PermissionChecker(reactContext);
    }

    /**
     * get notification channels. then channels can be different than createNotificationChannel()
     * since user can change its attributes on system setting
     *
     * @param channelId optional. Notification channel id. if null return all channels
     * @param promise Promise to resolve with ChannelConfig /reject
     */
    @ReactMethod
    public void getNotificationChannels(@Nullable String channelId, Promise promise){
        List<NotificationChannel> list = NotificationChannelHelper
            .getInstance(this.reactContext.getApplicationContext())
            .getNotificationChannels();
        // Create a new writable array
        WritableArray array = Arguments.createArray();
        for (NotificationChannel channel: list) {
            if (channelId != null && !channelId.equals(channel.getId())) {
                continue;
            }
            // Create a new writable map for each channel)
            WritableMap map = Arguments.createMap();
            map.putString("channelId", channel.getId());
            map.putString("channelName", (String) channel.getName());
            map.putString("channelDescription", channel.getDescription());
//            map.putBoolean("vibrate", channel.shouldVibrate());
//            map.putBoolean("lights", channel.shouldShowLights());
//            map.putBoolean("showBadge", channel.canShowBadge());
            map.putString("importance",
                switch (channel.getImportance()) {
                    case NotificationManager.IMPORTANCE_DEFAULT -> "default";
                    case NotificationManager.IMPORTANCE_HIGH -> "high";
                    case NotificationManager.IMPORTANCE_LOW -> "low";
                    case NotificationManager.IMPORTANCE_MIN -> "min";
                    case NotificationManager.IMPORTANCE_NONE -> "none";
                    case NotificationManager.IMPORTANCE_UNSPECIFIED -> "none";
                    default -> "none";
                });
            array.pushMap(map);
        }
        promise.resolve(array);
    }

    /**
     * create notification channel
     *
     * @param channelConfig Notification channel configuration from JavaScript
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void createNotificationChannel(ReadableMap channelConfig, Promise promise) {
        NotificationChannelHelper
            .getInstance(this.reactContext.getApplicationContext())
            .createNotificationChannel(channelConfig, promise);
    }
    /**
     * check if notification channel registered already
     *
     * @param channelId channel id from JavaScript
     */
    @ReactMethod
    public void notificationChannelExist(String channelId, Promise promise) {
        NotificationChannelHelper
            .getInstance(this.reactContext.getApplicationContext())
            .notificationChannelExist(channelId, promise);
    }
    /**
     * check if notification channel registered already
     *
     * @param channelId channel id from JavaScript
     */
    @ReactMethod
    public void deleteNotificationChannel(String channelId, Promise promise) {
        NotificationChannelHelper
            .getInstance(this.reactContext.getApplicationContext())
            .deleteNotificationChannel(channelId, promise);
    }

    /**
     * Start the foreground service with notification
     * note. when app is FOREGROUND state, we can start any of foreground service or background service.
     * but when app is BACKGROUND state, we can NOT start foreground service with normal startService().
     * So, from android 8, we need to use startForegroundService() to start foreground service.
     * then system allow 5 seconds to start foreground service(eg, MUST post notification with startForeground().
     * if startForeground() was not called in 5 seconds, system will declare app as ANR.
     * we here, we use startForegroundService() regardless of app back/foreground state.
     *
     *
     * @param notificationConfig Notification configuration from JavaScript
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void startService(ReadableMap notificationConfig, Promise promise) {
        // Validate configuration
        if (!validateParams(notificationConfig, true, promise)) {
            return;
        }
        if (ForegroundService.getIsRunning()) {
            Log.w(TAG, "startService -> service is already running. will just post notification");
            this.updateServiceNotification(notificationConfig, promise);
            return;
        }
        try {
            Intent intent = new Intent(reactContext, ForegroundService.class);
            intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_START);
            intent.putExtra(Constants.NOTIFICATION_CONFIG, Arguments.toBundle(notificationConfig));
            reactContext.startForegroundService(intent);
            promise.resolve(null);
            Log.d(TAG, "startService -> context.startForegroundService() called");
        } catch (IllegalStateException | SecurityException e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                    "Failed to start foreground service: " + e.getMessage(), e);
        }
    }

    /**
     * Stop the foreground service (decrements internal counter)
     *
     * @return boolean
     */
    @ReactMethod
    public boolean stopService() {
        Intent intent = new Intent(reactContext, ForegroundService.class);
        try {
            Log.d(TAG, "stopService -> calling context.stopService()");
            return reactContext.stopService(intent);
        } catch (Exception e) {
            Log.w(TAG, "stopService -> context.stopService() failed");
            throw e;
        }
    }

    /**
     * Update notification of running service
     *
     * @param notificationConfig Updated notification configuration
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void updateServiceNotification(ReadableMap notificationConfig, Promise promise) {
        // check channelId and mandatory props, will reject if invalid
        if (!validateParams(notificationConfig, true, promise)) {
            return;
        }
        // if foreground service, delegate notification to ForegroundService
        if (!ForegroundService.getIsRunning()) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "Update notification failed - service is not running");
            return;
        }
        try {
            Intent intent = new Intent(reactContext, ForegroundService.class);
            intent.setAction(Constants.ACTION_UPDATE_NOTIFICATION);
            intent.putExtra(Constants.NOTIFICATION_CONFIG, Arguments.toBundle(notificationConfig));
            // pass intent to service
            ComponentName componentName = reactContext.startService(intent);
            if (componentName != null) {
                promise.resolve(null);
            } else {
                promise.reject(Constants.ERROR_SERVICE_ERROR,
                    "Update notification failed - service did not start");
            }
        } catch (IllegalStateException | SecurityException e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "Update notification failed: " + e.getMessage(), e);
        }
    }


    /**
     * Update notification of running service
     *
     * @param notificationConfig Updated notification configuration
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void postNotification(ReadableMap notificationConfig, Promise promise) {
        // check channelId and mandatory props, will reject if invalid
        if (!validateParams(notificationConfig, false, promise)) {
            return;
        }
        // post notification
        try {
            NotificationHelper notificationHelper = new NotificationHelper(reactContext.getApplicationContext());
            notificationHelper.postNotification(Arguments.toBundle(notificationConfig), promise);
        } catch (IllegalStateException | SecurityException e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "Post notification failed: " + e.getMessage(), e);
        }
    }

    /**
     * Check if service is running
     */
    @ReactMethod
    public boolean isRunning() {
        return ForegroundService.getIsRunning();
    }

    /**
     * Run a headless task
     *
     * @param taskConfig Task configuration from JavaScript
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void runHeadlessTask(ReadableMap taskConfig, Promise promise) {
        if (!taskConfig.hasKey("taskName")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG, "taskName is required");
            return;
        }

        if (!taskConfig.hasKey("delay")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG, "delay is required");
            return;
        }
        Log.d(TAG, "starting runHeadlessTask()...");

        try {
            Intent intent = new Intent(reactContext, ForegroundService.class);
            intent.setAction(Constants.ACTION_RUN_HEADLESS_TASK);
            intent.putExtra(Constants.HEADLESS_TASK_CONFIG, Arguments.toBundle(taskConfig));

            ComponentName componentName = reactContext.startService(intent);
            if (componentName != null) {
                promise.resolve(null);
            } else {
                promise.reject(Constants.ERROR_SERVICE_ERROR,
                        "Failed to run task: Service did not start");
            }
        } catch (IllegalStateException | SecurityException e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR, "Failed to run task: " + e.getMessage(),
                    e);
        }
    }

    /**
     * Cancel a specific notification by ID
     *
     * @param id Notification ID to cancel
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void cancelNotification(double id, Promise promise) {
        try {
            int notificationId = (int) id;
            android.app.NotificationManager mNotificationManager =
                    (android.app.NotificationManager) reactContext
                            .getSystemService(Context.NOTIFICATION_SERVICE);

            if (mNotificationManager != null) {
                mNotificationManager.cancel(notificationId);
                promise.resolve(null);
            } else {
                promise.reject(Constants.ERROR_SERVICE_ERROR, "Failed to get NotificationManager");
            }
        } catch (Exception e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                    "Failed to cancel notification: " + e.getMessage(), e);
        }
    }
    /**
     * Cancel all notifications
     */
    @ReactMethod
    public void cancelAllNotifications(Promise promise) {
        try {
            android.app.NotificationManager mNotificationManager =
                (android.app.NotificationManager) reactContext
                    .getSystemService(Context.NOTIFICATION_SERVICE);

            if (mNotificationManager != null) {
                mNotificationManager.cancelAll();
                promise.resolve(null);
            } else {
                promise.reject(Constants.ERROR_SERVICE_ERROR, "Failed to get NotificationManager");
            }
        } catch (Exception e) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "Failed to cancel notification: " + e.getMessage(), e);
        }
    }

    /**
     * Check if POST_NOTIFICATIONS permission is granted (Android 13+)
     *
     * @param promise Promise that resolves to boolean
     */
    @ReactMethod
    public void checkPostNotificationsPermission(Promise promise) {
        boolean hasPermission = permissionChecker.hasPostNotificationsPermission();
        promise.resolve(hasPermission);
    }

    /**
     * Validate notification configuration
     *
     * @param config Configuration to validate
     * @param promise Promise to reject if invalid
     * @return true if valid, false otherwise
     */
    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
    private boolean validateParams(ReadableMap config, boolean forService, Promise promise) {

        // Check permission. POST_NOTIFICATIONS (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!permissionChecker.hasPostNotificationsPermission()) {
                promise.reject(Constants.ERROR_PERMISSION_DENIED,
                    "POST_NOTIFICATIONS permission not granted. "
                        + "Please request this permission before starting the service.");
                return false;
            }
        }
        if (config == null) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                "Notification config is invalid - config is null");
            return false;
        }
        // notification channelId is mandatory and the channel must exist
        if (!config.hasKey("channelId")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                "Notification config is invalid - channel id is required");
            return false;
        }
        else {
            String channelId = config.getString("channelId");
            if (NotificationChannelHelper
                    .getInstance(this.reactContext.getApplicationContext())
                    .getNotificationChannel(channelId) == null) {
                promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Notification config is invalid - channel not found");
                return false;
            }
        }
        // notification id, title, message are mandatory
        if (!config.hasKey("id")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Notification config is invalid - id is required");
            return false;
        }
        if (!config.hasKey("title")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Notification config is invalid - title is required");
            return false;
        }
        if (!config.hasKey("body")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Notification config is invalid - body is required");
            return false;
        }

        // for service notification. serviceType is mandatory and must have permission
        if (forService) {
            // Validate service type for Android 14+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                if (!config.hasKey("serviceType")) {
                    promise.reject(Constants.ERROR_INVALID_CONFIG,
                        "serviceType is required for Android 14+. "
                            + "Please specify: 'dataSync', 'location', or 'mediaPlayback'");
                    return false;
                }

                String serviceType = config.getString("serviceType");
                if (!permissionChecker.hasForegroundServicePermission(serviceType)) {
                    promise.reject(Constants.ERROR_PERMISSION_DENIED,
                        permissionChecker.getPermissionErrorMessage(serviceType));
                    return false;
                }
            }
        }
        return true;
    }

    @ReactMethod
    public void addListener(String eventType) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    @ReactMethod
    public void removeListeners(double count) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }
}
