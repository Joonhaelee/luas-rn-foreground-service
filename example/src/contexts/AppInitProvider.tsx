import React, { createContext } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppRunStateStore } from '../store/useAppRunStateStore';
import type { TAppStartStep } from '../store/useAppRunStateStore';
import type { PermissionStatus } from 'react-native-permissions';
import { queryPermAll, requestPermAll } from '../permission';
import { Permissions } from '../components/Permissions';

const TAG = 'app.init';

interface IAppInitContextValue {
    permissions: Record<string, PermissionStatus>;
}
export const AppInitContext = createContext<IAppInitContextValue>({
    permissions: {},
});

/** if app swiped out by user while service is running,\
 *  state values does NOT reset. it seems that foreground service associated with js bundle.\
 *  So, we have to detect **COLD** start.
 **/

export function AppInitProvider({ children }: React.PropsWithChildren<any>) {
    const [appStartStep, setAppStartStep] = useAppRunStateStore(
        useShallow((state) => [state.appStartStep, state.setAppStartStep])
    );
    const appStartStepRef = React.useRef<TAppStartStep | undefined>(undefined);
    React.useEffect(() => {
        appStartStepRef.current = appStartStep;
    }, [appStartStep]);

    const [permissions, setPermissions] = React.useState<Record<string, PermissionStatus>>({});
    const [permissionsLoaded, setPermissionsLoaded] = React.useState<boolean>(false);

    const refreshPermissions = React.useCallback(async () => {
        setPermissions(await queryPermAll());
        setPermissionsLoaded(true);
    }, []);

    React.useEffect(() => {
        setAppStartStep(undefined);
        console.log(TAG, '>>>>> AppInitProvider mounted');
        return () => {
            console.log(TAG, '>>>>> AppInitProvider unmounted');
        };
    }, [setAppStartStep]);

    React.useEffect(() => {
        /* init: load permissions */
        if (!appStartStep) {
            console.log(TAG, '>>>>> starting init process. appStartStep is undefined');
            setAppStartStep('query.permissions');
            refreshPermissions();
            return;
        }
        /* checking permissions */
        if (appStartStep === 'query.permissions') {
            if (permissionsLoaded) {
                setAppStartStep('confirm.permission');
            }
            return;
        }
    }, [appStartStep, permissionsLoaded, refreshPermissions, setAppStartStep]);

    if (appStartStep !== 'run') {
        return (
            <Permissions
                loading={appStartStep !== 'confirm.permission'}
                perms={permissions}
                onConfirm={() => {
                    setAppStartStep('run');
                }}
                onRequest={async () => {
                    await requestPermAll();
                    setPermissions(await requestPermAll());
                }}
                onReload={async () => {
                    setPermissions(await requestPermAll());
                }}
            />
        );
    }
    return <AppInitContext.Provider value={{ permissions }}>{children}</AppInitContext.Provider>;
}
