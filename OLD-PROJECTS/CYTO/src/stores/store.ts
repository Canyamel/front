import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { errorHandlerRedux, loadingHandlerRedux } from "../middlewares";
import { baseApi } from "../service/baseApi";

import authSlice from "./authSlice";
import utilsSlice from "./utilsSlice";

import uploadPhotoSlice from "./uploadPhotoSlice";
import uploadPhotoFormModalSlice from "./uploadPhotoFormModalSlice";
import methodsPatientModalSlice from "./methodsPatientModalSlice";
import editMedWorkerModalSlice from "./editMedWorkerModalSlice";
import historySlice from "./historySlice";
import characteristicsSlice from "./characteristicsSlice";
import correctionModalSlice from "./correctionModalSlice";

export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        utils: utilsSlice.reducer,
        history: historySlice.reducer,
        characteristics: characteristicsSlice.reducer,
        uploadPhoto: uploadPhotoSlice.reducer,
        uploadPhotoForm: uploadPhotoFormModalSlice.reducer,
        methodPatientCard: methodsPatientModalSlice.reducer,
        editDoctor: editMedWorkerModalSlice.reducer,
        correction: correctionModalSlice.reducer,
        [baseApi.reducerPath]: baseApi.reducer
    },

    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(baseApi.middleware)
            .concat(loadingHandlerRedux)
            .concat(errorHandlerRedux),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;