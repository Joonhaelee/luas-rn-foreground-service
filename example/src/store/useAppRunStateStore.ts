import { create } from 'zustand';

export type TAppStartStep = 'query.permissions' | 'confirm.permission' | 'run';

export interface TAppRunState {
    appStartStep?: TAppStartStep;
}

export const defaultAppRunState: TAppRunState = {
    appStartStep: undefined,
};

interface TRunStateAction {
    setAppStartStep: (step?: TAppStartStep) => void;
    resetAppStartStep: () => void;
}

export const useAppRunStateStore = create<TAppRunState & TRunStateAction>((set, _get) => ({
    ...defaultAppRunState,
    resetAppStartStep: () => {
        set({ appStartStep: undefined });
    },
    setAppStartStep: (step?: TAppStartStep) => {
        set({ appStartStep: step });
    },
}));
