import React from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { Channels } from './components/Channels';
import { Service } from './components/Service';
import { Notification } from './components/Notification';

export default function App() {
    const [mode, setMode] = React.useState<'channel' | 'service' | 'notification'>('service');

    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                <Pressable
                    onPress={() => {
                        setMode('channel');
                    }}
                    style={[styles.tab, mode === 'channel' ? styles.activeTab : undefined]}
                >
                    <Text style={styles.tabText}>Channel</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        setMode('service');
                    }}
                    style={[styles.tab, mode === 'service' ? styles.activeTab : undefined]}
                >
                    <Text style={styles.tabText}>Service</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        setMode('notification');
                    }}
                    style={[styles.tab, mode === 'notification' ? styles.activeTab : undefined]}
                >
                    <Text style={styles.tabText}>Notification</Text>
                </Pressable>
            </View>
            {mode === 'channel' ? <Channels /> : mode === 'service' ? <Service /> : <Notification />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        columnGap: 4,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        paddingVertical: 8,
        borderBottomColor: 'silver',
        borderBottomWidth: 4,
    },
    tabText: { fontSize: 16, textAlign: 'center' },
    activeTab: {
        borderBottomColor: '#333',
    },
    button: {
        backgroundColor: 'purple',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        paddingVertical: 8,
    },
    buttonText: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
    },
    separator: {
        marginVertical: 8,
        // borderBottomColor: '#737373',
        // borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
