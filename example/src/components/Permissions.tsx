import { Text, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { RESULTS, type PermissionStatus } from 'react-native-permissions';

function getPermStatus(perm: string, perms?: Record<string, PermissionStatus>) {
    if (perms && perms[perm]) {
        return perms[perm];
    }
    return RESULTS.UNAVAILABLE;
}

type Props = {
    loading?: boolean;
    perms?: Record<string, PermissionStatus>;
    onReload?: () => void;
    onRequest?: () => void;
    onConfirm: () => void;
};
export function Permissions({ loading, perms, onConfirm, onReload, onRequest }: Props) {
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <View>
                <Text> {`Location: ${getPermStatus('location', perms)}`}</Text>
            </View>
            <View>
                <Text> {`backgroundLocation: ${getPermStatus('backgroundLocation', perms)}`}</Text>
            </View>
            <View>
                <Text> {`notification: ${getPermStatus('notification', perms)}`}</Text>
            </View>
            <Pressable
                onPress={() => {
                    onRequest?.();
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Request permissions</Text>
            </Pressable>
            <Pressable
                onPress={() => {
                    onReload?.();
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Reload permissions</Text>
            </Pressable>
            <Pressable
                onPress={() => {
                    onConfirm();
                }}
                style={styles.button}
            >
                <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
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
    separator: {
        marginVertical: 8,
        // borderBottomColor: '#737373',
        // borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
