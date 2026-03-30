package space.luas.rnforegroundservice;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

import java.util.List;
import java.util.Objects;

/**
 * Helper class for managing notification channel
 */
class NotificationChannelHelper {
    private static final String TAG = "NotificationChannelHelper";
    private static NotificationChannelHelper instance = null;
    private final NotificationManager notificationManager;

    public static synchronized NotificationChannelHelper getInstance(Context context) {
        if (instance == null) {
            instance = new NotificationChannelHelper(context);
        }
        return instance;
    }

    private NotificationChannelHelper(Context context) {
        this.notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }
    public List<NotificationChannel>  getNotificationChannels() {
        if (this.notificationManager == null) {
            return null;
        }
        return notificationManager.getNotificationChannels();
    }
    public NotificationChannel getNotificationChannel(String channelId) {
        if (this.notificationManager == null) {
            return null;
        }
        return notificationManager.getNotificationChannel(channelId);
    }

    public void notificationChannelExist(String channelId, Promise promise) {
        if (this.notificationManager == null) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "notification manager not assigned");
        }
        else {
            promise.resolve(this.getNotificationChannel(channelId) != null);
        }
    }

    public void deleteNotificationChannel(String channelId, Promise promise) {
        if (this.notificationManager == null) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "notification manager not assigned");
        }
        else {
            try {
                this.notificationManager.deleteNotificationChannel(channelId);
                Log.d(TAG, "Notification channel deleted: " + channelId);
                promise.resolve(null);
            } catch (Exception e) {
                Log.e(TAG, "Failed to delete notification channel", e);
                promise.reject(Constants.ERROR_SERVICE_ERROR,
                    "failed to delete notification channel. " + e.getMessage());
            }
        }
    }

    /**
     * Create or update notification channel (Android 8.0+)
//     * @params channelConfig must contains channelId, channelName
     */
    public void createNotificationChannel(ReadableMap channelConfig, Promise promise) {
        if (this.notificationManager == null) {
            promise.reject(Constants.ERROR_SERVICE_ERROR,
                "notification manager not assigned");
            return;
        }
        if (channelConfig == null) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Channel config is invalid - config is null");
            return;
        }
        if (!channelConfig.hasKey("channelId")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Channel config is invalid - channelId is required");
            return;
        }
        String channelId = channelConfig.getString("channelId");

        // Check if channel already exists
        if (notificationManager.getNotificationChannel(channelId) != null) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                "Channel config is invalid - channel exist already");
            return;
        }
        if (!channelConfig.hasKey("channelName")) {
            promise.reject(Constants.ERROR_INVALID_CONFIG,
                    "Channel config is invalid - channelName is required");
            return;
        }
        String channelName = channelConfig.getString("channelName");
        String channelDescription = channelConfig.hasKey("channelDescription")
                ? channelConfig.getString("channelDescription")
                : "";

        // Parse importance level
        int importance = channelConfig.hasKey("importance")
                ? switch (Objects.requireNonNull(channelConfig.getString("importance")).toLowerCase()) {
                    case "default" -> NotificationManager.IMPORTANCE_DEFAULT;
                    case "high" -> NotificationManager.IMPORTANCE_HIGH;
                    case "low" -> NotificationManager.IMPORTANCE_LOW;
                    case "min" -> NotificationManager.IMPORTANCE_MIN;
                    case "none" -> NotificationManager.IMPORTANCE_NONE;
                    case "unspecified" -> NotificationManager.IMPORTANCE_UNSPECIFIED;
                    default -> NotificationManager.IMPORTANCE_HIGH;
                }
                : NotificationManager.IMPORTANCE_HIGH;

        boolean lights =
            !channelConfig.hasKey("lights") || channelConfig.getBoolean("lights");
        boolean vibration =
            !channelConfig.hasKey("vibration") || channelConfig.getBoolean("vibration");
        boolean showBadge =
            !channelConfig.hasKey("showBadge") || channelConfig.getBoolean("showBadge");

        // Create channel
        NotificationChannel channel = new NotificationChannel(channelId,
                channelName, importance);
        channel.setDescription(channelDescription);
        channel.enableLights(lights);
        channel.enableVibration(vibration);
        channel.setShowBadge(showBadge);
        if (!channelConfig.hasKey("sound") || channelConfig.getBoolean("sound")) {
            try {
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();
                channel.setSound(soundUri, audioAttributes);
            }
            catch (Exception e) {
                Log.e(TAG, "Failed to set notification sound", e);
            }
        }
        notificationManager.createNotificationChannel(channel);
        Log.d(TAG, "Notification channel created. channelId=" + channelId);
        promise.resolve(null);
    }
}
