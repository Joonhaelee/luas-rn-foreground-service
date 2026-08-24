package space.luas.rnforegroundservice;

/**
 * Constants used throughout the foreground service module
 */
public class Constants {
        // Bundle keys
        static final String NOTIFICATION_CONFIG = "rnfs.notification_config";
        static final String HEADLESS_TASK_CONFIG = "rnfs.headless_task_config";
        // Service actions
        static final String ACTION_FOREGROUND_SERVICE_START = "rnfs.service_start";
        static final String ACTION_FOREGROUND_SERVICE_STOP = "rnfs.service_stop";
        static final String ACTION_RUN_HEADLESS_TASK = "rnfs.service_headless_run_task";
        static final String ACTION_UPDATE_NOTIFICATION = "rnfs.service_update_notification";
        // User actions
        static final String ACTION_NOTIFICATION_DISMISSED = "rnfs.NOTIFICATION_DISMISSED";
        static final String ACTION_NOTIFICATION_BUTTON1 = "rnfs.NOTIFICATION_BUTTON1";
        static final String ACTION_NOTIFICATION_BUTTON2 = "rnfs.NOTIFICATION_BUTTON2";
        // Error codes
        static final String ERROR_INVALID_CONFIG = "ERROR_INVALID_CONFIG";
        static final String ERROR_SERVICE_ERROR = "ERROR_SERVICE_ERROR";
        static final String ERROR_PERMISSION_DENIED = "ERROR_PERMISSION_DENIED";

        static final int HEADLESS_TASK_DEFAULT_TIMEOUT = 8000; // 8 seconds
        static final int HEADLESS_TASK_DEFAULT_INTERVAL = 10000; // 10 seconds
}
