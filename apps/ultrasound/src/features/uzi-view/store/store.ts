import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { uziApi } from "../service/uzi";
import { nodesSegmentsApi } from "../service/nodesSegments";
import { echoApi } from "../service/echo";
import { patientApi } from "../service/patient";

import uziSlice from "./uziSlice";
import refSlice from "./refSlice";
import authSlice from "./authSlice";
import utilsSlice from "./utilsSlice";

export const store = configureStore({
    reducer: {
        uzi: uziSlice.reducer,
        ref: refSlice.reducer,
        auth: authSlice.reducer,
        utils: utilsSlice.reducer,
        [uziApi.reducerPath]: uziApi.reducer,
        [nodesSegmentsApi.reducerPath]: nodesSegmentsApi.reducer,
        [echoApi.reducerPath]: echoApi.reducer,
        [patientApi.reducerPath]: patientApi.reducer,
    },

    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(uziApi.middleware)
            .concat(nodesSegmentsApi.middleware)
            .concat(echoApi.middleware)
            .concat(patientApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
