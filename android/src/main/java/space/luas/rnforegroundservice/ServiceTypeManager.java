package space.luas.rnforegroundservice;

import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.annotation.RequiresApi;

/**
 * Manages foreground service types for Android 14+ (API 34+)
 *
 * Android 14 introduced mandatory foreground service types that must be declared
 * in the manifest and specified when starting the service.
 */
public class ServiceTypeManager {

    public static final String TYPE_DATA_SYNC = "dataSync";
    public static final String TYPE_LOCATION = "location";
    public static final String TYPE_MEDIA_PLAYBACK = "mediaPlayback";

    /**
     * Convert string service type to ServiceInfo constant for Android 14+
     *
     * @param serviceType String service type ('dataSync', 'location', or 'mediaPlayback')
     * @return ServiceInfo foreground service type flag
     */
    @RequiresApi(api = Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    public static int getServiceTypeFlag(String serviceType) {
        return switch (serviceType != null ? serviceType : "null") {
            case TYPE_LOCATION -> ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            case TYPE_MEDIA_PLAYBACK -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            default -> ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
        };
    }

    /**
     * Get required permission for a given service type
     *
     * @param serviceType Service type string
     * @return Required permission string
     */
    public static String getRequiredPermission(String serviceType) {
        return switch (serviceType!= null ? serviceType : "null") {
            case TYPE_LOCATION -> "android.permission.FOREGROUND_SERVICE_LOCATION";
            case TYPE_MEDIA_PLAYBACK -> "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK";
            default -> "android.permission.FOREGROUND_SERVICE_DATA_SYNC";
        };
    }

    /**
     * Check if the service type requires additional permissions beyond FOREGROUND_SERVICE
     *
     * @param serviceType Service type string
     * @return true if additional permissions are required
     */
    public static boolean requiresAdditionalPermissions(String serviceType) {
        // dataSync only requires base FOREGROUND_SERVICE permission
        if (TYPE_DATA_SYNC.equals(serviceType)) {
            return false;
        }
        // location and mediaPlayback require additional type-specific permissions
        return TYPE_LOCATION.equals(serviceType) || TYPE_MEDIA_PLAYBACK.equals(serviceType);
    }
}
