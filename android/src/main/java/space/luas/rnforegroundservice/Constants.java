package space.luas.rnforegroundservice;

/**
 * Constants used throughout the foreground service module
 */
public class Constants {
        // Bundle keys
        static final String NOTIFICATION_CONFIG = "rnforegroundservice.notification_config";
        static final String HEADLESS_TASK_CONFIG = "rnforegroundservice.headless_task_config";
        // Service actions
        static final String ACTION_FOREGROUND_SERVICE_START =
                        "rnforegroundservice.service_start";
        static final String ACTION_RUN_HEADLESS_TASK =
                        "rnforegroundservice.service_headless_run_task";
        static final String ACTION_UPDATE_NOTIFICATION =
                        "rnforegroundservice.service_update_notification";
        // Error codes
        static final String ERROR_INVALID_CONFIG = "ERROR_INVALID_CONFIG";
        static final String ERROR_SERVICE_ERROR = "ERROR_SERVICE_ERROR";
        static final String ERROR_PERMISSION_DENIED = "ERROR_PERMISSION_DENIED";

}
