import React from 'react';
import { Text, View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRNNotificationChannels, type RNNotificationChannel } from 'luas-rn-foreground-service';
import { notificationChannels } from '../notificationConfig';

function Channel(channel: { channel: RNNotificationChannel }) {
    return (
        <View>
            <Text>{JSON.stringify(channel, null, 2)}</Text>
        </View>
    );
}

export function Channels() {
    const {
        getNotificationChannels,
        createNotificationChannels,
        deleteNotificationChannels,
        notificationChannelsExist,
    } = useRNNotificationChannels();

    const [channels, setChannels] = React.useState<RNNotificationChannel[]>([]);
    React.useEffect(() => {
        const func = async () => {
            setChannels(await getNotificationChannels());
        };
        func();
    }, [getNotificationChannels]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* create channels */}
            <Pressable
                onPress={async () => {
                    try {
                        await createNotificationChannels(notificationChannels);
                        setChannels(await getNotificationChannels());
                        Alert.alert('channels created');
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Create notification channels</Text>
            </Pressable>
            {/* delete channels */}
            <Pressable
                onPress={async () => {
                    try {
                        await deleteNotificationChannels(notificationChannels.map((ch) => ch.channelId));
                        setChannels(await getNotificationChannels());
                        Alert.alert('channels deleted');
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Delete notification channels</Text>
            </Pressable>
            {/* check channels */}
            <Pressable
                onPress={async () => {
                    try {
                        const rts = await notificationChannelsExist(notificationChannels.map((ch) => ch.channelId));
                        Alert.alert(notificationChannels.map((ch, i) => `${ch.channelName}: ${rts[i]}`).join(`\n`));
                    } catch (e: any) {
                        Alert.alert('error. ' + e.message);
                    }
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Check notification channels exist</Text>
            </Pressable>
            {/* get channels */}

            <Text style={styles.text}>Registered notification shannels</Text>
            {channels.map((ch) => {
                return <Channel key={ch.channelId} channel={ch} />;
            })}
            <View style={styles.separator} />
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
    buttonText: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        color: '#00F',
        textAlign: 'center',
        marginVertical: 8,
    },
    separator: {
        marginVertical: 8,
    },
});
