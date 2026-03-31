import React from 'react';
import { Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRNForegroundService, type TaskRunInfo } from '@luas/rn-foreground-service';
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
        removeAllTasks,
    } = useRNForegroundService(notificationChannels);

    const [tasks, setTasks] = React.useState<Partial<TaskRunInfo>[]>([]);

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
        console.log(`[${new Date().toISOString()}] taskRunner called`, taskInfo);
        setTasks((prev) => prev.map((t) => (t.taskId === taskInfo.taskId ? taskInfo : t)));
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.text}>Service is running: {isRunning ? 'true' : 'false'}</Text>
            {/* Start Foreground Service */}
            <Pressable
                onPress={async () => {
                    try {
                        await startService({
                            channelId: serviceNotificationChannel.channelId,
                            title: 'Start',
                            body: new Date().toISOString(),
                            ongoing: true,
                            button1: {
                                label: 'button1',
                                value: 'button1Value',
                            },
                            button2: {
                                label: 'button2',
                                value: 'button2Value',
                            },
                            progress: {
                                max: 100,
                                curr: 0,
                            },
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={[styles.button, styles.buttonBlue]}
            >
                <Text style={styles.buttonText}>Start foreground service</Text>
            </Pressable>
            {/* Update Foreground Service Notification with same notification Id */}
            <Pressable
                onPress={async () => {
                    try {
                        await updateServiceNotification({
                            channelId: serviceNotificationChannel.channelId,
                            title: 'Updated',
                            body: new Date().toISOString(),
                            button1: {
                                label: 'button10',
                                value: 'button10Value',
                            },
                            button2: {
                                label: 'button11',
                                value: 'button11Value',
                            },
                            progress: {
                                max: 100,
                                curr: 20,
                            },
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>{`Update service notification\nwith same id`}</Text>
            </Pressable>
            {/* Update Foreground Service Notification with different notification Id */}
            <Pressable
                style={styles.button}
                onPress={async () => {
                    try {
                        await updateServiceNotification({
                            id:
                                (serviceNotificationChannel.defaultNotification?.id ?? 0) +
                                Math.floor(Math.random() * (100000 - 1)),
                            channelId: serviceNotificationChannel.channelId,
                            title: `ID=${9999} Updated`,
                            body: new Date().toISOString(),
                            button1: {
                                label: 'button20',
                                value: 'button20Value',
                            },
                            button2: {
                                label: 'button21',
                                value: 'button21Value',
                            },
                            progress: {
                                max: 100,
                                curr: 40,
                            },
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
            >
                <Text style={styles.buttonText}>{`Update service notification\nwith different id`}</Text>
            </Pressable>
            <Text style={styles.text}>Use "React Native DevTools" to see task callback</Text>
            <Pressable
                style={styles.button}
                onPress={async () => {
                    try {
                        const taskId = addTask(taskRunner, {
                            taskName: 'myTask',
                            taskParam: { param1: 'value1' },
                            interval: 5000,
                            repeat: true,
                            onSuccess: () => {
                                console.log(`ForegroundServiceManager.task() onSuccess()`);
                            },
                            onError: (error: Error) => {
                                console.log(`ForegroundServiceManager.task() onError()`, error);
                            },
                        });
                        setTasks((prev) => [...prev, { taskId, tickCount: 0 }]);
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
            >
                <Text style={styles.buttonText}>Add task (every 5 seconds)</Text>
            </Pressable>
            <Text style={styles.text}>{tasks.map((task) => `${task.taskId}:tick=${task.tickCount}`).join(`\n`)}</Text>
            <Pressable
                style={styles.button}
                onPress={async () => {
                    removeAllTasks();
                    setTasks([]);
                }}
            >
                <Text style={styles.buttonText}>Remove task</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    await cancelAllNotifications();
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Cancel all notifications</Text>
            </Pressable>
            {/* Stop service */}
            <Pressable
                style={[styles.button, styles.buttonRed]}
                onPress={async () => {
                    try {
                        await stopService();
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
            >
                <Text style={styles.buttonText}>{`Stop foreground service`}</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'stretch',
        justifyContent: 'center',
        marginTop: 16,
    },
    button: {
        backgroundColor: '#2196F3',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        paddingVertical: 8,
        marginVertical: 8,
    },
    buttonBlue: {
        backgroundColor: '#00F',
    },
    buttonRed: {
        backgroundColor: '#F00',
    },

    buttonText: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        textAlign: 'center',
    },
    separator: {
        marginVertical: 8,
    },
});
