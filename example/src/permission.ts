import {
    check,
    request,
    PERMISSIONS,
    RESULTS,
    requestNotifications,
    checkNotifications,
    requestMultiple,
} from 'react-native-permissions';
import type { PermissionStatus, Rationale } from 'react-native-permissions';
import { Platform } from 'react-native';

/** query permission */
const queryPermLocation = async () => {
    try {
        const fineLocation = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        // const coarseLocation = await check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
        return fineLocation;
    } catch (err) {
        console.warn(err);
    }
    return RESULTS.UNAVAILABLE;
};

const queryPermBackgroundLocation = async () => {
    try {
        return await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
    } catch (err) {
        console.warn(err);
    }
    return RESULTS.UNAVAILABLE;
};

const queryPermNotification = async () => {
    try {
        const notiRes = await checkNotifications();
        return notiRes.status;
    } catch (err) {
        console.warn(err);
    }
    return RESULTS.UNAVAILABLE;
};

const queryPermAll = async () => {
    const res = {
        location: await queryPermLocation(),
        backgroundLocation: await queryPermBackgroundLocation(),
        notification: await queryPermNotification(),
    };
    return res;
};

/** request permission */
const requestPermLocation = async (rationale?: Rationale) => {
    try {
        return await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, rationale);
    } catch (err) {
        console.error(err);
    }
    return RESULTS.UNAVAILABLE;
};

const requestPermBackgroundLocation = async (rationale?: Rationale) => {
    try {
        return await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION, rationale);
    } catch (err) {
        console.error(err);
    }
    return RESULTS.UNAVAILABLE;
};

const requestPermNotification = async (rationale?: Rationale) => {
    try {
        const notiRes = await requestNotifications([], rationale);
        return notiRes.status;
    } catch (err) {
        console.error(err);
    }
    return RESULTS.UNAVAILABLE;
};

const requestPermAll = async () => {
    const newPerms: Record<string, PermissionStatus> = {};
    // location
    if (Number(Platform.Version) < 30) {
        const res = await requestMultiple([
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
            PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
        ]);
        newPerms.location = res[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];
        newPerms.backgroundLocation = res[PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION];
    }
    // location. can not request background location. it will be requested when it being needed.
    // by android policy
    else {
        newPerms.location = await requestPermLocation();
    }
    // notification allowed automatically when API < 33
    if (Number(Platform.Version) >= 33) {
        newPerms.notification = await requestPermNotification();
    }
    return newPerms;
};

export {
    //
    queryPermLocation,
    queryPermBackgroundLocation,
    queryPermNotification,
    queryPermAll,
    //
    requestPermLocation,
    requestPermBackgroundLocation,
    requestPermNotification,
    requestPermAll,
};
