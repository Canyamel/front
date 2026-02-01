import { isRejectedWithValue, isFulfilled, isPending } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";

import { addLoading, deleteLoading } from "../stores/utilsSlice";

export type LoadingHandlerArgs = {
    addLoading: (key: string) => void;
    removeLoading: (key: string) => void;
};

function getLoadingKey(action: unknown): string | null {
    const a = action as { meta?: { requestId?: string } };
    return a.meta?.requestId ?? null;
}

/** Middleware с колбэками (для страницы cytology с контекстом). */
export const createLoadingHandler =
    (loadingMethods: LoadingHandlerArgs): Middleware =>
    () =>
    (next) =>
    (action) => {
        const key = getLoadingKey(action);
        if (key) {
            if (isPending(action)) {
                loadingMethods.addLoading(key);
            } else if (isFulfilled(action) || isRejectedWithValue(action)) {
                loadingMethods.removeLoading(key);
            }
        }
        return next(action);
    };

/** Middleware: пишет загрузку в Redux utilsSlice (по meta.requestId). */
export const loadingHandlerRedux: Middleware =
    ({ dispatch }) =>
    (next) =>
    (action) => {
        const key = getLoadingKey(action);
        if (key) {
            if (isPending(action)) {
                dispatch(addLoading(key));
            } else if (isFulfilled(action) || isRejectedWithValue(action)) {
                dispatch(deleteLoading(key));
            }
        }
        return next(action);
    };
