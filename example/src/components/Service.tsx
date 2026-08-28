import React from 'react';
import { Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { RNForegroundServiceManager as rnfsMgr, generateRandomId, type TaskInfo } from '@luas/rn-foreground-service';
import { serviceNotificationChannel } from '../notificationConfig';

export function Service() {
    const [isRunning, setIsRunning] = React.useState<boolean>(() => rnfsMgr.isRunning());
    const [latestNotificationId, setLatestNotificationId] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        return rnfsMgr.subscribeNotificationOnPressEvent(async (e: any) => {
            if (e.id !== undefined) {
                try {
                    // notificaiton 을 cancel 해도 foreground service 가 중단되지 않습니다.
                    console.log('notification pressed', e);
                    // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
                } catch (e: any) {
                    // console.log('cancelNotification error', e);
                }
            }
        });
    }, []);

    const taskRunner = React.useCallback((taskInfo: TaskInfo) => {
        console.log(`[${new Date().toISOString()}] taskRunner called`, taskInfo);
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.text}>Service is running: {isRunning ? 'true' : 'false'}</Text>
            {/* Start Foreground Service */}
            <Pressable
                onPress={async () => {
                    try {
                        // if id not provided, the default service notification id used
                        const id = await rnfsMgr.startService(
                            taskRunner,
                            {
                                taskId: generateRandomId(),
                                taskName: 'MyTask',
                                interval: 10000,
                            },
                            {
                                channelId: serviceNotificationChannel.channelId,
                                title: 'Service started',
                                body: 'The notification will be cleared when service stopped',
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
                            }
                        );
                        setLatestNotificationId(id);
                        setIsRunning(rnfsMgr.isRunning());
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={[styles.button, styles.buttonBlue]}
            >
                <Text style={styles.buttonText}>Start foreground service with 10s task</Text>
            </Pressable>
            {/* Update Foreground Service Notification with same notification Id */}
            <Pressable
                onPress={async () => {
                    try {
                        await rnfsMgr.updateServiceNotification({
                            id: latestNotificationId,
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
                <Text style={styles.buttonText}>{`Update service notification`}</Text>
            </Pressable>
            {/* Update Foreground Service Notification with same notification Id and dismiss it 5 seconds after */}
            <Pressable
                onPress={async () => {
                    try {
                        await rnfsMgr.updateServiceNotification({
                            id: latestNotificationId,
                            channelId: serviceNotificationChannel.channelId,
                            title: 'Updated Auto Dismiss',
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
                            timeoutAfter: 5000,
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>{`Update service notification\nAnd dismiss it 5 seconds after`}</Text>
            </Pressable>
            {/* Update Foreground Service Notification with different notification Id */}
            <Pressable
                style={styles.button}
                onPress={async () => {
                    const id = generateRandomId();
                    try {
                        await rnfsMgr.updateServiceNotification({
                            id,
                            channelId: serviceNotificationChannel.channelId,
                            title: `ID=${id} Updated`,
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
                <Text style={styles.buttonText}>{`Add notification to service\nwith different id`}</Text>
            </Pressable>
            <Text style={styles.text}>Use "React Native DevTools" to see task callback</Text>

            <Pressable
                onPress={async () => {
                    await rnfsMgr.cancelAllNotifications();
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
                        await rnfsMgr.stopService();
                        setIsRunning(rnfsMgr.isRunning());
                    } catch (e: any) {
                        console.log('error. ' + e.message);
                        Alert.alert('error. ' + e.message);
                    }
                }}
            >
                <Text style={styles.buttonText}>{`Stop foreground service`}</Text>
            </Pressable>
            {/* Stop service */}
            <Pressable
                style={[styles.button, styles.buttonRed]}
                onPress={async () => {
                    try {
                        const id = generateRandomId();
                        await rnfsMgr.stopService({
                            id,
                            channelId: serviceNotificationChannel.channelId,
                            title: `After notification`,
                            body: 'The notification will be cleared after 10s',
                            timeoutAfter: 10000,
                        });
                        setIsRunning(rnfsMgr.isRunning());
                    } catch (e: any) {
                        console.log('error. ' + e.message);
                        Alert.alert('error. ' + e.message);
                    }
                }}
            >
                <Text style={styles.buttonText}>{`Stop foreground service with notification`}</Text>
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
