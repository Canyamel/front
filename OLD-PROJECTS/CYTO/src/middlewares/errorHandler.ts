import { isRejectedWithValue } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";

import { addError } from "../stores/utilsSlice";

const DEFAULT_MESSAGE = "Что-то пошло не так";

function getErrorMessage(payload: unknown): string {
    if (payload == null) return DEFAULT_MESSAGE;
    const p = payload as Record<string, unknown>;
    if (typeof p?.error === "string") return p.error;
    const data = p?.data as Record<string, unknown> | string | undefined;
    if (data != null) {
        if (typeof data === "string") return data;
        if (typeof (data as Record<string, unknown>)?.detail === "string") return (data as Record<string, unknown>).detail as string;
        if (typeof (data as Record<string, unknown>)?.message === "string") return (data as Record<string, unknown>).message as string;
    }
    return DEFAULT_MESSAGE;
}

export type ErrorHandlerArgs = { setError: (text: string) => void };

/** Middleware с колбэком (для страницы cytology с контекстом). */
export const createErrorHandler =
    (errorMethods: ErrorHandlerArgs): Middleware =>
    () =>
    (next) =>
    (action) => {
        if (isRejectedWithValue(action)) {
            errorMethods.setError(getErrorMessage(action.payload));
        }
        return next(action);
    };

/** Middleware: пишет ошибку в Redux utilsSlice. */
export const errorHandlerRedux: Middleware =
    ({ dispatch }) =>
    (next) =>
    (action) => {
        if (isRejectedWithValue(action)) {
            const message = getErrorMessage(action.payload);
            const key = (action as { meta?: { requestId?: string } }).meta?.requestId ?? "api";
            dispatch(addError({ key, message }));
        }
        return next(action);
    };
