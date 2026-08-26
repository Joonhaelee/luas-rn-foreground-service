package space.luas.rnforegroundservice;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
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
//            map.putBoolean("badge", channel.canShowBadge());
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
     * @param notif Notification configuration from JavaScript
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void startService(ReadableMap notif, Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                ComponentName component = new ComponentName(this.reactContext, ForegroundService.class);
                ServiceInfo info =
                    this.reactContext.getPackageManager().getServiceInfo(component, PackageManager.GET_META_DATA);
                if (info.getForegroundServiceType() == 0) {
                    Log.e(
                        TAG,
                        "No foregroundServiceType declared for space.luas.rnforegroundservice.ForegroundService in"
                            + " your AndroidManifest.xml. Android 14+ requires an explicit"
                            + " foregroundServiceType. Add <service"
                            + " android:name=\"space.luas.rnforegroundservice.ForegroundService\""
                            + " android:foregroundServiceType=\"yourType\" /> to your app manifest."
                            + " Aborting foreground service start.");
                    promise.reject(Constants.ERROR_INVALID_CONFIG, "No foregroundServiceType declared for space.luas.rnforegroundservice.ForegroundService");
                    return;
                }
            } catch (PackageManager.NameNotFoundException e) {
                Log.e(TAG, "ForegroundService not found in manifest", e);
                promise.reject(Constants.ERROR_INVALID_CONFIG, "ForegroundService not found in manifest");
                return;
            }
        }

        // Validate configuration
        if (!validateServiceStartNotif(notif, promise)) {
            Log.e(TAG, "startService(). invalid service start notification");
        }
        else if (ForegroundService.getIsRunning()) {
            Log.w(TAG, "startService(). service is already running. will just post notification");
            this.updateServiceNotification(notif, promise);
            promise.resolve(null);
        }
        else {
            try {
                Log.d(TAG, "startService(). calling context.startForegroundService()");
                Intent intent = new Intent(reactContext, ForegroundService.class);
                intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_START);
                intent.putExtra(Constants.NOTIFICATION_CONFIG, Arguments.toBundle(notif));
                reactContext.startForegroundService(intent);
                promise.resolve(null);
            } catch (IllegalStateException | SecurityException e) {
                Log.e(TAG, "startService() error. " + e.getMessage());
                promise.reject(Constants.ERROR_SERVICE_ERROR,
                        "Failed to start foreground service: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Stop the foreground service (decrements internal counter)
     * if passed notif is NOT valid, just stop service and reject promise
     */
    @ReactMethod
    public void stopService(@Nullable ReadableMap notif, Promise promise) {
        Intent intent = new Intent(reactContext, ForegroundService.class);
        intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_STOP);
        boolean promiseResolved = false;
        if (notif != null) {
            if (validateNotif(notif, promise)) {
                Log.d(TAG, "stopService() called with notif");
                intent.putExtra(Constants.NOTIFICATION_CONFIG, Arguments.toBundle(notif));
            }
            else {
                Log.w(TAG, "stopService() called with invalid notif");
                promiseResolved = true;
            }
        }
        try {
            // Send stop action via startService (service will handle decrement and stop if needed)
            reactContext.startService(intent);
            if (!promiseResolved) {
                promise.resolve(null);
            }
        } catch (IllegalStateException e) {
            // If startService fails, try stopService as fallback
            try {
                reactContext.stopService(intent);
                if (!promiseResolved) {
                    promise.resolve(null);
                }
            } catch (Exception e2) {
                Log.e(TAG, "Service stop failed: " + e2.getMessage(), e2);
                if (!promiseResolved) {
                    promise.reject(Constants.ERROR_SERVICE_ERROR,
                        "Service stop failed: " + e2.getMessage(), e2);
                }
            }
        }
    }

    /**
     * Update notification of running service
     *
     * @param notif Updated notification configuration
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void updateServiceNotification(ReadableMap notif, Promise promise) {
        // check channelId and mandatory props, will reject if invalid
        if (!validateNotif(notif, promise)) {
            Log.e(TAG, "updateServiceNotification(). invalid notification");
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
            intent.putExtra(Constants.NOTIFICATION_CONFIG, Arguments.toBundle(notif));
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
     * @param notif Updated notification configuration
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void postNotification(ReadableMap notif, Promise promise) {
        // check channelId and mandatory props, will reject if invalid
        if (!validateNotif(notif, promise)) {
            Log.e(TAG, "postNotification(). invalid notification");
            return;
        }
        // post notification
        try {
            NotificationHelper notificationHelper = new NotificationHelper(reactContext.getApplicationContext());
            if (notificationHelper.postNotification(Arguments.toBundle(notif))) {
                promise.resolve(true);
            }
            else {
                promise.reject(Constants.ERROR_SERVICE_ERROR, "Failed to post notification.");
            }
        } catch (IllegalStateException | SecurityException e) {
            Log.e(TAG, "postNotification() error", e);
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
     * headless task executor
     * delegate run headless task to ForegroundService.java
     * @param taskConfig Task configuration from JavaScript
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    public void runHeadlessTask(ReadableMap taskConfig, Promise promise) {
        if (!taskConfig.hasKey("headlessTaskKey")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG, "headlessTaskKey is required");
            return;
        }
        if (!taskConfig.hasKey("interval")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG, "interval is required");
            return;
        }
        int interval = (int) taskConfig.getDouble("interval");
        if (interval < 5000) {
            promise.reject(Constants.ERROR_INVALID_CONFIG, "headless task interval must be greater than 5000");
            return;
        }
        try {
            Intent intent = new Intent(reactContext, ForegroundService.class);
            intent.setAction(Constants.ACTION_RUN_HEADLESS_TASK);
            intent.putExtra(Constants.HEADLESS_TASK_CONFIG, Arguments.toBundle(taskConfig));
            // start service HeadlessTaskService
            // this will invoke the function registered by AppRegistry.registerHeadlessTask()
            ComponentName componentName = reactContext.startService(intent);
            if (componentName != null) {
                Log.d(TAG, "starting the service HeadlessTaskService...");
                promise.resolve(null);
            } else {
                promise.reject(Constants.ERROR_SERVICE_ERROR,
                        "Failed to start service HeadlessTaskService. service not found");
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
    public void cancelNotification(String id, Promise promise) {
        try {
            int hashCode = id.hashCode();
            android.app.NotificationManager mNotificationManager =
                    (android.app.NotificationManager) reactContext
                            .getSystemService(Context.NOTIFICATION_SERVICE);

            if (mNotificationManager != null) {
                mNotificationManager.cancel(hashCode);
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
     * @param notif Configuration to validate
     * @param promise Promise to reject if invalid
     * @return true if valid, false otherwise
     */
    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
    private boolean validateServiceStartNotif(ReadableMap notif, Promise promise) {

        if (this.validateNotif(notif, promise)) {
            // for service notification. serviceType is mandatory and must have permission
            // Validate service type for Android 14+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                if (!notif.hasKey("serviceType")) {
                    promise.reject(Constants.ERROR_INVALID_CONFIG,
                        "serviceType is required for Android 14+. "
                            + "Please specify: 'dataSync', 'location', or 'mediaPlayback'");
                    return false;
                }

                String serviceType = notif.getString("serviceType");
                if (!permissionChecker.hasForegroundServicePermission(serviceType)) {
                    promise.reject(Constants.ERROR_PERMISSION_DENIED,
                        permissionChecker.getPermissionErrorMessage(serviceType));
                    return false;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Validate notification configuration
     *
     * @param config Configuration to validate
     * @param promise Promise to reject if invalid
     * @return true if valid, false otherwise
     */
    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
    private boolean validateNotif(ReadableMap config, Promise promise) {

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
