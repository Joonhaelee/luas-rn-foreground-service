import NativeForegroundService from './NativeRNForegroundService';
import type { RNNotificationChannel } from './types';

export const androidNotificationChannelHelper = {
    getChannels: (channelId?: string) => NativeForegroundService.getNotificationChannels(channelId),
    createChannel: async (channel: RNNotificationChannel) => {
        return await NativeForegroundService.createNotificationChannel(channel);
    },
    createChannels: async (channels: RNNotificationChannel[]) => {
        for await (const ch of channels) {
            await NativeForegroundService.createNotificationChannel(ch);
        }
    },
    deleteChannel: async (channelId: string) => {
        await NativeForegroundService.deleteNotificationChannel(channelId);
    },
    deleteChannels: async (channelIds: string[]) => {
        for await (const id of channelIds) {
            await NativeForegroundService.deleteNotificationChannel(id);
        }
    },
    isChannelExist: async (channelId: string) => {
        return await NativeForegroundService.notificationChannelExist(channelId);
    },
    isChannelsExist: async (channelIds: string[]) => {
        const rts: boolean[] = [];
        for await (const id of channelIds) {
            const rt = await NativeForegroundService.notificationChannelExist(id);
            rts.push(rt);
        }
        return rts;
    },
};
