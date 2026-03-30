import React from 'react';
import { RNForegroundServiceManager } from './RNForegroundServiceManager';
import type { RNNotificationChannel } from './types';
export function useRNNotificationChannels() {
    /** get registered notifcation channels */
    const getNotificationChannels = React.useCallback(async (channelId?: string) => {
        return RNForegroundServiceManager.getNotificationChannels(channelId);
    }, []);

    /** create notifcation channel */
    const createNotificationChannel = React.useCallback(async (channel: RNNotificationChannel) => {
        await RNForegroundServiceManager.createNotificationChannel(channel);
    }, []);
    /** create notifcation channels */
    const createNotificationChannels = React.useCallback(
        async (channels: RNNotificationChannel[]) => {
            for await (const ch of channels) {
                await createNotificationChannel(ch);
            }
        },
        [createNotificationChannel]
    );
    /** delete notifcation channel */
    const deleteNotificationChannel = React.useCallback(async (channelId: string) => {
        await RNForegroundServiceManager.deleteNotificationChannel(channelId);
    }, []);
    /** delete notifcation channels */
    const deleteNotificationChannels = React.useCallback(
        async (channelIds: string[]) => {
            for await (const id of channelIds) {
                await deleteNotificationChannel(id);
            }
        },
        [deleteNotificationChannel]
    );
    /** check if notifcation channel registered */
    const notificationChannelExist = React.useCallback(async (channelId: string) => {
        return await RNForegroundServiceManager.notificationChannelExist(channelId);
    }, []);
    /** check if notifcation channels registered */
    const notificationChannelsExist = React.useCallback(async (channelIds: string[]) => {
        const rts: boolean[] = [];
        for await (const id of channelIds) {
            const rt = await RNForegroundServiceManager.notificationChannelExist(id);
            rts.push(rt);
        }
        return rts;
    }, []);

    return {
        getNotificationChannels,
        createNotificationChannel,
        createNotificationChannels,
        deleteNotificationChannel,
        deleteNotificationChannels,
        notificationChannelExist,
        notificationChannelsExist,
    };
}
