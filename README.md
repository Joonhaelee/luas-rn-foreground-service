# @luas/rn-foreground-service

Modern React Native foreground service library with TurboModule support. Full Android 14 compliance with task management, customizable notifications, and event handling, periodic task.

-   Android only.

## forked from [**@kirenpaul/react-native-foreground-service-turbo**](<[http](https://www.npmjs.com/package/@kirenpaul/react-native-foreground-service-turbo)>)

-   Most of features came from original package and totaly inspired from it.
-   Some of functions are simplified and customized.
-   Prior android 8 compatability removed.
-   Full running sample added.

## Features

-   ✅ **TurboModule Architecture** - Built with React Native New Architecture (0.83)
-   ✅ **Supported Android Version** - Android 9+, API level 28+
-   ✅ **Task Management** - Execute multiple tasks concurrently with looping support
-   ✅ **Rich Notifications** - Customizable with buttons, progress bars, colors
-   ✅ **Event Handling** - React to notification and button interactions
-   ✅ **TypeScript** - Full type definitions included
-   ✅ **Auto Setup** - Postinstall script configures AndroidManifest.xml

### modified features from original packge

-   ✅ **Hooks** - add hooks for easy use.
-   ✅ **Post notification** - add post notification function regardless foreground service.
-   ✅ **Notification Channel Management** - to make it clear, the notification channel must be registered prior post any notification.

## Installation

```sh
$> yarn add @luas/rn-foreground-service
or
$> npm install @luas/rn-foreground-service
```

**Requirements:**

-   React Native 0.68+ or higher. tested on 0.83
-   New architecture(turbo module) only
-   Android minSdk 28 (Android 9+)
-   Android targetSdk 36 (Android 16)

## Who has experience with Android foreground services and notifications

-   Running sample may enough for you

### Clone and run example

```sh
$> git clone https://github.com/Joonhaelee/luas-rn-foreground-service.git
$> cd luas-rn-foreground-service
$> yarn install
$> cd example
$> yarn install
$> yarn android
```

## Quick Start

### 1. Register the headless task for service

In your `index.js` or `index.tsx`:

```typescript
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './App';
import { RNForegroundServiceManager } from 'luas-rn-foreground-service';

// Register headless task for foreground service BEFORE registering app component
// if you don't use foreground service, it is not required.
RNForegroundServiceManager.registerHeadlessTask();

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

### 3. Prepare Notification Channel

-   BEFORE start service or post notification, the notification channel MUST be registered!!!.
-   look example/src/components/Channels.tsx
-   highly recommend to use "useRNNotificationChannel" hook.

#### 3.1 define channels

-   look example/src/notificationConfig.ts

```typescript
import { ChannelNotificationConfig } from 'luas-rn-foreground-service';

export const serviceNotificationChannel: ChannelNotificationConfig = {
    channelId: 'foregroundService',
    channelName: 'ForegroundService',
    channelDescription: 'ForegroundService description',
    defaultNotification: {
        id: 9876,
        serviceType: 'dataSync',
        icon: 'notification_icon',
    },
};

export const miscNotificationChannel: ChannelNotificationConfig = {
    channelId: 'misc',
    channelName: 'Misc',
    channelDescription: 'Misc description',
    defaultNotification: {
        icon: 'notification_icon',
    },
};

export const notificationChannels: ChannelNotificationConfig[] = [serviceNotificationChannel, miscNotificationChannel];
```

#### 3.2 create channels

-   createNotificationChannels() skips if given channel exist already.
-   for details of channel, look android notification official document.

```typescript
import { useRNNotificationChannels } from 'luas-rn-foreground-service';
import { notificationChannels } from '../notificationConfig';

export function YourComponentOrApp() {
    const {
            getNotificationChannels,
            createNotificationChannels,
            deleteNotificationChannels,
            notificationChannelsExist,
        } = useRNNotificationChannels();
    ...
    React.useEffect(() => {
            createNotificationChannels(notificationChannels);
    }, [createNotificationChannels]);
    ...
}
```

### 4. Using Foreground Service & Notification & Task

-   look example/src/components/Service.tsx
-   highly recommend to use "useRNForegroundService" hook.

```typescript
import { useRNForegroundService, type TaskRunInfo } from 'luas-rn-foreground-service';
import { notificationChannels, serviceNotificationChannel } from '../notificationConfig';

export function Service() {
    const {
        isRunning,
        addOnNotificationPress,
        startService,
        stopService,
        updateServiceNotification,
        cancelNotification,
        cancelAllNotifications,
        addTask,
        removeTask,
        removeAllTasks,
    } = useRNForegroundService(notificationChannels);

    React.useEffect(() => {
        return addOnNotificationPress(async (e) => {
            if (e.id !== undefined) {
                try {
                    await cancelNotification(e.id);
                    // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
                } catch (e: any) {
                    console.log('cancelNotification error', e);
                }
            }
        });
    }, [addOnNotificationPress, cancelNotification]);

    const taskRunner = React.useCallback((taskInfo: TaskRunInfo) => {
        console.log(`[${new Date().toISOString()}] task runner called`, taskInfo);
        ... any your task
    }, []);

    ### start service
    await startService({...});

    ### stop service
    await stopService();

    ### add task, remove
    const taskId = addTask(taskRunner, {....})
    removeTask(taskId);
    removeAllTasks();
}
```

### 4. Post notification regardless Foreground Service

-   look example/src/components/Notification.tsx
-   highly recommend to use "useRNNotification" hook.
-

```typescript

import { useRNNotification } from 'luas-rn-foreground-service';
import { notificationChannels, serviceNotificationChannel } from '../notificationConfig';

export function Notification() {

    const { addOnNotificationPress, postNotification, cancelNotification, cancelAllNotifications } =
            useRNNotification(notificationChannels);

    React.useEffect(() => {
        return addOnNotificationPress(async (e) => {
            if (e.id !== undefined) {
                try {
                    await cancelNotification(e.id);
                    // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
                } catch (e: any) {
                    console.log('cancelNotification error', e);
                }
            }
        });
    }, [addOnNotificationPress, cancelNotification]);

    ### start service
    await postNotification({...});
    ...
}

## Contributing

-   [Development workflow](CONTRIBUTING.md#development-workflow)
-   [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
-   [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
```
