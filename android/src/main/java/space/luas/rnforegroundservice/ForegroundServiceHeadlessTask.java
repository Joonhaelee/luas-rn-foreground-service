package space.luas.rnforegroundservice;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

import javax.annotation.Nullable;

/**
 * Service that handles headless JavaScript task execution
 *
 * This service extends React Native's HeadlessJsTaskService to run
 * JavaScript tasks in the background without requiring UI.
 *
 * Tasks are registered via AppRegistry.registerHeadlessTask() in JavaScript.
 */
public class ForegroundServiceHeadlessTask extends HeadlessJsTaskService {
    private static final boolean debugTick = false;
    private static int tickCount = 0;
    private static final String TAG = "ForegroundServiceHeadlessTask";
    private static final int DEFAULT_TIMEOUT = 60000; // 60 seconds

    /**
     * Configure the headless JS task from intent extras
     *
     * @param intent Intent containing task configuration in extras
     * @return HeadlessJsTaskConfig or null if configuration is invalid
     */
    @Nullable
    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        assert intent != null;
        tickCount += 1;
        Bundle extras = intent.getExtras();
        if (extras == null) {
            Log.e(TAG, "getTaskConfig: extras bundle is null");
            return null;
        }

        String taskName = extras.getString("taskName");
        if (taskName == null || taskName.isEmpty()) {
            Log.e(TAG, "getTaskConfig: taskName is null or empty");
            return null;
        }

        // Get timeout from extras or use default
        int timeout = extras.getInt("timeout", DEFAULT_TIMEOUT);

        // Get allowedInForeground flag (default true for foreground service tasks)
        boolean allowedInForeground = extras.getBoolean("allowedInForeground", true);

        if (debugTick || tickCount == 1) {
            Log.d(TAG, String.format(
                "Creating HeadlessJsTaskConfig - taskName: %s, timeout: %d, allowedInForeground: %b, tickCount: %d",
                taskName, timeout, allowedInForeground, tickCount
            ));
        }

        return new HeadlessJsTaskConfig(
            taskName,
            Arguments.fromBundle(extras),
            timeout,
            allowedInForeground
        );
    }
}
