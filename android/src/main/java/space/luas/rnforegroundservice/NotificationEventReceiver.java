package space.luas.rnforegroundservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Objects;

/**
 * Broadcast receiver for handling notification button clicks
 *
 * This receiver captures notification interactions and sends them to React Native via
 * DeviceEventEmitter
 */
public class NotificationEventReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationEventReceiver";
    public static final String ACTION_NOTIFICATION_BUTTON1 =
        "rnforegroundservice.NOTIFICATION_BUTTON1";
    public static final String ACTION_NOTIFICATION_BUTTON2 =
        "rnforegroundservice.NOTIFICATION_BUTTON2";
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        Log.d(TAG, "Notification event received: " + action);

        try {
            WritableMap eventData = Arguments.createMap();
            if (ACTION_NOTIFICATION_BUTTON1.equals(action) || ACTION_NOTIFICATION_BUTTON2.equals(action)) {
                int id = intent.getIntExtra("id", -1);
                if (id >= 0) {
                    eventData.putInt("id", id);
                }
                eventData.putString("label", intent.getStringExtra("label"));
                eventData.putString("value", intent.getStringExtra("value"));
                sendEventToReactNative(context, eventData);
            } else {
                Log.w(TAG, "Unknown notification event action: " + action);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling notification event", e);
        }
    }

    /**
     * Send event to React Native via DeviceEventEmitter
     */
    private void sendEventToReactNative(Context context, WritableMap eventData) {
        try {
            ReactApplication reactApplication = (ReactApplication) context.getApplicationContext();
            ReactContext reactContext = Objects.requireNonNull(reactApplication.getReactHost()).getCurrentReactContext();
            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("onNotificationPress", eventData);
                // on turbo module, WritableMap can be serialized only once and deallocated from memory.
                // so, we can not access eventData any more
                Log.d(TAG, "Event sent to React Native");
            } else {
                Log.w(TAG, "React Native context not available, event not sent");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send event to React Native", e);
        }
    }
}
