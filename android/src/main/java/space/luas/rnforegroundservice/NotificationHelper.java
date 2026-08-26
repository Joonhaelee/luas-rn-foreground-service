package space.luas.rnforegroundservice;

import android.os.Build;
import android.app.Service;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import android.util.Log;

import com.facebook.react.bridge.Promise;

import java.util.HashMap;
import java.util.UUID;

import javax.annotation.Nullable;

/**
 * Helper class for building and managing notifications for foreground service
 * Handles Android 12+ PendingIntent flag requirements: - Main intent uses FLAG_IMMUTABLE (security
 * best practice) - Button intents use FLAG_MUTABLE (required for user interaction)
 */
class NotificationHelper {
    private static final String TAG = "NotificationHelper";
    private final Context context;
    private final NotificationManager notificationManager;
    private final HashMap<String, Integer> resourceCache = new HashMap<String, Integer>();

    public NotificationHelper(Context context) {
        this.context = context;
        this.notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    /**
     * post a non-foreground service notification
     *
     * @param bundle Configuration bundle from React Native
     */
    public boolean postNotification(Bundle bundle) {
        try {
            Notification notification = this.buildNotification(bundle);
            String id = bundle.getString("id");
            assert id != null : "notification id can not be null";
            this.notificationManager.notify(id.hashCode(), notification);
            Log.d(TAG, "notification posted. id=" + id);
            return true;
        }
        catch (Exception e) {
            Log.e(TAG, "Failed to post notification", e);
            return false;
        }
    }

    /**
     * notification content click intent
     * it must open a specific activity and bring then app to the foreground.(PendingIntent.getActivity())
     * if we want a custom action, we hvae to use addAction(PendingIntent.getBroadcast())
     * @return PendingIntent
     */
    private PendingIntent getContentClickIntent() {
        // Notification content intent: open main class
        Class<?> mainActivityClass = getMainActivityClass(context);
        if (mainActivityClass == null) {
            Log.e(TAG, "buildNotification: unable to find main activity class");
            return null;
        }
        Intent notificationIntent = new Intent(context, mainActivityClass);
        notificationIntent
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        // CRITICAL FIX: Use FLAG_IMMUTABLE for main intent (Android 12+ security requirement)
        // content intent need not unique request code
        return PendingIntent.getActivity(context, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

    }

    /**
     * notification content click intent
     * it must open a specific activity and bring then app to the foreground.(PendingIntent.getActivity())
     * if we want a custom action, we hvae to use addAction(PendingIntent.getBroadcast())
     * @return PendingIntent
     */
    private PendingIntent getDismissIntent(Service service, Bundle bundle) {
        String id = bundle.getString("id");
        assert id != null : "notification id can not be null";

        Intent deleteIntent = new Intent(service, ForegroundService.class)
            .setAction(Constants.ACTION_NOTIFICATION_DISMISSED)
            .putExtra(Constants.NOTIFICATION_CONFIG, bundle);
        return PendingIntent.getService(
            service, id.hashCode(), deleteIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

//        Intent intent = new Intent(context, NotificationEventReceiver.class)
//            .setAction(NotificationEventReceiver.ACTION_NOTIFICATION_DISMISSED)
//            .putExtra(Constants.NOTIFICATION_CONFIG, bundle);
//
//        return PendingIntent.getBroadcast(context, id.hashCode(), intent,
//            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void addCustomButton(NotificationCompat.Builder notificationBuilder,
                                   Bundle rootBundle,
                                   String key,
                                   String buttonAction) {
        String id = rootBundle.getString("id");
        assert id != null : "notification id can not be null";
        Bundle nestedBundle = rootBundle.getBundle(key);
        if (nestedBundle != null) {
            String label = nestedBundle.getString("label");
            if (label != null) {
                Intent intentReceiver = new Intent(context, NotificationEventReceiver.class)
                    .setAction(buttonAction)
                    // notification id from root bundle
                    .putExtra("id", id)
                    .putExtra("label", label)
                    .putExtra("value", nestedBundle.getString("value", label));
                // Button intents use FLAG_IMMUTABLE with broadcast
                PendingIntent buttonIntent = PendingIntent.getBroadcast(context, UUID.randomUUID().hashCode(), intentReceiver,
                    PendingIntent.FLAG_IMMUTABLE);
                notificationBuilder.addAction(0, label, buttonIntent);
            }
        }
    }

    private void addCustomProgress(NotificationCompat.Builder notificationBuilder,
                                 Bundle rootBundle) {
        Bundle bundle = rootBundle.getBundle("progress");
        if (bundle != null) {
            int max = (int) bundle.getDouble("max", 0);
            int curr = (int) bundle.getDouble("curr", 0);
            notificationBuilder.setProgress(max, curr, false);
        }
    }

    public Notification buildServiceNotification(Service service, Bundle bundle) {
        NotificationCompat.Builder builder = this.buildNotificationBuilder(bundle);
        // prevent 10 sec notification delay
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Force immediate notification delivery, bypassing the 10-second delay
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
        // keep bundle for repost notification if foreground service associated
        builder.setDeleteIntent(this.getDismissIntent(service, bundle));
        return builder.build();
    }

    public Notification buildNotification(Bundle bundle) {
        NotificationCompat.Builder builder = this.buildNotificationBuilder(bundle);
        return builder.build();
    }

    /**
     * Build a notification from configuration bundle
     *
     * @param bundle Configuration bundle from React Native
     * @return Configured notification or null if configuration is invalid
     */
    public NotificationCompat.Builder buildNotificationBuilder(Bundle bundle) {
        if (bundle == null) {
            Log.e(TAG, "buildNotification: invalid config - bundle is null");
            return null;
        }
        // channelId must be given
        String channelId = bundle.getString("channelId");
        if (channelId == null || channelId.isEmpty()) {
            Log.e(TAG, "buildNotification: invalid config - channelId is empty");
            return null;
        }

        // Parse notification priority
        String priorityString = bundle.getString("priority", "default");
        int priority = switch (priorityString.toLowerCase()) {
            case "max" -> NotificationCompat.PRIORITY_MAX;
            case "high" -> NotificationCompat.PRIORITY_HIGH;
            case "low" -> NotificationCompat.PRIORITY_LOW;
            case "min" -> NotificationCompat.PRIORITY_MIN;
            default -> NotificationCompat.PRIORITY_DEFAULT;
        };

        // Parse notification visibility
        String visibilityString = bundle.getString("visibility", "public");
        int visibility = switch (visibilityString.toLowerCase()) {
            case "private" -> NotificationCompat.VISIBILITY_PRIVATE;
            case "secret" -> NotificationCompat.VISIBILITY_SECRET;
            default -> NotificationCompat.VISIBILITY_PUBLIC;
        };


        // Override with custom color if provided
        int color = Color.parseColor("#FFFFFF");
        String colorString = bundle.getString("color");
        if (colorString != null && !colorString.isEmpty()) {
            try {
                color = Color.parseColor(colorString);
            } catch (IllegalArgumentException e) {
                Log.w(TAG, "Invalid color format: " + color);
            }
        }
        // Small icon
        String iconName = bundle.getString("icon");
        int iconResId = this.getResourceIdForResourceName(context, iconName);
        if (iconResId == 0) {
           iconResId = context.getApplicationInfo().icon;
        }

        // Build notification
        boolean setOnlyAlertOnce = bundle.getBoolean("setOnlyAlertOnce", false);
        boolean ongoing = bundle.getBoolean("ongoing", false);
        boolean autoCancel = bundle.getBoolean("autoCancel", false);
        String title = bundle.getString("title", "Title");
        String message = bundle.getString("body", "Body");

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(context, channelId)
                        .setDefaults(NotificationCompat.DEFAULT_ALL)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setVisibility(visibility)
                        .setPriority(priority)
                        .setColor(color)
                        .setSmallIcon(iconResId)
                        .setOnlyAlertOnce(setOnlyAlertOnce)
                        .setAutoCancel(autoCancel)
                        .setOngoing(ongoing)
                        .setContentIntent(this.getContentClickIntent());

        // Large icon. right side of notification
        String largeIconName = bundle.getString("largeIcon");
        if (largeIconName != null) {
            try {
                int largeIconResId = this.getResourceIdForResourceName(context, largeIconName);
                if (largeIconResId != 0) {
                    Bitmap largeIconBitmap = BitmapFactory.decodeResource(context.getResources(), largeIconResId);
                    if (largeIconBitmap != null) {
                        notificationBuilder.setLargeIcon(largeIconBitmap);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to set large icon: " + e.getMessage());
            }
        }
        // Badge number
        int badge = (int) bundle.getDouble("badge", 0);
        if (badge > 0) {
            notificationBuilder.setNumber(badge);
        }
        // long message as Big text style
        String longBody = bundle.getString("longBody");
        if (longBody != null) {
            notificationBuilder.setStyle(new NotificationCompat.BigTextStyle().bigText(longBody));
        }
        // button1, button2
        this.addCustomButton(notificationBuilder, bundle, "button1", Constants.ACTION_NOTIFICATION_BUTTON1);
        this.addCustomButton(notificationBuilder, bundle, "button2", Constants.ACTION_NOTIFICATION_BUTTON2);
        // Progress bar
        this.addCustomProgress(notificationBuilder, bundle);
        // auto dismiss notification
        long timeoutAfter = (long) bundle.getDouble("timeoutAfter", 0);
        if (timeoutAfter > 0) {
            notificationBuilder.setTimeoutAfter(timeoutAfter);
        }
        // --- end build notification

        return notificationBuilder;


    }

    /**
     * Get main activity class from package manager
     */
    private Class<?> getMainActivityClass(Context context) {
        String packageName = context.getPackageName();
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(packageName);
        if (launchIntent == null || launchIntent.getComponent() == null) {
            Log.e(TAG, "Failed to get launch intent or component");
            return null;
        }
        try {
            return Class.forName(launchIntent.getComponent().getClassName());
        } catch (ClassNotFoundException e) {
            Log.e(TAG, "Failed to get main activity class", e);
            return null;
        }
    }

    /**
     * Get resource ID for a given resource name
     */
    private int getResourceIdForResourceName(Context context, @Nullable String resourceName) {
        if (resourceName == null) {
            return 0;
        }
        Integer cachedId = this.resourceCache.get(resourceName);
        if (cachedId != null) {
            return cachedId;
        }
        int resourceId = context.getResources().getIdentifier(resourceName, "drawable",
            context.getPackageName());
        if (resourceId == 0) {
            resourceId = context.getResources().getIdentifier(resourceName, "mipmap",
                context.getPackageName());
        }
        if (resourceId != 0) {
            this.resourceCache.put(resourceName, resourceId);
        }
        return resourceId;
    }
}
