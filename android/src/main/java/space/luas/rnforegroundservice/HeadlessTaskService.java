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
public class HeadlessTaskService extends HeadlessJsTaskService {
    private static final boolean debugTick = true;
    private static int tickCount = 0;
    private static final String TAG = "HeadlessTaskService";

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
            Log.e(TAG, "getTaskConfig(): extras bundle is null");
            return null;
        }

        // get headless task name
        String headlessTaskKey = extras.getString("headlessTaskKey");
        // get timeout from extras or use default
        int timeout = (int) extras.getDouble("timeout", Constants.HEADLESS_TASK_DEFAULT_TIMEOUT);
        // get allowedInForeground flag (default true for foreground service tasks)
        boolean allowedInForeground = extras.getBoolean("allowedInForeground", true);

        if (headlessTaskKey == null || headlessTaskKey.isEmpty()) {
            Log.e(TAG, "getTaskConfig(): headlessTaskKey can not be null or empty");
            return null;
        }

        if (debugTick || tickCount == 1) {
            Log.d(TAG, String.format(
                "getTaskConfig(). Creating HeadlessJsTaskConfig - headlessTaskKey: %s, timeout: %d, allowedInForeground: %b, tickCount: %d",
                headlessTaskKey, timeout, allowedInForeground, tickCount
            ));
        }
        return new HeadlessJsTaskConfig(
            headlessTaskKey,
            Arguments.fromBundle(extras),
            timeout,
            allowedInForeground
        );
    }
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Log.d(TAG, "onStartCommand()");
        return super.onStartCommand(intent, flags, startId);
    }

    @Override
    public void onDestroy() {
        // Log.d(TAG, "onDestroy()");
        super.onDestroy();
    }
    @Override
    public void onHeadlessJsTaskFinish(int taskId) {
        // Log.d(TAG, "onHeadlessJsTaskFinish()");
        super.onHeadlessJsTaskFinish(taskId);
    }
}
