import React from 'react';
import { Text, StyleSheet, Pressable, ScrollView, Alert, View } from 'react-native';
import { useRNNotification } from '@luas/rn-foreground-service';
import { miscNotificationChannel, notificationChannels } from '../notificationConfig';

export function Notification() {
    const [latestNotificationId, setLatestNotificationId] = React.useState<number | undefined>(undefined);
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

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text>{`In this page, all notification will be posted with the channel "misc"`}</Text>
            <View style={styles.separator} />
            <Text>{`Latest posted notification id=${latestNotificationId}`}</Text>
            <Pressable
                onPress={async () => {
                    const message = `${new Date().toISOString()}
Notification message Notification message Notification message Notification message Notification message Notification message Notification message Notification message`;
                    const longMessage = message;
                    try {
                        const id = await postNotification({
                            channelId: miscNotificationChannel.channelId,
                            title: `New Notification`,
                            body: message,
                            longBody: longMessage,
                            ongoing: true,
                            autoCancel: false,
                        });
                        setLatestNotificationId(id);
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>{`New notification\nongoing=true, autoCancel=false`}</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    const message = `${new Date().toISOString()}
Notification message Notification message Notification message Notification message Notification message Notification message Notification message Notification message`;
                    const longMessage = message;
                    try {
                        const id = await postNotification({
                            channelId: miscNotificationChannel.channelId,
                            title: `New Notification`,
                            body: message,
                            longBody: longMessage,
                            ongoing: false,
                            autoCancel: true,
                        });
                        setLatestNotificationId(id);
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>{`New notification\nongoing=false, autoCancel=true`}</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    if (latestNotificationId === undefined) {
                        Alert.alert('no previous notification');
                    } else {
                        const message = `${new Date().toISOString()}
Notification message Notification message Notification message Notification message Notification message Notification message Notification message Notification message`;

                        try {
                            await postNotification({
                                channelId: miscNotificationChannel.channelId,
                                id: latestNotificationId,
                                title: '(title) Same Notification',
                                body: message,
                            });
                        } catch (e: any) {
                            Alert.alert('error. ' + e.message);
                        }
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Notification with the latest id</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    const message = `${new Date().toISOString()} Notification message`;
                    try {
                        await postNotification({
                            channelId: miscNotificationChannel.channelId,
                            title: '(button) Notification',
                            body: message,
                            button1: {
                                label: 'button100',
                                value: 'button100Value',
                            },
                            button2: {
                                label: 'button101',
                                value: 'button101Value',
                            },
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Notification with buttons</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    const message = `${new Date().toISOString()} Notification message`;
                    try {
                        await postNotification({
                            channelId: miscNotificationChannel.channelId,
                            title: '(largeIcon) Notification',
                            body: message,
                            largeIcon: 'ic_launcher',
                            ongoing: true,
                            autoCancel: false,
                            progress: {
                                max: 100,
                                curr: 50,
                            },
                        });
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Notification with progress</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    if (latestNotificationId !== undefined) {
                        await cancelNotification(latestNotificationId);
                        setLatestNotificationId(undefined);
                    }
                }}
                style={[styles.button, styles.cancelButton]}
            >
                <Text style={styles.buttonText}>Cancel latest notification</Text>
            </Pressable>
            <Pressable
                onPress={async () => {
                    await cancelAllNotifications();
                }}
                style={[styles.button, styles.cancelButton]}
            >
                <Text style={styles.buttonText}>Cancel all notifications</Text>
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
    cancelButton: {
        backgroundColor: '#FF3333',
    },
    buttonText: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
    },
    separator: {
        marginVertical: 8,
    },
});
