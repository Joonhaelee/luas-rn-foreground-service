# @kirenpaul/react-native-foreground-service-turbo

Modern React Native foreground service library with TurboModule support. Full Android 14 compliance with task management, customizable notifications, and event handling.

[![NPM Version](https://img.shields.io/npm/v/@kirenpaul/react-native-foreground-service-turbo.svg)](https://www.npmjs.com/package/@kirenpaul/react-native-foreground-service-turbo)
[![CI](https://github.com/paulkiren/react-native-foreground-service-turbo/actions/workflows/ci.yml/badge.svg)](https://github.com/paulkiren/react-native-foreground-service-turbo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/paulkiren/react-native-foreground-service-turbo/branch/main/graph/badge.svg)](https://codecov.io/gh/paulkiren/react-native-foreground-service-turbo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://www.android.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.68+-blue.svg)](https://reactnative.dev/)

## Features

-   ✅ **TurboModule Architecture** - Built for React Native New Architecture (0.68+)
-   ✅ **Android 14 Compliant** - Full support for foreground service types
-   ✅ **Android 13 Ready** - POST_NOTIFICATIONS permission handling
-   ✅ **Task Management** - Execute multiple tasks concurrently with looping support
-   ✅ **Rich Notifications** - Customizable with buttons, progress bars, colors
-   ✅ **Event Handling** - React to notification and button interactions
-   ✅ **TypeScript** - Full type definitions included
-   ✅ **Auto Setup** - Postinstall script configures AndroidManifest.xml
-   ✅ **100% Feature Parity** - All features from legacy library maintained

## Installation

```bash
npm install @kirenpaul/react-native-foreground-service-turbo
```

or

```bash
yarn add @kirenpaul/react-native-foreground-service-turbo
```

**Requirements:**

-   React Native 0.68.0 or higher
-   Android minSdk 25 (Android 7.1+)
-   Android targetSdk 34 (Android 14)

## Quick Start

### 1. Register the Service

In your `index.js` or `index.tsx`:

```typescript
import ForegroundService from '@kirenpaul/react-native-foreground-service-turbo';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './App';

// Register foreground service BEFORE registering app component
ForegroundService.register();

AppRegistry.registerComponent(appName, () => App);
```

### 2. Request Permission (Android 13+)

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestNotificationPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
}
```

### 3. Start the Service

```typescript
import ForegroundService from '@kirenpaul/react-native-foreground-service-turbo';

async function startService() {
    // Request permission first (Android 13+)
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
        console.error('Notification permission denied');
        return;
    }

    // Start foreground service
    await ForegroundService.start({
        id: 1,
        title: 'My Service',
        message: 'Running in background',
        serviceType: 'dataSync', // Required for Android 14+
    });
}
```

## Complete API Reference

### Core Service Methods

#### `register()`

Register the foreground service task runner. **Must be called before `start()`**.

```typescript
ForegroundService.register();
```

#### `start(config)`

Start the foreground service with a notification.

```typescript
await ForegroundService.start({
    id: 1,
    title: 'Service Title',
    message: 'Service is running',
    serviceType: 'dataSync', // Required for Android 14+

    // Optional
    icon: 'ic_notification',
    largeIcon: 'ic_launcher',
    importance: 'high',
    visibility: 'public',
    vibration: false,
    number: '1',
    color: '#00ff00',
    setOnlyAlertOnce: true,

    // Progress bar
    progress: {
        max: 100,
        curr: 50,
    },

    // Action buttons
    button: {
        text: 'Pause',
        onPressEvent: 'pause',
    },
    button2: {
        text: 'Stop',
        onPressEvent: 'stop',
    },
    mainOnPress: 'open',
});
```

**Service Types (Android 14+):**

-   `'dataSync'` - For data synchronization (default)
-   `'location'` - For location tracking (requires `FOREGROUND_SERVICE_LOCATION` permission)
-   `'mediaPlayback'` - For media playback (requires `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission)

#### `update(config)`

Update the notification of a running service.

```typescript
await ForegroundService.update({
    id: 1,
    title: 'Updated Title',
    message: 'Progress: 75%',
    progress: { max: 100, curr: 75 },
});
```

#### `stop()`

Stop the service. If `start()` was called multiple times, `stop()` must be called the same number of times.

```typescript
await ForegroundService.stop();
```

#### `stopAll()`

Force stop the service regardless of start counter.

```typescript
await ForegroundService.stopAll();
```

#### `is_running()`

Check if the service is currently running.

```typescript
const running = ForegroundService.is_running();
```

### Task Management

#### `add_task(task, options)`

Add a task to the execution queue.

```typescript
const taskId = ForegroundService.add_task(
    async () => {
        // Your background work
        const data = await fetchData();
        processData(data);
    },
    {
        delay: 5000, // Run every 5 seconds
        onLoop: true, // Repeat indefinitely
        taskId: 'my-task',
        onSuccess: () => console.log('Task completed'),
        onError: (error) => console.error('Task failed:', error),
    }
);
```

**Options:**

-   `delay` (number) - Delay before first execution in milliseconds (default: 5000)
-   `onLoop` (boolean) - Whether to repeat the task (default: true)
-   `taskId` (string) - Unique task identifier (default: auto-generated)
-   `onSuccess` (function) - Callback on successful completion
-   `onError` (function) - Callback on error

#### `update_task(task, options)`

Update an existing task.

```typescript
ForegroundService.update_task(() => console.log('Updated task'), {
    taskId: 'my-task',
    delay: 10000, // Change to 10 seconds
});
```

#### `remove_task(taskId)`

Remove a task from the queue.

```typescript
ForegroundService.remove_task('my-task');
```

#### `is_task_running(taskId)`

Check if a task exists in the queue.

```typescript
const exists = ForegroundService.is_task_running('my-task');
```

#### `get_task(taskId)`

Get a task by ID.

```typescript
const task = ForegroundService.get_task('my-task');
```

#### `get_all_tasks()`

Get all tasks in the queue.

```typescript
const allTasks = ForegroundService.get_all_tasks();
```

#### `remove_all_tasks()`

Remove all tasks from the queue.

```typescript
ForegroundService.remove_all_tasks();
```

### Notification Management

#### `cancel_notification(id)`

Cancel a specific notification.

```typescript
await ForegroundService.cancel_notification(1);
```

#### `eventListener(callback)`

Listen for notification interaction events.

```typescript
useEffect(() => {
    const cleanup = ForegroundService.eventListener((event) => {
        if (event.main) {
            // Main notification tapped
            navigation.navigate('Home');
        }

        if (event.button === 'pause') {
            // Pause button tapped
            handlePause();
        }

        if (event.button === 'stop') {
            // Stop button tapped
            ForegroundService.stop();
        }
    });

    return cleanup; // Cleanup on unmount
}, []);
```

## Complete Examples

### Download Manager

```typescript
import ForegroundService from '@kirenpaul/react-native-foreground-service-turbo';

class DownloadManager {
    async startDownload(url: string, filename: string) {
        // Start service
        await ForegroundService.start({
            id: 1,
            title: 'Download Manager',
            message: `Downloading ${filename}`,
            serviceType: 'dataSync',
            button: { text: 'Cancel', onPressEvent: 'cancel' },
            progress: { max: 100, curr: 0 },
        });

        // Add download task
        ForegroundService.add_task(
            async () => {
                const progress = await this.downloadChunk(url);

                // Update progress
                await ForegroundService.update({
                    id: 1,
                    title: 'Download Manager',
                    message: `${progress}% complete`,
                    progress: { max: 100, curr: progress },
                });

                if (progress >= 100) {
                    ForegroundService.remove_task('download');
                    await ForegroundService.stop();
                }
            },
            {
                delay: 1000,
                onLoop: true,
                taskId: 'download',
            }
        );
    }

    async downloadChunk(url: string): Promise<number> {
        // Your download logic
        return 0;
    }
}
```

### Location Tracker

```typescript
import ForegroundService from '@kirenpaul/react-native-foreground-service-turbo';
import Geolocation from '@react-native-community/geolocation';

async function startLocationTracking() {
    await ForegroundService.start({
        id: 2,
        title: 'Location Tracking',
        message: 'Tracking your location',
        serviceType: 'location', // Use 'location' service type
        icon: 'ic_location',
        importance: 'low',
        button: { text: 'Stop', onPressEvent: 'stop_tracking' },
    });

    ForegroundService.add_task(
        () => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    sendLocationToServer(latitude, longitude);
                },
                (error) => console.error('Location error:', error)
            );
        },
        {
            delay: 30000, // Every 30 seconds
            onLoop: true,
            taskId: 'location',
        }
    );
}
```

## Android Setup Details

The postinstall script automatically configures your `AndroidManifest.xml`, but you may need to verify:

### Required Permissions

```xml
<!-- Base permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Android 13+ -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Android 14+ - Add only what you need -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

### Service Declarations

```xml
<application>
  <!-- Metadata -->
  <meta-data
    android:name="com.kirenpaul.foregroundservice.notification_channel_name"
    android:value="Foreground Service" />
  <meta-data
    android:name="com.kirenpaul.foregroundservice.notification_channel_description"
    android:value="Persistent notification for foreground service" />
  <meta-data
    android:name="com.kirenpaul.foregroundservice.notification_color"
    android:resource="@color/notification_color" />

  <!-- Services -->
  <service
    android:name="com.kirenpaul.foregroundservice.ForegroundService"
    android:exported="false"
    android:foregroundServiceType="dataSync|location|mediaPlayback" />
  <service
    android:name="com.kirenpaul.foregroundservice.ForegroundServiceTask"
    android:exported="false" />
</application>
```

## Troubleshooting

### Service crashes on Android 14

**Cause:** Missing `serviceType` parameter

**Solution:** Always specify `serviceType` when starting the service:

```typescript
await ForegroundService.start({
    id: 1,
    title: 'My Service',
    message: 'Running',
    serviceType: 'dataSync', // Required!
});
```

### Notifications don't show on Android 13+

**Cause:** POST_NOTIFICATIONS permission not granted

**Solution:** Request permission before starting service:

```typescript
const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
```

### "POST_NOTIFICATIONS permission not granted" error

**Cause:** Permission not requested or denied

**Solution:** Check permission before starting:

```typescript
const hasPermission = await requestNotificationPermission();
if (!hasPermission) {
    // Handle permission denied
}
```

### Tasks not executing

**Cause:** Service not started or task delay too short

**Solution:**

-   Ensure service is running: `ForegroundService.is_running()`
-   Set delay ≥ 500ms (sampling interval)
-   Check task doesn't throw unhandled errors

## Migration from v2.x

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide from `@kirenpaul/rn-foreground-service`.

**Key Changes:**

-   Requires React Native 0.68+
-   `serviceType` required for Android 14+
-   POST_NOTIFICATIONS permission required for Android 13+
-   TurboModule architecture

## Platform Support

-   ✅ Android 7.1+ (API 25+)
-   ❌ iOS (foreground services are Android-specific)

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT © Kiren Paul

## Acknowledgments

Based on the original work by [Raja Osama (supersami)](https://github.com/raja0sama).

## Links

-   [GitHub Repository](https://github.com/paulkiren/react-native-foreground-service-turbo)
-   [NPM Package](https://www.npmjs.com/package/@kirenpaul/react-native-foreground-service-turbo)
-   [Issue Tracker](https://github.com/paulkiren/react-native-foreground-service-turbo/issues)
