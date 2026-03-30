package space.luas.rnforegroundservice;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

/**
 * Handles runtime permission checking for Android 13+ (POST_NOTIFICATIONS)
 * and Android 14+ (foreground service type permissions)
 */
public class PermissionChecker {

    private final Context context;

    public PermissionChecker(Context context) {
        this.context = context;
    }

    /**
     * Check if POST_NOTIFICATIONS permission is granted (Android 13+)
     *
     * @return true if permission is granted or not required (Android < 13), false otherwise
     */
    public boolean hasPostNotificationsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        }
        // Permission not required for Android < 13
        return true;
    }

    /**
     * Check if required foreground service type permission is granted (Android 14+)
     *
     * @param serviceType Service type string ('dataSync', 'location', 'mediaPlayback')
     * @return true if permission is granted or not required, false otherwise
     */
    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
    public boolean hasForegroundServicePermission(String serviceType) {
        // Base FOREGROUND_SERVICE permission is always required
        boolean hasBasePermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.FOREGROUND_SERVICE
        ) == PackageManager.PERMISSION_GRANTED;
        if (hasBasePermission) {
            // For Android 14+, check type-specific permission if required
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                if (ServiceTypeManager.requiresAdditionalPermissions(serviceType)) {
                    String typePermission = ServiceTypeManager.getRequiredPermission(serviceType);
                    return ContextCompat.checkSelfPermission(
                        context,
                        typePermission
                    ) == PackageManager.PERMISSION_GRANTED;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Get a user-friendly error message for missing permissions
     *
     * @param serviceType Service type that requires permissions
     * @return Error message string
     */
    public String getPermissionErrorMessage(String serviceType) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasPostNotificationsPermission()) {
                return "POST_NOTIFICATIONS permission is required for Android 13+. " +
                    "Please request this permission before starting the service.";
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            if (!hasForegroundServicePermission(serviceType)) {
                String permission = ServiceTypeManager.getRequiredPermission(serviceType);
                return "Permission '" + permission + "' is required for service type '" +
                    serviceType + "' on Android 14+. Please add this permission to your AndroidManifest.xml";
            }
        }

        return "Required permissions are missing. Please check your AndroidManifest.xml";
    }
}
